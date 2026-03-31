from typing import TypedDict

from langchain_core.output_parsers import StrOutputParser
from langgraph.graph import END, StateGraph

from app.services.llm import get_llm
from app.services.prompts import CHAT_PROMPT, format_context

# Lines shorter than this that don't end in punctuation are likely PDF headers/footers
_HEADER_MAX_LEN = 60
_SNIPPET_MAX_LEN = 350


class GraphState(TypedDict):
    question: str
    context: str
    answer: str


def _clean_snippet(text: str) -> str:
    """Strip PDF running headers/footers; return a clean excerpt with ellipsis."""
    lines = text.strip().splitlines()

    content_start = 0
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped and (len(stripped) >= _HEADER_MAX_LEN or stripped[-1] in ".!?,:;)"):
            content_start = i
            break

    content_lines = lines[content_start:]
    cleaned = " ".join(" ".join(content_lines).split())

    if not cleaned:
        cleaned = " ".join(text.split())

    if len(cleaned) <= _SNIPPET_MAX_LEN:
        return cleaned

    truncated = cleaned[:_SNIPPET_MAX_LEN].rsplit(" ", 1)[0]
    return f"{truncated}..."


def extract_citations(chunks: list[dict]) -> list[dict]:
    """Build citations from retrieved chunks sorted by relevance score.

    Returns list of {document_name, page_number, chunk_text_snippet, relevance_score}.
    """
    seen: set[tuple] = set()
    citations = []

    for chunk in sorted(chunks, key=lambda c: c["similarity_score"], reverse=True):
        key = (chunk["document_name"], chunk["page_number"])
        if key in seen:
            continue
        seen.add(key)
        citations.append(
            {
                "document_name": chunk["document_name"],
                "page_number": chunk["page_number"],
                "chunk_text_snippet": _clean_snippet(chunk["chunk_text"]),
                "relevance_score": chunk["similarity_score"],
            }
        )

    return citations


async def _generate(state: GraphState) -> GraphState:
    """LangGraph node: call the LLM and return the answer."""
    llm = get_llm()
    chain = CHAT_PROMPT | llm | StrOutputParser()
    answer = await chain.ainvoke(
        {
            "question": state["question"],
            "context": state["context"],
        }
    )
    return {"answer": answer}


def build_graph():
    """Compile the LangGraph StateGraph for document Q&A."""
    graph = StateGraph(GraphState)
    graph.add_node("generate", _generate)
    graph.set_entry_point("generate")
    graph.add_edge("generate", END)
    return graph.compile()


# Module-level compiled graph — built once, reused across requests
_graph = build_graph()


async def stream_graph(query: str, chunks: list[dict]):
    """Stream the graph response token by token. Yields string tokens."""
    context = format_context(chunks)
    async for event in _graph.astream_events(
        {"question": query, "context": context, "answer": ""},
        version="v2",
    ):
        if event["event"] == "on_chat_model_stream":
            token = event["data"]["chunk"].content
            if token:
                yield token
