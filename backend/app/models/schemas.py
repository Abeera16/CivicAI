from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, EmailStr, Field


# ---------- Auth ----------
class UserCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    full_name: str
    email: EmailStr
    role: str
    is_active: bool

    class Config:
        from_attributes = True


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


# ---------- Chat ----------
class ChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    message: str = Field(min_length=1, max_length=4000)
    clarification_answer: Optional[str] = None


class Citation(BaseModel):
    title: str
    url: str
    snippet: str
    source_type: str  # "gov_rag" | "web_search"


class AgentStep(BaseModel):
    agent: str
    action: str
    detail: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ChatResponse(BaseModel):
    conversation_id: str
    message_id: str
    answer: str
    requires_clarification: bool = False
    clarification_question: Optional[str] = None
    citations: list[Citation] = []
    agent_trace: list[AgentStep] = []


class MessageOut(BaseModel):
    id: str
    role: str
    content: str
    citations: Optional[list[dict[str, Any]]] = None
    agent_trace: Optional[list[dict[str, Any]]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationOut(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ConversationDetail(ConversationOut):
    messages: list[MessageOut] = []
