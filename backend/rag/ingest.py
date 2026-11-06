"""
Document ingestion pipeline for the RAG knowledge base.

Reads Markdown / plain-text files from `rag/documents/`,
chunks them with section-heading awareness (`# / ## / ###`),
and upserts into the VectorStore / LiteVectorStore.
"""

from __future__ import annotations

import os
import re
from typing import Any

from config import Config
from rag.vectorstore import VectorStore
from utils.logging import logger

_HEADING_RE = re.compile(r"^(#{1,4})\s+(.+)$")


def chunk_document(
    text: str,
    chunk_size: int = Config.CHUNK_SIZE,
    overlap: int = Config.CHUNK_OVERLAP,
) -> list[str]:
    """
    Conservative chunking by paragraph boundaries,
    falling back to character windows.
    """
    paragraphs = [p.strip() for p in re.split(r"\n{2,}", text) if p.strip()]

    chunks: list[str] = []
    current_chunk = ""

    for para in paragraphs:
        if len(current_chunk) + len(para) + 2 <= chunk_size:
            current_chunk = f"{current_chunk}\n\n{para}".strip()
        else:
            if current_chunk:
                chunks.append(current_chunk)
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


def chunk_document_with_sections(
    text: str,
    chunk_size: int = Config.CHUNK_SIZE,
    overlap: int = Config.CHUNK_OVERLAP,
) -> list[dict[str, Any]]:
    """
    Split markdown/text into section-aware chunks.

    Tracks the active `#` / `##` / `###` heading hierarchy so every chunk carries
    its exact `section` metadata (e.g., `"PM Surya Ghar"` or `"Bill-to-kW System Sizing Methodology"`)
    and keeps headings attached to their body paragraphs.
    """
    raw_blocks = [b.strip() for b in re.split(r"\n{2,}", text) if b.strip()]
    if not raw_blocks:
        return []

    top_heading = extract_section(text)
    active_h1 = top_heading
    active_h2 = ""
    active_h3 = ""

    # Group blocks into (section_label, paragraph_text) while attaching standalone headings
    section_blocks: list[tuple[str, str]] = []
    pending_headings: list[str] = []

    def _current_section_label() -> str:
        if active_h3 and active_h2:
            return f"{active_h2} — {active_h3}"
        if active_h3:
            return active_h3
        if active_h2:
            return active_h2
        return active_h1

    for block in raw_blocks:
        lines = [ln.strip() for ln in block.splitlines() if ln.strip()]
        if len(lines) == 1:
            m = _HEADING_RE.match(lines[0])
            if m:
                level = len(m.group(1))
                title = m.group(2).strip()
                if level == 1:
                    active_h1 = title
                    active_h2 = ""
                    active_h3 = ""
                elif level == 2:
                    active_h2 = title
                    active_h3 = ""
                else:
                    active_h3 = title
                pending_headings.append(lines[0])
                continue

        # Check if first line of multi-line block is a heading
        first_match = _HEADING_RE.match(lines[0]) if lines else None
        if first_match:
            level = len(first_match.group(1))
            title = first_match.group(2).strip()
            if level == 1:
                active_h1 = title
                active_h2 = ""
                active_h3 = ""
            elif level == 2:
                active_h2 = title
                active_h3 = ""
            else:
                active_h3 = title

        combined = "\n\n".join([*pending_headings, block]) if pending_headings else block
        pending_headings = []
        section_blocks.append((_current_section_label(), combined))

    if pending_headings:
        section_blocks.append((_current_section_label(), "\n\n".join(pending_headings)))

    # Merge contiguous blocks within the same section up to chunk_size
    results: list[dict[str, Any]] = []
    cur_section = ""
    cur_text = ""

    for sec, blk in section_blocks:
        if not cur_text:
            cur_section = sec
            if len(blk) <= chunk_size:
                cur_text = blk
            else:
                for sub in chunk_document(blk, chunk_size=chunk_size, overlap=overlap):
                    results.append({"content": sub, "section": sec})
            continue

        if sec == cur_section and len(cur_text) + len(blk) + 2 <= chunk_size:
            cur_text = f"{cur_text}\n\n{blk}"
        else:
            results.append({"content": cur_text, "section": cur_section})
            cur_section = sec
            if len(blk) <= chunk_size:
                cur_text = blk
            else:
                cur_text = ""
                for sub in chunk_document(blk, chunk_size=chunk_size, overlap=overlap):
                    results.append({"content": sub, "section": sec})

    if cur_text:
        results.append({"content": cur_text, "section": cur_section})

    return results


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

        section_chunks = chunk_document_with_sections(content)
        if not section_chunks:
            continue

        chunks = [item["content"] for item in section_chunks]
        ids = [f"{filename}_chunk_{i}" for i in range(len(chunks))]
        metadatas = [
            {
                "source": filename,
                "section": item["section"] or extract_section(content),
                "chunk_index": i,
                "total_chunks": len(chunks),
            }
            for i, item in enumerate(section_chunks)
        ]

        vectorstore.add_documents(documents=chunks, metadatas=metadatas, ids=ids)
        total_chunks += len(chunks)
        logger.info("  Ingested %s → %d chunks", filename, len(chunks))

    logger.info("Ingestion complete: %d chunks from %d files", total_chunks, len(files))
    return total_chunks
