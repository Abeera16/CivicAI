"""AI classification of a citizen report into category/severity/department, with reasoning.

No custom ML model training — this is a structured-output LLM call (see project scope). If the
LLM call fails or returns something unparseable, falls back to a conservative deterministic
default so report creation never hard-fails on a flaky model call.

Classification is vision-based: the report photo is sent to the model as actual image content
(base64 data URL), not just as a URL string in the prompt text. Earlier versions only described
the image URL in text and told the model "though you cannot view it directly" — meaning the model
was blindly trusting the citizen's self-selected category hint or description, with no way to
verify against the photo. That let clearly-unrelated images get classified as real civic issues
whenever a hint/description pointed that way.
"""
import base64
import json
import re

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.agents.llm_factory import get_chat_model, get_vision_model
from app.core.logging_config import logger
from app.models.civic_schemas import CATEGORIES, DEPARTMENTS, SEVERITIES

DEPARTMENT_BY_CATEGORY = {
    "pothole": "road_maintenance",
    "road_damage": "road_maintenance",
    "flooding": "drainage",
    "waste": "waste_management",
    "streetlight": "municipal_services",
    "water_leak": "water_sanitation",
    "other": "municipal_services",
}

CLASSIFICATION_SYSTEM_PROMPT = """You are an urban-issue classifier for a Lahore civic reporting system.
You will be shown a photo submitted by a citizen, along with their (optional) text description.
Look at the photo carefully — it is your primary evidence. The citizen's description and any
self-selected category are supporting context only and may be wrong, vague, or misleading; do not
assume they are correct just because they were provided.

If the photo does not show a genuine urban/civic issue (e.g. it's unrelated content, a drawing,
a person, an object with no visible infrastructure problem, or the image is unclear/irrelevant),
classify it as "other" with low confidence and say so plainly in your reasoning — do not force it
into a category just because the citizen suggested one.

Respond with ONLY a JSON object, no other text, in this exact shape:

{{"category": "<one of: pothole, flooding, waste, streetlight, water_leak, road_damage, other>",
  "severity": "<one of: low, medium, high, critical>",
  "confidence": <float 0.0-1.0>,
  "reasoning": "<one short sentence explaining what you actually see in the photo and why>"}}

Guidance: severity should reflect real-world danger/disruption visible in the photo (e.g. a
pothole blocking a lane or flooding cutting off a road is "high" or "critical"; minor cosmetic
issues are "low"). If the photo doesn't show a real civic issue at all, severity should be "low"
and confidence should be low too.
"""

TEXT_ONLY_SYSTEM_PROMPT = """You are an urban-issue classifier for a Lahore civic reporting system.
No photo could be loaded for this report, so classify based on the citizen's text description only
(if there is none, you have almost no signal — default to "other" with low confidence rather than
guessing). Respond with ONLY a JSON object, no other text, in this exact shape:

{{"category": "<one of: pothole, flooding, waste, streetlight, water_leak, road_damage, other>",
  "severity": "<one of: low, medium, high, critical>",
  "confidence": <float 0.0-1.0>,
  "reasoning": "<one short sentence explaining the classification>"}}
"""

_IMAGE_FETCH_TIMEOUT_S = 8.0
_EXT_TO_MIME = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
    ".webp": "image/webp", ".heic": "image/heic",
}


async def _fetch_image_bytes(image_url: str) -> tuple[bytes, str] | None:
    """Best-effort fetch of an externally-hosted image URL for vision classification.

    Only useful for absolute http(s) URLs (e.g. an R2 public URL, or a URL the
    citizen pasted directly). Relative local paths like "/media/reports/x.jpg"
    aren't reachable from here and won't be fetched — callers that already
    have the raw bytes (e.g. straight from the upload) should pass those in
    directly instead of relying on this.
    """
    if not image_url or not image_url.startswith(("http://", "https://")):
        return None
    try:
        async with httpx.AsyncClient(timeout=_IMAGE_FETCH_TIMEOUT_S) as client:
            resp = await client.get(image_url)
            resp.raise_for_status()
            content_type = resp.headers.get("content-type", "").split(";")[0].strip()
            if not content_type.startswith("image/"):
                content_type = "image/jpeg"
            return resp.content, content_type
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"Could not fetch report image for vision classification: {exc}")
        return None


def _guess_mime(image_url: str) -> str:
    for ext, mime in _EXT_TO_MIME.items():
        if image_url.lower().endswith(ext):
            return mime
    return "image/jpeg"


def _fallback(reason: str) -> dict:
    return {
        "category": "other",
        "severity": "medium",
        "confidence": 0.3,
        "department": "municipal_services",
        "ai_reasoning": f"Fallback classification ({reason}); default medium severity pending manual review.",
    }


def _parse_llm_json(raw: str) -> dict | None:
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return None


# Retry transient failures (timeouts, connection errors, 429 rate limits) up to
# 3 times with exponential backoff before giving up and falling back. Groq's
# free tier is rate-limited per minute, so a short backoff often succeeds on
# the 2nd/3rd try instead of immediately punting to the generic "other/medium"
# fallback.
@retry(
    reraise=True,
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    retry=retry_if_exception_type(Exception),
)
async def _call_llm(llm, messages: list[dict]):
    return await llm.ainvoke(messages)


async def classify_report(
    description: str | None,
    image_url: str,
    hinted_category: str | None = None,
    image_bytes: bytes | None = None,
    image_mime: str | None = None,
) -> dict:
    """Classify a report using the actual photo when available.

    image_bytes/image_mime: pass these straight from the upload (see
    routes/civic.py) whenever possible — it's the most reliable path, since it
    doesn't depend on the image being at a publicly fetchable URL. If not
    provided, this falls back to fetching image_url itself (only works for
    absolute http(s) URLs), and if that also fails, falls back further to a
    text-only classification using only the description/hint.
    """
    if not image_bytes and image_url:
        fetched = await _fetch_image_bytes(image_url)
        if fetched:
            image_bytes, image_mime = fetched

    hint_note = f"\n\nCitizen-selected category: {hinted_category}" if hinted_category else ""
    description_note = f"Citizen's description: {description}" if description else "No description provided by the citizen."

    if image_bytes:
        mime = image_mime or _guess_mime(image_url or "")
        b64 = base64.b64encode(image_bytes).decode("ascii")
        messages = [
            {"role": "system", "content": CLASSIFICATION_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": description_note + hint_note},
                    {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
                ],
            },
        ]
        model_getter = get_vision_model
    else:
        # No usable image at all — text-only, and honest about it in the prompt
        # rather than pretending the model looked at a photo it never got.
        logger.warning("No image bytes available for classification; falling back to text-only.")
        messages = [
            {"role": "system", "content": TEXT_ONLY_SYSTEM_PROMPT},
            {"role": "user", "content": description_note + hint_note},
        ]
        model_getter = get_chat_model

    try:
        # Capped low: the JSON reply is only ~4 short fields. Groq's free tier
        # enforces a per-minute output-token limit (currently 1000), so keeping
        # this request small avoids "rate_limit_exceeded" (OTPM) errors.
        llm = model_getter(temperature=0.0, max_tokens=300)
        response = await _call_llm(llm, messages)
        parsed = _parse_llm_json(response.content)
    except Exception as exc:  # noqa: BLE001
        # Surface the real exception type/message (truncated) both in the logs
        # AND in ai_reasoning, so the failure mode is visible directly in the
        # Incident Detail screen without having to dig through Render logs.
        detail = f"{type(exc).__name__}: {str(exc)[:180]}"
        logger.error(f"Report classification LLM call failed after retries: {detail}")
        return _fallback(detail)

    if not parsed:
        logger.warning(f"Report classification returned unparseable JSON: {response.content[:200]!r}")
        return _fallback("unparseable LLM response")

    category = str(parsed.get("category", "other")).lower().strip()
    severity = str(parsed.get("severity", "medium")).lower().strip()
    if category not in CATEGORIES:
        category = "other"
    if severity not in SEVERITIES:
        severity = "medium"

    try:
        confidence = float(parsed.get("confidence", 0.5))
    except (TypeError, ValueError):
        confidence = 0.5
    confidence = max(0.0, min(1.0, confidence))

    department = DEPARTMENT_BY_CATEGORY.get(category, "municipal_services")
    if department not in DEPARTMENTS:
        department = "municipal_services"

    reasoning = str(parsed.get("reasoning", "")).strip() or f"Classified as {category}, {severity} severity."

    return {
        "category": category,
        "severity": severity,
        "confidence": confidence,
        "department": department,
        "ai_reasoning": reasoning,
    }
