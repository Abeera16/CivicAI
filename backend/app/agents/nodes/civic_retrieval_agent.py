"""Gathers Lahore Urban Intelligence context for the AI City Assistant via civic MCP tools."""
import re

from app.agents.state import AgentState
from app.core.logging_config import logger
from app.mcp.client import mcp_client
from app.models.civic_schemas import CATEGORIES, SEVERITIES

UUID_RE = re.compile(r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")


def _detect_category(query: str) -> str | None:
    lowered = query.lower()
    for cat in CATEGORIES:
        if cat.replace("_", " ") in lowered:
            return cat
    return None


def _detect_severity(query: str) -> str | None:
    lowered = query.lower()
    for sev in SEVERITIES:
        if sev in lowered:
            return sev
    return None


async def civic_retrieval_node(state: AgentState) -> dict:
    trace = state.get("agent_trace", [])
    query = state["user_query"]

    civic_results: dict = {}

    try:
        civic_results["hotspots"] = await mcp_client.call("get_hotspots", limit=5)
    except Exception as exc:  # noqa: BLE001
        logger.error(f"get_hotspots failed: {exc}")
        civic_results["hotspots"] = []

    try:
        civic_results["weather"] = await mcp_client.call("get_weather_aqi", area="Lahore")
    except Exception as exc:  # noqa: BLE001
        logger.error(f"get_weather_aqi failed: {exc}")
        civic_results["weather"] = None

    category = _detect_category(query)
    severity = _detect_severity(query)
    if category or severity or "report" in query.lower():
        try:
            civic_results["reports"] = await mcp_client.call(
                "get_civic_reports", category=category, severity=severity
            )
        except Exception as exc:  # noqa: BLE001
            logger.error(f"get_civic_reports failed: {exc}")
            civic_results["reports"] = []

    incident_match = UUID_RE.search(query)
    if incident_match:
        try:
            civic_results["incident"] = await mcp_client.call("get_urban_impact", incident_id=incident_match.group(0))
        except Exception as exc:  # noqa: BLE001
            logger.error(f"get_urban_impact failed: {exc}")
            civic_results["incident"] = None

    trace.append(
        {
            "agent": "civic_retrieval_agent",
            "action": "gather_context",
            "detail": f"tools_used={list(civic_results.keys())}",
        }
    )

    return {"civic_results": civic_results, "agent_trace": trace}
