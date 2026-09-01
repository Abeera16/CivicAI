from app.agents.llm_factory import get_chat_model
from app.agents.state import AgentState
from app.core.logging_config import logger
from app.models.schemas import Citation

CIVIC_SYSTEM_PROMPT = """You are the CivicAI Lahore Urban Intelligence Assistant. Answer the citizen's or \
city official's question using ONLY the data below, drawn live from the urban incident database, \
hotspot clustering, and weather/AQI feed. Be concise and concrete — cite specific incident counts, \
impact scores, or hotspot names where relevant. If the data doesn't cover the question, say so plainly \
rather than guessing.

DATA:
{context}
"""


def _format_context(civic_results: dict) -> str:
    parts = []

    hotspots = civic_results.get("hotspots") or []
    if hotspots:
        lines = [f"- {h['label']} at ({h['lat']}, {h['lng']}), avg impact {h['avg_impact_score']}" for h in hotspots]
        parts.append("Top hotspots:\n" + "\n".join(lines))

    weather = civic_results.get("weather")
    if weather and "error" not in weather:
        parts.append(
            f"Current Lahore weather/AQI: {weather.get('temperature_c')}°C, "
            f"AQI {weather.get('aqi')}, rainfall {weather.get('rainfall_mm')}mm (recorded {weather.get('recorded_at')})"
        )

    reports = civic_results.get("reports") or []
    if reports:
        lines = [f"- [{r['id']}] {r['category']}/{r['severity']} at ({r['lat']}, {r['lng']}), status={r['status']}"
                  for r in reports[:10]]
        parts.append(f"Matching civic reports ({len(reports)} total, showing up to 10):\n" + "\n".join(lines))

    incident = civic_results.get("incident")
    if incident and "error" not in incident:
        parts.append(
            f"Incident {incident['id']}: {incident['category']}, impact score {incident['impact_score']} "
            f"— {incident['impact_explanation']}"
        )

    return "\n\n".join(parts) if parts else "No urban intelligence data was retrieved for this query."


def _build_citations(civic_results: dict) -> list[Citation]:
    citations: list[Citation] = []
    for h in (civic_results.get("hotspots") or [])[:3]:
        citations.append(
            Citation(title=h["label"], url="", snippet=f"avg impact {h['avg_impact_score']}, "
                     f"{h['incident_count']} incidents", source_type="urban_hotspot")
        )
    for r in (civic_results.get("reports") or [])[:3]:
        citations.append(
            Citation(title=f"Report {r['id']} ({r['category']})", url="",
                      snippet=f"{r['severity']} severity, status={r['status']}", source_type="civic_report")
        )
    incident = civic_results.get("incident")
    if incident and "error" not in incident:
        citations.append(
            Citation(title=f"Incident {incident['id']}", url="", snippet=incident["impact_explanation"],
                      source_type="urban_incident")
        )
    return citations


async def civic_citation_node(state: AgentState) -> dict:
    trace = state.get("agent_trace", [])
    civic_results = state.get("civic_results", {}) or {}
    context = _format_context(civic_results)

    llm = get_chat_model(temperature=0.2)
    system_prompt = CIVIC_SYSTEM_PROMPT.format(context=context)
    history = state.get("messages", [])[-6:]
    messages = [{"role": "system", "content": system_prompt}, *history,
                {"role": "user", "content": state["user_query"]}]

    try:
        response = await llm.ainvoke(messages)
        answer = response.content.strip()
    except Exception as exc:  # noqa: BLE001
        logger.error(f"Civic synthesis LLM call failed: {exc}")
        answer = "I ran into an error generating a response. Please try again shortly."

    citations = _build_citations(civic_results)
    trace.append({"agent": "civic_citation_agent", "action": "synthesize", "detail": f"citations={len(citations)}"})

    return {
        "final_answer": answer,
        "citations": [c.model_dump() for c in citations],
        "agent_trace": trace,
    }
