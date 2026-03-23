import uuid

import fitz
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_db, get_session_id
from app.models.chunk import Chunk
from app.models.document import Document
from app.schemas.documents import DocumentResponse
from app.services.pdf_pipeline import process as run_pipeline
from app.services.storage import storage

router = APIRouter(prefix="/api/v1/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentResponse, status_code=201)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    session_id: uuid.UUID = Depends(get_session_id),
    db: AsyncSession = Depends(get_db),
) -> DocumentResponse:
    """Upload and validate a PDF document."""

    # Validate file type
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are accepted.",
        )

    data = await file.read()

    # Validate file size
    max_bytes = settings.max_file_size_mb * 1024 * 1024
    if len(data) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum size of {settings.max_file_size_mb}MB.",
        )

    # Validate page count via PyMuPDF
    try:
        pdf = fitz.open(stream=data, filetype="pdf")
        page_count = len(pdf)
        pdf.close()
    except Exception:
        raise HTTPException(status_code=400, detail="File could not be read as a valid PDF.")

    if page_count > settings.max_pages_per_doc:
        raise HTTPException(
            status_code=400,
            detail=f"PDF exceeds maximum of {settings.max_pages_per_doc} pages.",
        )

    # Validate session document count
    result = await db.execute(
        select(func.count()).select_from(Document).where(Document.session_id == session_id)
    )
    doc_count = result.scalar_one()
    if doc_count >= settings.max_docs_per_session:
        raise HTTPException(
            status_code=400,
            detail=f"Session already has {settings.max_docs_per_session} documents. Delete one to upload more.",
        )

    # Save file to storage
    doc_id = uuid.uuid4()
    file_path = f"{session_id}/{doc_id}.pdf"
    await storage.save(file_path, data)

    # Create document row
    document = Document(
        id=doc_id,
        session_id=session_id,
        filename=file.filename or "upload.pdf",
        page_count=page_count,
        file_path=file_path,
        status="uploading",
    )
    db.add(document)
    await db.commit()
    await db.refresh(document)

    # Kick off the processing pipeline asynchronously
    background_tasks.add_task(run_pipeline, doc_id, file_path, session_id)

    return DocumentResponse(
        id=document.id,
        filename=document.filename,
        page_count=document.page_count,
        status=document.status,
        chunk_count=None,
        created_at=document.created_at,
    )


@router.get("", response_model=list[DocumentResponse])
async def list_documents(
    session_id: uuid.UUID = Depends(get_session_id),
    db: AsyncSession = Depends(get_db),
) -> list[DocumentResponse]:
    """List all documents for the current session."""
    result = await db.execute(
        select(Document).where(Document.session_id == session_id).order_by(Document.created_at)
    )
    documents = result.scalars().all()
    return [
        DocumentResponse(
            id=doc.id,
            filename=doc.filename,
            page_count=doc.page_count,
            status=doc.status,
            chunk_count=None,
            created_at=doc.created_at,
        )
        for doc in documents
    ]


@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(
    doc_id: uuid.UUID,
    session_id: uuid.UUID = Depends(get_session_id),
    db: AsyncSession = Depends(get_db),
) -> DocumentResponse:
    """Get a single document with its chunk count. Used for status polling."""
    result = await db.execute(
        select(Document).where(Document.id == doc_id, Document.session_id == session_id)
    )
    document = result.scalar_one_or_none()
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")

    chunk_count_result = await db.execute(
        select(func.count()).select_from(Chunk).where(Chunk.document_id == doc_id)
    )
    chunk_count = chunk_count_result.scalar_one()

    return DocumentResponse(
        id=document.id,
        filename=document.filename,
        page_count=document.page_count,
        status=document.status,
        chunk_count=chunk_count,
        created_at=document.created_at,
    )


@router.delete("/{doc_id}", status_code=204)
async def delete_document(
    doc_id: uuid.UUID,
    session_id: uuid.UUID = Depends(get_session_id),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a document and all its chunks. Removes the file from storage."""
    result = await db.execute(
        select(Document).where(Document.id == doc_id, Document.session_id == session_id)
    )
    document = result.scalar_one_or_none()
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")

    await storage.delete(document.file_path)
    await db.delete(document)
    await db.commit()
