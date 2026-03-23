import hashlib
import json

import redis.asyncio as aioredis

from app.core.config import settings

CACHE_TTL = 3600  # 1 hour


class CacheService:
    """Redis-backed cache for query embeddings and retrieval results."""

    def __init__(self) -> None:
        self._client: aioredis.Redis = aioredis.from_url(
            settings.redis_url, encoding="utf-8", decode_responses=True
        )

    def _key(self, query: str, document_ids: list) -> str:
        """Stable cache key from query string and document IDs."""
        raw = query + "|" + ",".join(sorted(str(d) for d in document_ids))
        return "search:" + hashlib.sha256(raw.encode()).hexdigest()

    async def get(self, query: str, document_ids: list) -> dict | None:
        """Return cached {embedding, results} or None on miss."""
        value = await self._client.get(self._key(query, document_ids))
        if value is None:
            return None
        return json.loads(value)

    async def set(self, query: str, document_ids: list, embedding: list, results: list) -> None:
        """Cache embedding and results with a 1-hour TTL."""
        payload = json.dumps({"embedding": embedding, "results": results})
        await self._client.setex(self._key(query, document_ids), CACHE_TTL, payload)


cache_service = CacheService()
