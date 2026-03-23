import uuid

from pydantic import BaseModel


class ChatRequest(BaseModel):
    """Request body for the chat endpoint."""

    query: str
    document_ids: list[uuid.UUID]


class Citation(BaseModel):
    """A single source citation returned with a chat response."""

    document_name: str
    page_number: int
    chunk_text_snippet: str
    relevance_score: float


class ChatSSEEvent(BaseModel):
    """A single Server-Sent Event from the chat stream.

    During streaming: token is set, citations is None, done is False.
    Final event: token is empty, citations is populated, done is True.
    """

    token: str = ""
    citations: list[Citation] | None = None
    done: bool = False
