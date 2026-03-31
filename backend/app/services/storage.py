from abc import ABC, abstractmethod
from pathlib import Path


class StorageBackend(ABC):
    """Abstract interface for file storage.

    Swap LocalStorageBackend for S3StorageBackend with no other changes.
    """

    @abstractmethod
    async def save(self, file_path: str, data: bytes) -> str:
        """Save data to the given path. Returns the stored path."""

    @abstractmethod
    async def get(self, file_path: str) -> bytes:
        """Retrieve file contents by path."""

    @abstractmethod
    async def delete(self, file_path: str) -> None:
        """Delete a file by path."""


class LocalStorageBackend(StorageBackend):
    """Stores files on the local filesystem (Docker volume at /app/storage)."""

    def __init__(self, base_dir: str = "/app/storage") -> None:
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    async def save(self, file_path: str, data: bytes) -> str:
        """Write bytes to disk, creating parent directories as needed."""
        full_path = self.base_dir / file_path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_bytes(data)
        return str(full_path)

    async def get(self, file_path: str) -> bytes:
        """Read and return file contents."""
        full_path = self.base_dir / file_path
        return full_path.read_bytes()

    async def delete(self, file_path: str) -> None:
        """Delete a file, silently ignoring if it does not exist."""
        full_path = self.base_dir / file_path
        full_path.unlink(missing_ok=True)


storage = LocalStorageBackend()
