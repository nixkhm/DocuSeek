import uuid

from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    """Request body for the similarity search endpoint."""

    query: str
    top_k: int = Field(default=5, ge=1, le=20)
    document_ids: list[uuid.UUID]


class ChunkResult(BaseModel):
    """A single chunk result from a similarity search."""

    chunk_text: str
    page_number: int
    document_name: str
    similarity_score: float
    chunk_index: int


class SearchResponse(BaseModel):
    """Response from the similarity search endpoint."""

    results: list[ChunkResult]
    query_embedding_cached: bool
