import uuid

from pgvector.sqlalchemy import Vector
from sqlalchemy import cast, literal, select, union_all
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chunk import Chunk
from app.models.document import Document


class RetrieverService:
    """Standalone pgvector similarity search service.

    Designed as a pluggable component — becomes a LangGraph tool in v2.
    """

    async def search(
        self,
        db: AsyncSession,
        query_embedding: list[float],
        session_id: uuid.UUID,
        document_ids: list[uuid.UUID] | None = None,
        top_k: int = 5,
    ) -> list[dict]:
        """Return top-k chunks ranked by cosine similarity, always prepending
        chunk_index=0 for each document so page-1 metadata (title, authors, etc.)
        is always available to the LLM.

        Args:
            db: Async database session.
            query_embedding: Vector to search against.
            session_id: Scopes search to the current session only.
            document_ids: Optional list of document IDs to filter by.
            top_k: Number of results to return.

        Returns:
            List of dicts with chunk_text, page_number, document_name,
            similarity_score, and chunk_index — header chunks first, then by relevance.
        """
        query_vector = cast(query_embedding, Vector(1536))

        semantic_base = (
            select(
                Chunk.chunk_text,
                Chunk.page_number,
                Chunk.chunk_index,
                Chunk.document_id,
                Document.filename.label("document_name"),
                (1 - Chunk.embedding.cosine_distance(query_vector)).label(
                    "similarity_score"
                ),
            )
            .join(Document, Chunk.document_id == Document.id)
            .where(Chunk.session_id == session_id)
            .where(Chunk.embedding.is_not(None))
        )

        if document_ids:
            semantic_base = semantic_base.where(Chunk.document_id.in_(document_ids))

        # Subquery for top-k semantic results
        semantic_subq = (
            semantic_base.order_by(Chunk.embedding.cosine_distance(query_vector))
            .limit(top_k)
            .subquery("semantic")
        )

        # Header chunks for the same documents — joined in one round trip via UNION ALL
        header_stmt = (
            select(
                Chunk.chunk_text,
                Chunk.page_number,
                Chunk.chunk_index,
                Chunk.document_id,
                Document.filename.label("document_name"),
                literal(1.0).label("similarity_score"),
            )
            .join(Document, Chunk.document_id == Document.id)
            .where(Chunk.session_id == session_id)
            .where(
                Chunk.document_id.in_(select(semantic_subq.c.document_id).distinct())
            )
            .where(Chunk.chunk_index == 0)
        )

        combined = union_all(
            select(
                semantic_subq.c.chunk_text,
                semantic_subq.c.page_number,
                semantic_subq.c.chunk_index,
                semantic_subq.c.document_id,
                semantic_subq.c.document_name,
                semantic_subq.c.similarity_score,
            ),
            header_stmt,
        )
        result = await db.execute(combined)
        rows = result.mappings().all()

        # Build deduped output: headers first (score=1.0 sentinel), then semantic
        header_rows = [r for r in rows if float(r["similarity_score"]) == 1.0]
        semantic_rows = sorted(
            [r for r in rows if float(r["similarity_score"]) != 1.0],
            key=lambda r: r["similarity_score"],
            reverse=True,
        )

        seen_keys: set[tuple] = set()
        chunks: list[dict] = []

        for row in header_rows + semantic_rows:
            key = (row["document_name"], row["page_number"], row["chunk_index"])
            if key not in seen_keys:
                seen_keys.add(key)
                chunks.append(
                    {
                        "chunk_text": row["chunk_text"],
                        "page_number": row["page_number"],
                        "chunk_index": row["chunk_index"],
                        "document_name": row["document_name"],
                        "similarity_score": float(row["similarity_score"]),
                    }
                )

        return chunks


retriever_service = RetrieverService()
