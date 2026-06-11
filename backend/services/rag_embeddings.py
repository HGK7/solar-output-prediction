"""RAG embedding adapter — Gemini API (no local torch)."""

from __future__ import annotations

from chromadb import Documents, EmbeddingFunction, Embeddings

from config import Config


def create_rag_embeddings():
    """Build LangChain Gemini embeddings for Chroma retrieval."""
    if not Config.GEMINI_API_KEY:
        raise RuntimeError(
            "GEMINI_API_KEY is not configured. Set it in .env to enable RAG embeddings."
        )

    try:
        from langchain_google_genai import GoogleGenerativeAIEmbeddings
    except ImportError as exc:
        raise RuntimeError(
            "RAG dependencies not installed. Run: pip install -r requirements-rag.txt"
        ) from exc

    return GoogleGenerativeAIEmbeddings(
        model=Config.EMBEDDING_MODEL,
        google_api_key=Config.GEMINI_API_KEY,
    )


class GeminiChromaEmbeddingFunction(EmbeddingFunction):
    """Bridge LangChain GoogleGenerativeAIEmbeddings to raw ChromaDB clients."""

    def __init__(self):
        self._embeddings = None

    def _ensure_embeddings(self):
        if self._embeddings is None:
            self._embeddings = create_rag_embeddings()

    def __call__(self, input: Documents) -> Embeddings:
        self._ensure_embeddings()
        return self._embeddings.embed_documents(list(input))
