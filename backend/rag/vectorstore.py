"""
ChromaDB vector store wrapper.

Uses in-memory persistence (no disk backend) for MVP.
Embeddings via Gemini API (see services/rag_embeddings.py).

Heavy dependencies (chromadb, langchain-google-genai) lazy-load on first use.
"""

from config import Config
from services.rag_embeddings import GeminiChromaEmbeddingFunction
from utils.logging import logger


class VectorStore:
    """Manages a single ChromaDB collection for solar-domain documents."""

    COLLECTION_NAME = Config.CHROMA_COLLECTION

    def __init__(self):
        self._client = None
        self._embedding_fn = None
        self._collection = None
        self._initialized = False
        logger.info("VectorStore registered (lazy — loads on first use)")

    def _ensure_initialized(self) -> None:
        if getattr(self, "_initialized", False):
            return

        import chromadb

        logger.info(
            "Initializing ChromaDB (in-memory) with %s …", Config.EMBEDDING_MODEL
        )
        self._client = chromadb.Client(chromadb.Settings(anonymized_telemetry=False))
        self._embedding_fn = GeminiChromaEmbeddingFunction()
        self._collection = self._client.get_or_create_collection(
            name=self.COLLECTION_NAME,
            embedding_function=self._embedding_fn,
        )
        self._initialized = True
        logger.info("VectorStore ready (collection: %s)", self.COLLECTION_NAME)

    def add_documents(
        self,
        documents: list[str],
        metadatas: list[dict],
        ids: list[str],
    ) -> None:
        self._ensure_initialized()
        self._collection.add(
            documents=documents,
            metadatas=metadatas,
            ids=ids,
        )

    def count(self) -> int:
        if not getattr(self, "_initialized", False):
            return 0
        collection = getattr(self, "_collection", None)
        if collection is None:
            return 0
        return collection.count()

    def query(self, query_text: str, k: int = 3) -> dict:
        self._ensure_initialized()
        return self._collection.query(
            query_texts=[query_text],
            n_results=k,
        )
