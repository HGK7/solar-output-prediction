"""Tests for markdown chunking + ingest document loading (no embeddings)."""

import pytest

from rag.ingest import chunk_document, extract_section
from scripts.ingest_markdown_docs import load_markdown_chunks


# --- chunk_document ---------------------------------------------------------


def test_chunk_document_respects_chunk_size():
    text = "\n\n".join(f"Paragraph {i} with some words." for i in range(40))
    chunks = chunk_document(text, chunk_size=120, overlap=0)
    assert chunks
    assert all(chunks), "no empty chunks"
    assert all(len(c) <= 120 for c in chunks)


def test_chunk_document_preserves_content():
    text = "First paragraph here.\n\nSecond paragraph here."
    chunks = chunk_document(text, chunk_size=500)
    joined = "\n\n".join(chunks)
    assert "First paragraph here." in joined
    assert "Second paragraph here." in joined


def test_chunk_document_splits_oversized_paragraph_by_sentence():
    text = " ".join(f"Sentence number {i} is here." for i in range(30))
    chunks = chunk_document(text, chunk_size=100, overlap=0)
    assert len(chunks) > 1
    assert all(len(c) <= 100 for c in chunks)


# --- extract_section --------------------------------------------------------


def test_extract_section_first_heading():
    assert extract_section("# Solar Costs\n\nBody text") == "Solar Costs"


def test_extract_section_no_heading():
    assert extract_section("Plain text only") == ""


# --- load_markdown_chunks ---------------------------------------------------


def test_load_markdown_chunks_metadata_and_ids(tmp_path):
    (tmp_path / "alpha.md").write_text(
        "# Alpha\n\nSolar irradiance basics.", encoding="utf-8"
    )
    (tmp_path / "beta.txt").write_text("Plain text doc.", encoding="utf-8")
    (tmp_path / "ignored.py").write_text("print('skip me')", encoding="utf-8")

    texts, metadatas, ids = load_markdown_chunks(tmp_path)

    assert len(texts) == len(metadatas) == len(ids)
    assert len(set(ids)) == len(ids), "ids must be unique"
    sources = {m["source"] for m in metadatas}
    assert sources == {"alpha.md", "beta.txt"}
    alpha_meta = next(m for m in metadatas if m["source"] == "alpha.md")
    assert alpha_meta["section"] == "Alpha"
    assert ids[0].endswith("_chunk_0")


def test_load_markdown_chunks_empty_dir_raises(tmp_path):
    with pytest.raises(RuntimeError, match="No .md/.txt documents"):
        load_markdown_chunks(tmp_path)
