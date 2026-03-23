import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_session_id
from app.schemas.search import ChunkResult, SearchRequest, SearchResponse
from app.services.cache import cache_service
from app.services.embedding import embedding_service
from app.services.retriever import retriever_service

router = APIRouter(prefix="/api/v1/search", tags=["search"])


@router.post("", response_model=SearchResponse)
async def search_documents(
    body: SearchRequest,
    session_id: uuid.UUID = Depends(get_session_id),
    db: AsyncSession = Depends(get_db),
) -> SearchResponse:
    """Embed a query and return top-k similar chunks. Uses Redis cache to skip
    redundant embedding API calls and pgvector searches on repeated queries."""
    doc_ids = body.document_ids

    # Cache check
    cached = await cache_service.get(body.query, doc_ids)
    if cached:
        return SearchResponse(
            results=[ChunkResult(**c) for c in cached["results"]],
            query_embedding_cached=True,
        )

    # Cache miss — embed and search
    embedding = await embedding_service.embed_text(body.query)
    chunks = await retriever_service.search(
        db=db,
        query_embedding=embedding,
        session_id=session_id,
        document_ids=doc_ids,
        top_k=body.top_k,
    )

    # Write-back to cache
    await cache_service.set(body.query, doc_ids, embedding, chunks)

    return SearchResponse(
        results=[ChunkResult(**c) for c in chunks],
        query_embedding_cached=False,
    )
