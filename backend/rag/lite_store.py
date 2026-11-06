"""
Zero-Bloat SQLite + NumPy Hybrid Vector Store (`LiteVectorStore`, ADR-0005).

Stores section-aware markdown chunks (`id`, `source`, `section`, `content`,
`embedding_json`) in a compact SQLite file (`backend/rag/rag_index.sqlite`).

Features:
- **Zero-Config Auto-Sync**: Automatically indexes all `.md` and `.txt` files in
  `rag/documents/` on first query or count check if the SQLite database is missing
  or out-of-sync with the corpus on disk.
- **<5 MB Runtime RAM**: Replaces ~250 MB Chroma/HNSW C++ overhead on 512 MB free
  tiers with fast SQLite + NumPy cosine similarity (`np.dot`) + BM25 lexical hybrid
  scoring.
- **Graceful Offline / No-Embedding Fallback**: Works out-of-the-box with BM25 +
  domain-term boosting even before Gemini embeddings are populated, and blends
  dense cosine similarity with BM25 when embeddings are present.
"""

from __future__ import annotations

from dataclasses import dataclass, field
import json
import math
from pathlib import Path
import re
import sqlite3
from typing import Any

import numpy as np

from config import Config
from rag.ingest import chunk_document_with_sections, extract_section
from utils.logging import logger

_TOKEN_RE = re.compile(r"[a-z0-9_₹$%]+")

_STOPWORDS = frozenset(
    {
        "a",
        "an",
        "and",
        "are",
        "as",
        "at",
        "be",
        "by",
        "can",
        "do",
        "does",
        "for",
        "from",
        "how",
        "i",
        "if",
        "in",
        "into",
        "is",
        "it",
        "its",
        "my",
        "of",
        "on",
        "or",
        "should",
        "so",
        "that",
        "the",
        "their",
        "this",
        "to",
        "vs",
        "what",
        "when",
        "where",
        "which",
        "who",
        "why",
        "with",
        "would",
    }
)


@dataclass
class RetrievedChunk:
    """LangChain-Document-compatible retrieved passage."""

    page_content: str
    metadata: dict[str, Any] = field(default_factory=dict)
    score: float = 0.0


def _tokenize(text: str) -> list[str]:
    tokens = _TOKEN_RE.findall(text.lower())
    return [t for t in tokens if t not in _STOPWORDS and len(t) > 1]


class LiteVectorStore:
    """Lightweight SQLite + NumPy + BM25 hybrid retriever for the solar knowledge base."""

    def __init__(
        self,
        db_path: str | Path | None = None,
        documents_dir: str | Path | None = None,
        chunk_size: int = 750,
        chunk_overlap: int = Config.CHUNK_OVERLAP,
    ) -> None:
        self._db_path = Path(
            db_path or Path(Config.BASE_DIR) / "rag" / "rag_index.sqlite"
        )
        self._documents_dir = Path(documents_dir or Config.DOCUMENTS_DIR)
        self._chunk_size = chunk_size
        self._chunk_overlap = chunk_overlap
        self._synced = False

    @property
    def db_path(self) -> Path:
        return self._db_path

    def _connect(self) -> sqlite3.Connection:
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(self._db_path))
        conn.row_factory = sqlite3.Row
        return conn

    def _init_schema(self, conn: sqlite3.Connection) -> None:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS rag_chunks (
                id TEXT PRIMARY KEY,
                source TEXT NOT NULL,
                section TEXT NOT NULL,
                chunk_index INTEGER NOT NULL,
                total_chunks INTEGER NOT NULL,
                content TEXT NOT NULL,
                embedding_json TEXT
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS rag_meta (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
            """
        )
        conn.commit()

    def _corpus_fingerprint(self) -> str:
        if not self._documents_dir.is_dir():
            return "empty"
        parts: list[str] = []
        for path in sorted(self._documents_dir.iterdir()):
            if path.is_file() and path.suffix.lower() in (".md", ".txt"):
                stat = path.stat()
                parts.append(f"{path.name}:{stat.st_size}:{int(stat.st_mtime)}")
        return "|".join(parts)

    def _raw_count(self) -> int:
        with self._connect() as conn:
            self._init_schema(conn)
            row = conn.execute("SELECT COUNT(*) AS cnt FROM rag_chunks").fetchone()
            return int(row["cnt"]) if row else 0

    def ensure_synced(self, force: bool = False) -> int:
        """Ensure SQLite database contains up-to-date chunks for all markdown docs."""
        if self._synced and not force and self._db_path.is_file():
            return self._raw_count()

        fingerprint = self._corpus_fingerprint()
        with self._connect() as conn:
            self._init_schema(conn)
            if not force:
                row = conn.execute(
                    "SELECT value FROM rag_meta WHERE key = 'corpus_fingerprint'"
                ).fetchone()
                cnt_row = conn.execute(
                    "SELECT COUNT(*) AS cnt FROM rag_chunks"
                ).fetchone()
                existing_cnt = int(cnt_row["cnt"]) if cnt_row else 0
                if row and row["value"] == fingerprint and existing_cnt > 0:
                    self._synced = True
                    return existing_cnt

            # Rebuild chunks from markdown files, preserving any matching embeddings
            existing_embeddings: dict[str, str] = {}
            for r in conn.execute(
                "SELECT id, content, embedding_json FROM rag_chunks WHERE embedding_json IS NOT NULL"
            ):
                existing_embeddings[f"{r['id']}::{hash(r['content'])}"] = r["embedding_json"]

            conn.execute("DELETE FROM rag_chunks")

            total_chunks = 0
            if self._documents_dir.is_dir():
                files = sorted(
                    p
                    for p in self._documents_dir.iterdir()
                    if p.is_file() and p.suffix.lower() in (".md", ".txt")
                )
                rows_to_insert: list[tuple[Any, ...]] = []
                for filepath in files:
                    content = filepath.read_text(encoding="utf-8")
                    fallback_sec = extract_section(content)
                    sec_chunks = chunk_document_with_sections(
                        content,
                        chunk_size=self._chunk_size,
                        overlap=self._chunk_overlap,
                    )
                    if not sec_chunks:
                        continue
                    n_chunks = len(sec_chunks)
                    for idx, item in enumerate(sec_chunks):
                        chunk_id = f"{filepath.name}_chunk_{idx}"
                        chunk_text = item["content"]
                        section_name = item["section"] or fallback_sec
                        emb_json = existing_embeddings.get(
                            f"{chunk_id}::{hash(chunk_text)}"
                        )
                        rows_to_insert.append(
                            (
                                chunk_id,
                                filepath.name,
                                section_name,
                                idx,
                                n_chunks,
                                chunk_text,
                                emb_json,
                            )
                        )
                    total_chunks += n_chunks

                conn.executemany(
                    """
                    INSERT INTO rag_chunks (
                        id, source, section, chunk_index, total_chunks, content, embedding_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    rows_to_insert,
                )

            conn.execute(
                "INSERT OR REPLACE INTO rag_meta (key, value) VALUES ('corpus_fingerprint', ?)",
                (fingerprint,),
            )
            conn.commit()
            self._synced = True
            logger.info(
                "LiteVectorStore synced %d chunks into %s",
                total_chunks,
                self._db_path.name,
            )
            return total_chunks

    def count(self) -> int:
        """Return total indexed chunk count in SQLite."""
        self.ensure_synced()
        return self._raw_count()

    def query(
        self,
        question: str,
        k: int = 4,
        api_key: str | None = None,
    ) -> list[RetrievedChunk]:
        """
        Retrieve top-k chunks using hybrid BM25 lexical + optional dense cosine similarity.
        """
        self.ensure_synced()
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT id, source, section, chunk_index, total_chunks, content, embedding_json FROM rag_chunks"
            ).fetchall()

        if not rows:
            return []

        q_tokens = _tokenize(question)
        if not q_tokens:
            q_tokens = [question.lower().strip()]

        # Compute BM25 lexical scores across chunks + section headings + source names
        doc_tokens_list: list[list[str]] = []
        df: dict[str, int] = {}
        total_len = 0

        for r in rows:
            # Weight source filename and section heading tokens extra by repeating them
            source_stem = Path(r["source"]).stem.replace("_", " ")
            combined_text = (
                f"{source_stem} {source_stem} {r['section']} {r['section']} {r['content']}"
            )
            toks = _tokenize(combined_text)
            doc_tokens_list.append(toks)
            total_len += len(toks)
            for ut in set(toks):
                df[ut] = df.get(ut, 0) + 1

        n_docs = len(rows)
        avg_dl = max(1.0, total_len / n_docs)
        k1 = 1.5
        b = 0.75

        bm25_scores = np.zeros(n_docs, dtype=np.float64)
        q_lower = question.lower()

        for i, toks in enumerate(doc_tokens_list):
            if not toks:
                continue
            dl = len(toks)
            tf_map: dict[str, int] = {}
            for t in toks:
                tf_map[t] = tf_map.get(t, 0) + 1

            score = 0.0
            for qt in q_tokens:
                tf = tf_map.get(qt, 0)
                if tf == 0:
                    # Partial prefix/substring match for technical terms (e.g. "subsidy" vs "subsidies")
                    prefix = qt[:5] if len(qt) >= 5 else ""
                    if prefix:
                        tf = sum(1 for t in toks if t.startswith(prefix)) * 0.5
                if tf > 0:
                    doc_freq = df.get(qt, 1)
                    idf = math.log(1.0 + (n_docs - doc_freq + 0.5) / (doc_freq + 0.5))
                    denom = tf + k1 * (1.0 - b + b * (dl / avg_dl))
                    score += idf * ((tf * (k1 + 1.0)) / denom)

            # Bonus if section title words appear directly in question
            sec_lower = rows[i]["section"].lower()
            if sec_lower and any(w in q_lower for w in _tokenize(sec_lower)):
                score += 1.2
            bm25_scores[i] = score

        # Optional dense cosine similarity if embeddings are stored on chunks
        dense_scores = np.zeros(n_docs, dtype=np.float64)
        has_all_embeddings = all(r["embedding_json"] for r in rows)
        if has_all_embeddings and api_key:
            try:
                from services.rag_embeddings import create_rag_embeddings

                emb_client = create_rag_embeddings(api_key=api_key)
                q_vec = np.asarray(emb_client.embed_query(question), dtype=np.float32)
                q_norm = np.linalg.norm(q_vec)
                if q_norm > 0:
                    q_vec = q_vec / q_norm
                    for i, r in enumerate(rows):
                        vec = np.asarray(
                            json.loads(r["embedding_json"]), dtype=np.float32
                        )
                        v_norm = np.linalg.norm(vec)
                        if v_norm > 0:
                            dense_scores[i] = float(np.dot(q_vec, vec / v_norm))
            except Exception as exc:
                logger.debug("LiteVectorStore dense query fallback to BM25: %s", exc)

        # Combine normalized BM25 and dense cosine similarity
        max_bm25 = float(np.max(bm25_scores)) if n_docs else 0.0
        norm_bm25 = bm25_scores / max_bm25 if max_bm25 > 0 else bm25_scores
        if np.any(dense_scores > 0):
            combined_scores = 0.55 * dense_scores + 0.45 * norm_bm25
        else:
            combined_scores = bm25_scores

        ranked_indices = np.argsort(-combined_scores)
        results: list[RetrievedChunk] = []
        for idx in ranked_indices[: max(1, k)]:
            score_val = float(combined_scores[int(idx)])
            if score_val <= 0 and len(results) > 0:
                break
            row = rows[int(idx)]
            results.append(
                RetrievedChunk(
                    page_content=row["content"],
                    metadata={
                        "id": row["id"],
                        "source": row["source"],
                        "section": row["section"],
                        "chunk_index": row["chunk_index"],
                        "total_chunks": row["total_chunks"],
                        "score": round(score_val, 4),
                    },
                    score=round(score_val, 4),
                )
            )

        return results


_DEFAULT_LITE_STORE: LiteVectorStore | None = None


def get_lite_store() -> LiteVectorStore:
    """Return a singleton LiteVectorStore instance."""
    global _DEFAULT_LITE_STORE
    if _DEFAULT_LITE_STORE is None:
        _DEFAULT_LITE_STORE = LiteVectorStore()
    return _DEFAULT_LITE_STORE

