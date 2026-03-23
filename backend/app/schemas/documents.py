import uuid
from datetime import datetime

from pydantic import BaseModel


class DocumentResponse(BaseModel):
    """Response schema for a document resource."""

    id: uuid.UUID
    filename: str
    page_count: int
    status: str
    chunk_count: int | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
