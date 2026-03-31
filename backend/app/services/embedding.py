from openai import AsyncOpenAI

from app.core.config import settings


class OpenAIEmbeddingService:
    """Embedding service backed by OpenAI text-embedding-3-small (1536 dims)."""

    BATCH_SIZE = 100

    def __init__(self) -> None:
        self._client = AsyncOpenAI(api_key=settings.openai_api_key)
        self._model = settings.embedding_model

    async def embed_text(self, text: str) -> list[float]:
        """Embed a single string."""
        response = await self._client.embeddings.create(
            model=self._model,
            input=text,
        )
        return response.data[0].embedding

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Embed texts in batches of up to 100 per API call."""
        results: list[list[float]] = []
        for i in range(0, len(texts), self.BATCH_SIZE):
            batch = texts[i : i + self.BATCH_SIZE]
            response = await self._client.embeddings.create(
                model=self._model,
                input=batch,
            )
            # API returns embeddings in the same order as input
            results.extend([item.embedding for item in response.data])
        return results


embedding_service = OpenAIEmbeddingService()
