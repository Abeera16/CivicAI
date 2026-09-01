"""AI City Assistant — Lahore Urban Intelligence chat mode. Separate endpoint from the existing
/chat gov-services assistant (which is left unchanged); reuses the same auth/history patterns."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.civic_graph import run_civic_graph
from app.auth.jwt_handler import get_current_user
from app.core.database import get_db
from app.core.logging_config import logger
from app.memory.conversation_memory import get_or_create_conversation, load_history, maybe_set_title, save_message
from app.models.civic_schemas import AssistantChatRequest, AssistantChatResponse
from app.models.db_models import User

router = APIRouter(prefix="/assistant", tags=["assistant"])


@router.post("/chat", response_model=AssistantChatResponse)
async def assistant_chat(
    payload: AssistantChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conversation = await get_or_create_conversation(db, current_user.id, payload.conversation_id)
    await maybe_set_title(db, conversation, payload.message)
    history = await load_history(db, conversation.id)
    await save_message(db, conversation.id, "user", payload.message)

    try:
        result = await run_civic_graph(
            user_query=payload.message, history=history, conversation_id=conversation.id
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("Civic assistant graph execution failed")
        await db.commit()
        raise HTTPException(status_code=500, detail="Assistant workflow failed. Please try again.") from exc

    answer = result.get("final_answer", "I could not generate an answer.")
    citations = result.get("citations", [])

    await save_message(db, conversation.id, "assistant", answer, citations=citations,
                        agent_trace=result.get("agent_trace", []))
    await db.commit()

    return AssistantChatResponse(
        conversation_id=conversation.id, answer=answer, citations=citations,
        agent_trace=result.get("agent_trace", []),
    )
