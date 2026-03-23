# Import all models so Alembic autogenerate picks them up
from app.models.chunk import Chunk  # noqa: F401
from app.models.document import Document  # noqa: F401
from app.models.session import Session  # noqa: F401
