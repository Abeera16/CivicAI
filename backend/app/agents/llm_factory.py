"""
Central factory for chat models used by every agent node.

Supports two providers, selected via settings.llm_provider:
  - "groq"   (default): free-tier friendly, uses langchain_groq.ChatGroq
  - "openai": uses langchain_openai.ChatOpenAI

This keeps provider-specific wiring in exactly one place, so switching
providers is a one-line config change rather than editing every agent node.
"""
from functools import lru_cache

from langchain_core.language_models.chat_models import BaseChatModel

from app.core.config import settings
from app.core.logging_config import logger


def get_chat_model(temperature: float = 0.0, max_tokens: int | None = None) -> BaseChatModel:
    provider = settings.llm_provider.lower().strip()

    if provider == "groq":
        from langchain_groq import ChatGroq

        if not settings.groq_api_key:
            logger.warning("GROQ_API_KEY is not set — chat calls will fail until it is configured.")
        return ChatGroq(
            model=settings.groq_chat_model,
            api_key=settings.groq_api_key,
            temperature=temperature,
            max_tokens=max_tokens,
            model_kwargs={"reasoning_format": "hidden"},
        )

    if provider == "openai":
        from langchain_openai import ChatOpenAI

        if not settings.openai_api_key:
            logger.warning("OPENAI_API_KEY is not set — chat calls will fail until it is configured.")
        return ChatOpenAI(
            model=settings.openai_chat_model,
            api_key=settings.openai_api_key,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    raise ValueError(f"Unknown LLM_PROVIDER '{provider}'. Use 'groq' or 'openai'.")


def get_vision_model(temperature: float = 0.0, max_tokens: int | None = None) -> BaseChatModel:
    """Like get_chat_model, but returns a model that can actually accept image input.

    groq_chat_model / openai_chat_model (used by get_chat_model) are text-only
    or not guaranteed to support vision — report-photo classification needs a
    model that genuinely looks at the image, so this is deliberately separate.
    """
    provider = settings.llm_provider.lower().strip()

    if provider == "groq":
        from langchain_groq import ChatGroq

        if not settings.groq_api_key:
            logger.warning("GROQ_API_KEY is not set — vision calls will fail until it is configured.")
        return ChatGroq(
            model=settings.groq_vision_model,
            api_key=settings.groq_api_key,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    if provider == "openai":
        from langchain_openai import ChatOpenAI

        if not settings.openai_api_key:
            logger.warning("OPENAI_API_KEY is not set — vision calls will fail until it is configured.")
        # gpt-4o-mini supports vision input natively, no separate model needed.
        return ChatOpenAI(
            model=settings.openai_chat_model,
            api_key=settings.openai_api_key,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    raise ValueError(f"Unknown LLM_PROVIDER '{provider}'. Use 'groq' or 'openai'.")


@lru_cache
def _cached_default_model() -> BaseChatModel:
    """Cached zero-temperature model, reused by nodes that don't need custom temperature."""
    return get_chat_model(temperature=0.0)
