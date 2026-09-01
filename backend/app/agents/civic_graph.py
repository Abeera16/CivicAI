"""Separate LangGraph pipeline for the AI City Assistant (Lahore Urban Intelligence mode).

Kept independent from the existing government-services graph (app/agents/graph.py) so that
graph is left unchanged; this mirrors its supervisor -> retrieval -> citation shape.
"""
from functools import lru_cache

from langgraph.graph import END, StateGraph

from app.agents.nodes.civic_citation_agent import civic_citation_node
from app.agents.nodes.civic_retrieval_agent import civic_retrieval_node
from app.agents.nodes.supervisor import supervisor_node
from app.agents.state import AgentState


@lru_cache
def build_civic_graph():
    graph = StateGraph(AgentState)

    graph.add_node("supervisor", supervisor_node)
    graph.add_node("civic_retrieval_agent", civic_retrieval_node)
    graph.add_node("civic_citation_agent", civic_citation_node)

    graph.set_entry_point("supervisor")
    graph.add_edge("supervisor", "civic_retrieval_agent")
    graph.add_edge("civic_retrieval_agent", "civic_citation_agent")
    graph.add_edge("civic_citation_agent", END)

    return graph.compile()


async def run_civic_graph(user_query: str, history: list[dict], conversation_id: str | None) -> dict:
    app = build_civic_graph()
    initial_state: AgentState = {
        "messages": history,
        "conversation_id": conversation_id or "",
        "user_query": user_query,
        "agent_trace": [],
    }
    return await app.ainvoke(initial_state)
