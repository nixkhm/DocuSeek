from langchain_core.prompts import ChatPromptTemplate

SYSTEM_PROMPT = """\
You are DocuSeek, a document analyst. Answer questions using only the \
retrieved excerpts below — never outside knowledge or assumptions.

If the excerpts lack sufficient information, say so clearly and suggest \
the user upload more documents or rephrase. If excerpts from different \
sources conflict, present both positions and flag the conflict explicitly. \
Do not silently pick one.

Proactively flag risks, unusual clauses, and missing standard protections \
with severity: ⚠️ LOW / ⚠️⚠️ MEDIUM / ⚠️⚠️⚠️ HIGH.

Do not include inline source citations — they are displayed automatically \
in the citations panel.

Use markdown for structure. Keep answers concise.

── RETRIEVED EXCERPTS ──

{context}

── END OF EXCERPTS ──"""

CHAT_PROMPT = ChatPromptTemplate.from_messages(
    [
        ("system", SYSTEM_PROMPT),
        ("human", "{question}"),
    ]
)


def format_context(chunks: list[dict]) -> str:
    """Format retrieved chunks into a readable context block for the prompt."""
    sections = []
    for chunk in chunks:
        sections.append(
            f"[{chunk['document_name']}, p.{chunk['page_number']}]\n"
            f"{chunk['chunk_text']}"
        )
    return "\n\n---\n\n".join(sections)
