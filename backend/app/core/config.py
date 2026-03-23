from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # LLM
    llm_provider: str = "openai"
    llm_model: str = "gpt-4o-mini"
    openai_api_key: str = ""
    anthropic_api_key: str = ""

    # Embeddings
    embedding_model: str = "text-embedding-3-small"

    # Database
    database_url: str

    # Redis
    redis_url: str = "redis://redis:6379/0"

    # Session & limits
    session_ttl_days: int = 7
    max_docs_per_session: int = 5
    max_pages_per_doc: int = 50
    max_file_size_mb: int = 20
    rate_limit_queries_per_hour: int = 20
    rate_limit_uploads_per_hour: int = 10

    # Seed data
    seed_data_enabled: bool = True

    # Logging
    log_level: str = "INFO"


settings = Settings()
