from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db_models import Conversation, Message


async def get_or_create_conversation(
    db: AsyncSession, user_id: str, conversation_id: str | None
) -> Conversation:
    if conversation_id:
        result = await db.execute(
            select(Conversation).where(Conversation.id == conversation_id, Conversation.user_id == user_id)
        )
        conv = result.scalar_one_or_none()
        if conv:
            return conv

    conv = Conversation(user_id=user_id, title="New conversation")
    db.add(conv)
    await db.flush()
    return conv


async def load_history(db: AsyncSession, conversation_id: str, limit: int = 20) -> list[dict]:
    """Return last N messages as role/content dicts for LangGraph state."""
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.desc())
        .limit(limit)
    )
    messages = list(reversed(result.scalars().all()))
    return [{"role": m.role, "content": m.content} for m in messages]


async def save_message(
    db: AsyncSession,
    conversation_id: str,
    role: str,
    content: str,
    citations: list[dict] | None = None,
    agent_trace: list[dict] | None = None,
) -> Message:
    msg = Message(
        conversation_id=conversation_id,
        role=role,
        content=content,
        citations=citations,
        agent_trace=agent_trace,
    )
    db.add(msg)
    await db.flush()
    return msg


async def maybe_set_title(db: AsyncSession, conversation: Conversation, first_user_message: str) -> None:
    if conversation.title == "New conversation":
        conversation.title = (first_user_message[:60] + "...") if len(first_user_message) > 60 else first_user_message
        await db.flush()
