"""AI classification of a citizen report into category/severity/department, with reasoning.

No custom ML model training — this is a structured-output LLM call (see project scope). If the
LLM call fails or returns something unparseable, falls back to a conservative deterministic
default so report creation never hard-fails on a flaky model call.
"""
import json
import re

from app.agents.llm_factory import get_chat_model
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
Given a citizen's description (and an image URL for context, though you cannot view it directly),
classify the report. Respond with ONLY a JSON object, no other text, in this exact shape:

{{"category": "<one of: pothole, flooding, waste, streetlight, water_leak, road_damage, other>",
  "severity": "<one of: low, medium, high, critical>",
  "confidence": <float 0.0-1.0>,
  "reasoning": "<one short sentence explaining the classification>"}}

Guidance: severity should reflect real-world danger/disruption (e.g. a pothole blocking a lane or
flooding cutting off a road is "high" or "critical"; minor cosmetic issues are "low").
Image URL: {image_url}
"""


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


async def classify_report(description: str | None, image_url: str, hinted_category: str | None = None) -> dict:
    # Capped low: the JSON reply is only ~4 short fields. Groq's free tier
    # enforces a per-minute output-token limit (currently 1000), so keeping
    # this request small avoids "rate_limit_exceeded" (OTPM) errors.
    llm = get_chat_model(temperature=0.0, max_tokens=300)
    system_prompt = CLASSIFICATION_SYSTEM_PROMPT.format(image_url=image_url or "none provided")
    user_content = description or "No description provided by the citizen."
    if hinted_category:
        user_content += f"\n\nCitizen-selected category hint (verify, don't blindly trust): {hinted_category}"

    try:
        response = await llm.ainvoke(
            [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_content}]
        )
        parsed = _parse_llm_json(response.content)
    except Exception as exc:  # noqa: BLE001
        logger.error(f"Report classification LLM call failed: {exc}")
        return _fallback("LLM call failed")

    if not parsed:
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
