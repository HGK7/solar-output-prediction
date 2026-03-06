"""
ChromaDB vector store wrapper.

Uses in-memory persistence (no disk backend) for MVP.
Embeddings are computed locally via sentence-transformers (all-MiniLM-L6-v2).

Heavy dependencies (chromadb, sentence-transformers) are lazy-loaded on first
use so the application starts quickly and stays under Render free-tier memory.
"""

from config import Config
from utils.logging import logger


class VectorStore:
    """Manages a single ChromaDB collection for solar-domain documents."""

    COLLECTION_NAME = "solar_knowledge"

    def __init__(self):
        # Defer all heavy imports until first real use
        self._client = None
        self._embedding_fn = None
        self._collection = None
        self._initialized = False
        logger.info("VectorStore registered (lazy — loads on first use)")

    # ------------------------------------------------------------------
    # Lazy initializer
    # ------------------------------------------------------------------

    def _ensure_initialized(self) -> None:
        """Load ChromaDB + sentence-transformers on first access."""
        if getattr(self, "_initialized", False):
            return

        import chromadb
        from chromadb.utils.embedding_functions import (
            SentenceTransformerEmbeddingFunction,
        )

        logger.info(
            "Initializing ChromaDB (in-memory) with %s …", Config.EMBEDDING_MODEL
        )
        self._client = chromadb.Client(chromadb.Settings(anonymized_telemetry=False))
        self._embedding_fn = SentenceTransformerEmbeddingFunction(
            model_name=Config.EMBEDDING_MODEL
        )
        self._collection = self._client.get_or_create_collection(
            name=self.COLLECTION_NAME,
            embedding_function=self._embedding_fn,
        )
        self._initialized = True
        logger.info("VectorStore ready (collection: %s)", self.COLLECTION_NAME)

    # ------------------------------------------------------------------
    # Write path
    # ------------------------------------------------------------------

    def add_documents(
        self,
        documents: list[str],
        metadatas: list[dict],
        ids: list[str],
    ) -> None:
        """Add a batch of text chunks to the collection."""
        self._ensure_initialized()
        self._collection.add(
            documents=documents,
            metadatas=metadatas,
            ids=ids,
        )

    def count(self) -> int:
        """Return chunk count without triggering lazy init."""
        if not getattr(self, "_initialized", False):
            return 0
        collection = getattr(self, "_collection", None)
        if collection is None:
            return 0
        return collection.count()

    # ------------------------------------------------------------------
    # Read path
    # ------------------------------------------------------------------

    def query(self, query_text: str, k: int = 3) -> dict:
        """
        Retrieve the top-k most relevant chunks for a query.

        Returns the raw ChromaDB result dict with keys:
        ids, documents, metadatas, distances
        """
        self._ensure_initialized()
        return self._collection.query(
            query_texts=[query_text],
            n_results=k,
        )
