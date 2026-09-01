from app.agents.state import AgentState


async def supervisor_node(state: AgentState) -> dict:
    """Entry node: normalizes state and records the start of the run in the agent trace."""
    trace = state.get("agent_trace", [])
    trace.append({"agent": "supervisor", "action": "start", "detail": "workflow initiated"})
    return {
        "user_query": state["user_query"],
        "agent_trace": trace,
        "citations": [],
        "rag_results": [],
        "web_results": [],
    }


def route_after_clarification(state: AgentState) -> str:
    if state.get("needs_clarification") and not state.get("clarification_answer"):
        return "end_for_clarification"
    return "retrieval_agent"
