"""
Document ingestion pipeline for the RAG knowledge base.

Reads Markdown / plain-text files from `rag/documents/`,
chunks them conservatively, and upserts into the VectorStore.
"""

import os
import re

from config import Config
from rag.vectorstore import VectorStore
from utils.logging import logger


def chunk_document(
    text: str,
    chunk_size: int = Config.CHUNK_SIZE,
    overlap: int = Config.CHUNK_OVERLAP,
) -> list[str]:
    """
    Conservative chunking by paragraph boundaries,
    falling back to character windows.
    """
    # Split on double newlines (paragraphs)
    paragraphs = [p.strip() for p in re.split(r"\n{2,}", text) if p.strip()]

    chunks: list[str] = []
    current_chunk = ""

    for para in paragraphs:
        if len(current_chunk) + len(para) + 2 <= chunk_size:
            current_chunk = f"{current_chunk}\n\n{para}".strip()
        else:
            if current_chunk:
                chunks.append(current_chunk)
            # If a single paragraph exceeds chunk_size, split by sentences
            if len(para) > chunk_size:
                sentences = re.split(r"(?<=[.!?])\s+", para)
                sub_chunk = ""
                for sentence in sentences:
                    if len(sub_chunk) + len(sentence) + 1 <= chunk_size:
                        sub_chunk = f"{sub_chunk} {sentence}".strip()
                    else:
                        if sub_chunk:
                            chunks.append(sub_chunk)
                        sub_chunk = sentence
                if sub_chunk:
                    current_chunk = sub_chunk
                else:
                    current_chunk = ""
            else:
                current_chunk = para

    if current_chunk:
        chunks.append(current_chunk)

    return chunks


def extract_section(text: str) -> str:
    """Extract the first markdown heading as section name."""
    match = re.search(r"^#+\s+(.+)$", text, re.MULTILINE)
    return match.group(1).strip() if match else ""


def ingest_documents(vectorstore: VectorStore, documents_dir: str | None = None) -> int:
    """
    Ingest all .md and .txt files from the documents directory.

    Returns the total number of chunks ingested.
    """
    docs_dir = documents_dir or Config.DOCUMENTS_DIR
    if not os.path.isdir(docs_dir):
        logger.warning("Documents directory not found: %s", docs_dir)
        return 0

    total_chunks = 0
    files = sorted(
        f for f in os.listdir(docs_dir) if f.endswith((".md", ".txt"))
    )

    for filename in files:
        filepath = os.path.join(docs_dir, filename)
        with open(filepath, "r", encoding="utf-8") as fh:
            content = fh.read()

        section = extract_section(content)
        chunks = chunk_document(content)

        if not chunks:
            continue

        ids = [f"{filename}_chunk_{i}" for i in range(len(chunks))]
        metadatas = [
            {
                "source": filename,
                "section": section,
                "chunk_index": i,
                "total_chunks": len(chunks),
            }
            for i in range(len(chunks))
        ]

        vectorstore.add_documents(documents=chunks, metadatas=metadatas, ids=ids)
        total_chunks += len(chunks)
        logger.info("  Ingested %s → %d chunks", filename, len(chunks))

    logger.info("Ingestion complete: %d chunks from %d files", total_chunks, len(files))
    return total_chunks
