import re

from langchain_core.output_parsers import StrOutputParser

from app.services.llm import get_llm
from app.services.prompts import CHAT_PROMPT, format_context


def build_chain():
    """Build the RetrievalQA LCEL chain: prompt | llm | parser.

    Retrieval is handled upstream by RetrieverService — chunks are passed
    in as pre-formatted context. This keeps RetrieverService fully standalone
    and ready for LangGraph tool conversion in v2.
    """
    llm = get_llm()
    return CHAT_PROMPT | llm | StrOutputParser()


def extract_citations(answer: str, chunks: list[dict]) -> list[dict]:
    """Build structured citations by matching inline [doc, p.N] references in
    the answer back to the retrieved chunks.

    Returns list of {document_name, page_number, chunk_text_snippet, relevance_score}.
    """
    # Match patterns like [filename.pdf, p.3] or [filename.pdf, p.12]
    pattern = re.compile(r"\[([^\],]+),\s*p\.(\d+)\]")
    matches = pattern.findall(answer)

    seen = set()
    citations = []

    for doc_name, page_str in matches:
        page_number = int(page_str)
        key = (doc_name.strip(), page_number)
        if key in seen:
            continue
        seen.add(key)

        # Find the matching chunk to pull snippet and relevance score
        matched_chunk = next(
            (
                c for c in chunks
                if c["document_name"] == doc_name.strip()
                and c["page_number"] == page_number
            ),
            None,
        )

        citations.append({
            "document_name": doc_name.strip(),
            "page_number": page_number,
            "chunk_text_snippet": matched_chunk["chunk_text"][:200] if matched_chunk else "",
            "relevance_score": matched_chunk["similarity_score"] if matched_chunk else 0.0,
        })

    return citations


async def run_chain(query: str, chunks: list[dict]) -> tuple[str, list[dict]]:
    """Run the chain. Returns (answer, citations)."""
    chain = build_chain()
    context = format_context(chunks)
    answer = await chain.ainvoke({"question": query, "context": context})
    citations = extract_citations(answer, chunks)
    return answer, citations


async def stream_chain(query: str, chunks: list[dict]):
    """Stream the chain response token by token. Yields string tokens."""
    chain = build_chain()
    context = format_context(chunks)
    async for token in chain.astream({"question": query, "context": context}):
        yield token
