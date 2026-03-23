import uuid
from collections.abc import AsyncGenerator

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import async_session_factory


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield a database session."""
    async with async_session_factory() as session:
        yield session


async def get_session_id(request: Request) -> uuid.UUID:
    """Extract the validated session ID set by SessionMiddleware."""
    return uuid.UUID(request.state.session_id)
