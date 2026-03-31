<p align="center">
  <img src="frontend/public/logo.png" alt="DocuSeek" width="300" />
</p>

### RAG (Retrieval-Augmented Generation) Document Chat Tool

Upload PDFs and ask questions. DocuSeek extracts, chunks, and embeds your documents into a vector store, then answers questions grounded in the actual content — with streaming responses and source citations.

**Features**

- Anonymous sessions — no login required
- Upload PDFs and chat with them instantly
- Semantic search across all uploaded documents
- Streaming AI responses via SSE
- Source citations with in-app PDF viewer

**PDF Pipeline**

Upload → text extraction (PyMuPDF + pdfplumber fallback) → page-aware chunking → OpenAI embeddings → pgvector storage → LangGraph StateGraph at query time

**Stack**

Backend: Python · FastAPI · LangGraph · PostgreSQL + pgvector · Redis · Alembic · OpenAI / Anthropic

Frontend: React · TypeScript · Tailwind CSS

Deployment: Docker Compose · Railway

