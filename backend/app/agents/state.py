from typing import Annotated, Any, TypedDict

from langgraph.graph.message import add_messages


class AgentState(TypedDict, total=False):
    # conversation
    messages: Annotated[list[dict], add_messages]
    conversation_id: str
    user_query: str

    # routing
    category: str  # passport|nadra_cnic|driving_license|tax_filing|scholarship|utility_complaint|legal_aid|health|general
    needs_clarification: bool
    clarification_question: str
    clarification_answer: str | None

    # retrieval
    rag_results: list[dict]
    web_results: list[dict]
    gov_lookup_result: dict | None
    retrieval_confidence: float
    civic_results: dict

    # output
    final_answer: str
    citations: list[dict]
    agent_trace: list[dict]

    # control
    error: str | None
