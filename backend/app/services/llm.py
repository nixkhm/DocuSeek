from langchain_anthropic import ChatAnthropic
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_openai import ChatOpenAI

from app.core.config import settings


def get_llm() -> BaseChatModel:
    """Return the configured LLM instance based on LLM_PROVIDER env var.

    Supports 'openai' and 'anthropic'. No other service imports LangChain
    LLM classes directly — all go through this function.
    """
    if settings.llm_provider == "anthropic":
        return ChatAnthropic(
            model=settings.llm_model,
            api_key=settings.anthropic_api_key,
            streaming=True,
        )

    return ChatOpenAI(
        model=settings.llm_model,
        api_key=settings.openai_api_key,
        streaming=True,
    )
