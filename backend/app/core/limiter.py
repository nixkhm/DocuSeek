from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request


def _get_session_key(request: Request) -> str:
    """Rate-limit key: X-Session-ID header, falling back to remote IP."""
    return request.headers.get("X-Session-ID") or get_remote_address(request)


limiter = Limiter(key_func=_get_session_key)
