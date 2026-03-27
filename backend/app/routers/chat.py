import uuid

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_db, get_session_id
from app.core.limiter import limiter
from app.schemas.chat import ChatRequest, ChatSSEEvent, Citation
from app.services.cache import cache_service
from app.services.graph import extract_citations, stream_graph
from app.services.embedding import embedding_service
from app.services.retriever import retriever_service

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])


@router.post("")
@limiter.limit(f"{settings.rate_limit_queries_per_hour}/hour")
async def chat(
    request: Request,
    body: ChatRequest,
    session_id: uuid.UUID = Depends(get_session_id),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """Stream an LLM response over Server-Sent Events.

    Each event during streaming: {"token": "...", "citations": null, "done": false}
    Final event: {"token": "", "citations": [...], "done": true}
    """
    doc_ids = body.document_ids

    # Cache check for embedding + retrieval results
    cached = await cache_service.get(body.query, doc_ids)
    if cached:
        chunks = cached["results"]
    else:
        embedding = await embedding_service.embed_text(body.query)
        chunks = await retriever_service.search(
            db=db,
            query_embedding=embedding,
            session_id=session_id,
            document_ids=doc_ids,
            top_k=20,
        )
        await cache_service.set(body.query, doc_ids, embedding, chunks)

    async def event_stream():
        async for token in stream_graph(body.query, chunks):
            event = ChatSSEEvent(token=token)
            yield f"data: {event.model_dump_json()}\n\n"

        raw_citations = extract_citations(chunks)
        citations = [Citation(**c) for c in raw_citations]

        final_event = ChatSSEEvent(citations=citations, done=True)
        yield f"data: {final_event.model_dump_json()}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
