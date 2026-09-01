import os

from app.core.config import settings


def configure_langsmith() -> None:
    """Wire up LangSmith tracing via environment variables consumed by LangChain."""
    if settings.langchain_tracing_v2 and settings.langchain_api_key:
        os.environ["LANGCHAIN_TRACING_V2"] = "true"
        os.environ["LANGCHAIN_API_KEY"] = settings.langchain_api_key
        os.environ["LANGCHAIN_PROJECT"] = settings.langchain_project
        os.environ["LANGCHAIN_ENDPOINT"] = settings.langchain_endpoint
    else:
        os.environ["LANGCHAIN_TRACING_V2"] = "false"
