import uuid

from pgvector.sqlalchemy import Vector
from sqlalchemy import cast, select
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
        """Return top-k chunks ranked by cosine similarity to the query embedding.

        Args:
            db: Async database session.
            query_embedding: Vector to search against.
            session_id: Scopes search to the current session only.
            document_ids: Optional list of document IDs to filter by.
            top_k: Number of results to return.

        Returns:
            List of dicts with chunk_text, page_number, document_name,
            similarity_score, and chunk_index — ordered by relevance.
        """
        query_vector = cast(query_embedding, Vector(1536))

        stmt = (
            select(
                Chunk.chunk_text,
                Chunk.page_number,
                Chunk.chunk_index,
                Document.filename.label("document_name"),
                (1 - Chunk.embedding.cosine_distance(query_vector)).label("similarity_score"),
            )
            .join(Document, Chunk.document_id == Document.id)
            .where(Chunk.session_id == session_id)
            .where(Chunk.embedding.is_not(None))
        )

        if document_ids:
            stmt = stmt.where(Chunk.document_id.in_(document_ids))

        stmt = stmt.order_by(Chunk.embedding.cosine_distance(query_vector)).limit(top_k)

        result = await db.execute(stmt)
        rows = result.mappings().all()

        return [
            {
                "chunk_text": row["chunk_text"],
                "page_number": row["page_number"],
                "chunk_index": row["chunk_index"],
                "document_name": row["document_name"],
                "similarity_score": float(row["similarity_score"]),
            }
            for row in rows
        ]


retriever_service = RetrieverService()
