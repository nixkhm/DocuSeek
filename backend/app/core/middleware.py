import uuid
from datetime import datetime, timezone

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from sqlalchemy import select, update

from app.db import async_session_factory
from app.models.session import Session


class SessionMiddleware:
    """Manages anonymous session lifecycle on every request.

    - Missing X-Session-ID: creates a new session, returns ID in response header.
    - Invalid/expired X-Session-ID: returns 401.
    - Valid X-Session-ID: updates last_active_at and proceeds.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope, receive)
        session_id_header = request.headers.get("X-Session-ID")

        async with async_session_factory() as db:
            if not session_id_header:
                # No session ID — create a new session
                new_session = Session(id=uuid.uuid4())
                db.add(new_session)
                await db.commit()
                session_id = str(new_session.id)
            else:
                # Validate existing session ID
                try:
                    parsed_id = uuid.UUID(session_id_header)
                except ValueError:
                    await self._send_401(send)
                    return

                result = await db.execute(
                    select(Session).where(Session.id == parsed_id)
                )
                session = result.scalar_one_or_none()

                if session is None:
                    await self._send_401(send)
                    return

                # Update last_active_at to reset the 7-day TTL
                await db.execute(
                    update(Session)
                    .where(Session.id == parsed_id)
                    .values(last_active_at=datetime.now(timezone.utc))
                )
                await db.commit()
                session_id = str(parsed_id)

        # Attach session_id to request state for use in route handlers
        scope["state"] = scope.get("state", {})
        request.state.session_id = session_id

        # Intercept the response to inject X-Session-ID header
        async def send_with_session_header(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.append(
                    (b"x-session-id", session_id.encode())
                )
                message = {**message, "headers": headers}
            await send(message)

        await self.app(scope, receive, send_with_session_header)

    async def _send_401(self, send):
        """Send a 401 response for invalid or expired sessions."""
        response = JSONResponse(
            status_code=401,
            content={
                "detail": "Session expired or invalid. A new session will be created on your next request.",
                "error_code": "SESSION_INVALID",
            },
        )
        await response({"type": "http"}, None, send)
