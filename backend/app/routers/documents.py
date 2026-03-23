import uuid

import fitz
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_db, get_session_id
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
