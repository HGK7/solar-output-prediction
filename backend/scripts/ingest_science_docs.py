"""Ingest scientific PDFs from science_context/ into a persistent Chroma DB."""

from __future__ import annotations

import argparse
import os
from pathlib import Path

from langchain_chroma import Chroma
from langchain_community.document_loaders import PyPDFDirectoryLoader
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter


def resolve_science_dir(input_dir: str) -> Path:
    candidate = Path(input_dir)
    if candidate.exists() and candidate.is_dir():
        return candidate.resolve()

    fallback = Path(__file__).resolve().parents[1] / "science_context"
    if fallback.exists() and fallback.is_dir():
        return fallback

    raise FileNotFoundError(
        f"Science context directory not found: '{input_dir}'. "
        f"Expected a folder named 'science_context/' with PDF files."
    )


def ingest_science_docs(
    source_dir: Path,
    persist_directory: Path,
    embedding_model: str,
    chunk_size: int,
    chunk_overlap: int,
) -> int:
    loader = PyPDFDirectoryLoader(str(source_dir), glob="**/*.pdf")
    docs = loader.load()
    if not docs:
        raise RuntimeError(f"No PDF documents found in {source_dir}")

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )
    chunks = splitter.split_documents(docs)

    embeddings = HuggingFaceEmbeddings(model_name=embedding_model)

    persist_directory.mkdir(parents=True, exist_ok=True)

    Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=str(persist_directory),
        collection_name="solar_science",
    )

    return len(chunks)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Ingest scientific PDFs into Chroma DB."
    )
    parser.add_argument(
        "--source", default="science_context", help="Path to science PDFs folder"
    )
    parser.add_argument(
        "--db", default="chroma_db", help="Path to Chroma persistence directory"
    )
    parser.add_argument("--embedding-model", default="all-MiniLM-L6-v2")
    parser.add_argument("--chunk-size", type=int, default=1000)
    parser.add_argument("--chunk-overlap", type=int, default=200)
    args = parser.parse_args()

    backend_root = Path(__file__).resolve().parents[1]
    source_dir = resolve_science_dir(args.source)
    persist_dir = (
        (backend_root / args.db).resolve()
        if not os.path.isabs(args.db)
        else Path(args.db)
    )

    chunk_count = ingest_science_docs(
        source_dir=source_dir,
        persist_directory=persist_dir,
        embedding_model=args.embedding_model,
        chunk_size=args.chunk_size,
        chunk_overlap=args.chunk_overlap,
    )

    print(f"Indexed {chunk_count} chunks from {source_dir} into {persist_dir}")


if __name__ == "__main__":
    main()
