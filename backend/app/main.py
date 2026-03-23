import math
import time
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from sqlalchemy import delete

from app.core.config import settings
from app.core.limiter import limiter
from app.core.middleware import SessionMiddleware
from app.db import async_session_factory
from app.models.session import Session
from app.routers import chat, documents, search

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run startup tasks before serving requests."""
    async with async_session_factory() as db:
        cutoff = datetime.now(timezone.utc) - timedelta(days=settings.session_ttl_days)
        await db.execute(delete(Session).where(Session.last_active_at < cutoff))
        await db.commit()
    yield


app = FastAPI(
    lifespan=lifespan,
    title="DocuSeek",
    description="RAG-based document review agent",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

def _rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Return 429 with Retry-After header when rate limit is exceeded."""
    retry_after = math.ceil(3600 - (time.time() % 3600))
    return JSONResponse(
        status_code=429,
        content={"error": f"Rate limit exceeded: {exc.detail}"},
        headers={"Retry-After": str(retry_after)},
    )


app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Session-ID"],
)


app.add_middleware(SessionMiddleware)

app.include_router(documents.router)
app.include_router(search.router)
app.include_router(chat.router)


@app.get("/api/v1/health")
async def health() -> dict:
    """Health check endpoint used by Docker and Railway."""
    return {"status": "ok"}
