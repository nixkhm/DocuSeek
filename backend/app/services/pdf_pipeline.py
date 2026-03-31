import io
import uuid

import fitz
import pdfplumber
from langchain.text_splitter import RecursiveCharacterTextSplitter
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import async_session_factory
from app.models.chunk import Chunk
from app.models.document import Document, DocumentStatus
from app.services.embedding import embedding_service
from app.services.storage import storage


async def _set_status(db: AsyncSession, doc_id: uuid.UUID, status: str) -> None:
    """Update the document status field."""
    doc = await db.get(Document, doc_id)
    if doc:
        doc.status = status
        await db.commit()


def _extract_text_fitz(data: bytes) -> list[dict]:
    """Extract text per page using PyMuPDF. Returns list of {page_number, text}."""
    pages = []
    pdf = fitz.open(stream=data, filetype="pdf")
    for i, page in enumerate(pdf):
        text = page.get_text()
        pages.append({"page_number": i + 1, "text": text})
    pdf.close()
    return pages


def _extract_text_pdfplumber(data: bytes) -> list[dict]:
    """Fallback extractor using pdfplumber for scanned/empty pages."""
    pages = []
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        for i, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            pages.append({"page_number": i + 1, "text": text})
    return pages


def extract_pages(data: bytes) -> list[dict]:
    """Extract text from all pages, falling back to pdfplumber on empty pages."""
    fitz_pages = _extract_text_fitz(data)
    plumber_pages: list[dict] | None = None
    result = []

    for page in fitz_pages:
        if page["text"].strip():
            result.append(page)
        else:
            if plumber_pages is None:
                plumber_pages = _extract_text_pdfplumber(data)
            idx = page["page_number"] - 1
            fallback = plumber_pages[idx]["text"] if idx < len(plumber_pages) else ""
            result.append({"page_number": page["page_number"], "text": fallback})

    return result


async def extract(db: AsyncSession, doc_id: uuid.UUID, file_path: str) -> list[dict]:
    """Step 1: fetch PDF bytes and extract text per page."""
    await _set_status(db, doc_id, DocumentStatus.EXTRACTING)
    data = await storage.get(file_path)
    return extract_pages(data)


def chunk_pages(pages: list[dict]) -> list[dict]:
    """Split extracted pages into chunks using RecursiveCharacterTextSplitter.

    Returns list of {page_number, chunk_index, text, char_start, char_end}.
    chunk_size=500 tokens approximated via tiktoken, chunk_overlap=50 tokens.
    """
    splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(
        model_name="gpt-4o",
        chunk_size=500,
        chunk_overlap=50,
        separators=["\n\n", "\n", ".", " ", ""],
        add_start_index=True,
    )

    chunks = []
    chunk_index = 0

    for page in pages:
        text = page["text"]
        if not text.strip():
            continue

        docs = splitter.create_documents([text])
        for doc in docs:
            start = doc.metadata.get("start_index", 0)
            chunks.append(
                {
                    "page_number": page["page_number"],
                    "chunk_index": chunk_index,
                    "text": doc.page_content,
                    "char_start": start,
                    "char_end": start + len(doc.page_content),
                }
            )
            chunk_index += 1

    return chunks


async def chunk(
    db: AsyncSession,
    doc_id: uuid.UUID,
    session_id: uuid.UUID,
    pages: list[dict],
) -> None:
    """Step 2: split pages into chunks and persist to the chunks table."""
    await _set_status(db, doc_id, DocumentStatus.CHUNKING)

    chunk_rows = [
        Chunk(
            session_id=session_id,
            document_id=doc_id,
            chunk_text=c["text"],
            embedding=None,
            page_number=c["page_number"],
            chunk_index=c["chunk_index"],
            char_start=c["char_start"],
            char_end=c["char_end"],
        )
        for c in chunk_pages(pages)
    ]

    db.add_all(chunk_rows)
    await db.commit()


async def embed(db: AsyncSession, doc_id: uuid.UUID) -> None:
    """Step 3: embed all chunks for a document and store vectors in pgvector."""
    await _set_status(db, doc_id, DocumentStatus.EMBEDDING)

    result = await db.execute(select(Chunk).where(Chunk.document_id == doc_id))
    chunks = result.scalars().all()

    if not chunks:
        return

    vectors = await embedding_service.embed_batch([c.chunk_text for c in chunks])

    for chunk, vector in zip(chunks, vectors):
        chunk.embedding = vector

    await db.commit()


async def process(doc_id: uuid.UUID, file_path: str, session_id: uuid.UUID) -> None:
    """Run the full PDF processing pipeline: extract → chunk → embed → ready."""
    async with async_session_factory() as db:
        try:
            # Step 1: extract text from PDF
            pages = await extract(db, doc_id, file_path)
            # Step 2: split into chunks and persist
            await chunk(db, doc_id, session_id, pages)
            # Step 3: generate and store embeddings
            await embed(db, doc_id)

            await _set_status(db, doc_id, DocumentStatus.READY)

        except Exception:
            async with async_session_factory() as err_db:
                await _set_status(err_db, doc_id, DocumentStatus.ERROR)
            raise
