from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    log_level: str = "INFO"

    # Postgres
    database_url: str = "postgresql+asyncpg://civicai:civicai_pass@localhost:5432/civicai"

    # LLM provider selection: "groq" (default, free-tier friendly) or "openai"
    llm_provider: str = "groq"

    # Groq
    groq_api_key: str = ""
    groq_chat_model: str = "llama-3.3-70b-versatile"

    # OpenAI (optional — only used if llm_provider="openai")
    openai_api_key: str = ""
    openai_chat_model: str = "gpt-4o-mini"

    # LangSmith (optional tracing)
    langchain_tracing_v2: bool = False
    langchain_api_key: str = ""
    langchain_project: str = "civicai"
    langchain_endpoint: str = "https://api.smith.langchain.com"

    # JWT
    jwt_secret_key: str = "insecure-dev-secret"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7

    # Overpass / OSM
    overpass_api_url: str = "https://overpass-api.de/api/interpreter"
    lahore_bbox: str = "31.42,74.20,31.62,74.45"  # south,west,north,east

    # Weather / AQI (OpenWeatherMap or IQAir)
    weather_provider: str = "openweathermap"  # "openweathermap" | "iqair"
    openweathermap_api_key: str = ""
    iqair_api_key: str = ""
    weather_cache_ttl_minutes: int = 15
    lahore_lat: float = 31.5204
    lahore_lng: float = 74.3587


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
