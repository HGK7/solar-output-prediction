"""Ingest markdown knowledge base into the persistent Chroma DB.

Replaces the ad-hoc ingest one-liner. Reads `rag/documents/*.md|*.txt`,
chunks via the shared `rag.ingest` chunker, embeds with Gemini
(services/rag_embeddings.py, ADR-0003) and persists to `chroma_db/`
collection `solar_science_gemini` — the same store `RAGService` reads.

Idempotent: wipes the target collection before re-ingesting, so running
twice never duplicates chunks.

Usage (from backend/, venv active, GEMINI_API_KEY in .env):
    python scripts/ingest_markdown_docs.py
    python scripts/ingest_markdown_docs.py --source rag/documents --db chroma_db
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from config import Config
from rag.ingest import chunk_document, extract_section


def load_markdown_chunks(source_dir: Path) -> tuple[list[str], list[dict], list[str]]:
    """Read .md/.txt files and return (texts, metadatas, ids).

    Metadata mirrors rag/ingest.py: `source` is the bare filename so
    RAGService citations resolve against GET /rag/documents/<filename>.
    """
    files = sorted(
        p for p in source_dir.iterdir() if p.suffix.lower() in (".md", ".txt")
    )
    if not files:
        raise RuntimeError(f"No .md/.txt documents found in {source_dir}")

    texts: list[str] = []
    metadatas: list[dict] = []
    ids: list[str] = []

    for filepath in files:
        content = filepath.read_text(encoding="utf-8")
        section = extract_section(content)
        chunks = chunk_document(content)
        if not chunks:
            continue
        for i, chunk in enumerate(chunks):
            texts.append(chunk)
            metadatas.append(
                {
                    "source": filepath.name,
                    "section": section,
                    "chunk_index": i,
                    "total_chunks": len(chunks),
                }
            )
            ids.append(f"{filepath.name}_chunk_{i}")
        print(f"  {filepath.name}: {len(chunks)} chunks")

    return texts, metadatas, ids


def ingest(
    source_dir: Path,
    persist_dir: Path,
    collection_name: str,
) -> int:
    try:
        from langchain_chroma import Chroma
    except ImportError as exc:
        raise RuntimeError(
            "RAG dependencies not installed. Run: pip install -r requirements-rag.txt"
        ) from exc

    from services.rag_embeddings import create_rag_embeddings

    texts, metadatas, ids = load_markdown_chunks(source_dir)
    embeddings = create_rag_embeddings()
    persist_dir.mkdir(parents=True, exist_ok=True)

    store = Chroma(
        persist_directory=str(persist_dir),
        embedding_function=embeddings,
        collection_name=collection_name,
    )
    existing = store._collection.count()
    if existing:
        print(f"Wiping existing collection '{collection_name}' ({existing} chunks)")
        store.delete_collection()
        store = Chroma(
            persist_directory=str(persist_dir),
            embedding_function=embeddings,
            collection_name=collection_name,
        )

    store.add_texts(texts=texts, metadatas=metadatas, ids=ids)
    return len(texts)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Ingest markdown knowledge base into persistent Chroma DB."
    )
    parser.add_argument(
        "--source",
        default=Config.DOCUMENTS_DIR,
        help="Folder with .md/.txt docs (default: rag/documents)",
    )
    parser.add_argument(
        "--db",
        default="chroma_db",
        help="Chroma persistence directory (default: backend/chroma_db)",
    )
    parser.add_argument(
        "--collection",
        default=Config.CHROMA_COLLECTION,
        help="Collection name (must match RAGService)",
    )
    args = parser.parse_args()

    source_dir = Path(args.source)
    if not source_dir.is_absolute():
        source_dir = (BACKEND_ROOT / source_dir).resolve()
    if not source_dir.is_dir():
        raise FileNotFoundError(f"Documents directory not found: {source_dir}")

    persist_dir = Path(args.db)
    if not persist_dir.is_absolute():
        persist_dir = (BACKEND_ROOT / persist_dir).resolve()

    count = ingest(source_dir, persist_dir, args.collection)
    print(
        f"Ingested {count} chunks from {source_dir} into "
        f"{persist_dir} (collection: {args.collection})"
    )


if __name__ == "__main__":
    main()
