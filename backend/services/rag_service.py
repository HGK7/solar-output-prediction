"""RAG service powered by modern LangChain retriever + Gemini chat model."""

import json
import os
from pathlib import Path
from typing import TYPE_CHECKING

from config import Config
from utils.logging import logger

if TYPE_CHECKING:
    from langchain_chroma import Chroma
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_huggingface import HuggingFaceEmbeddings

_PROMPT_DIR = os.path.join(Config.BASE_DIR, "prompts")

PUBLIC_SOURCE_LINKS = {
    "solar_fundamentals.md": "https://power.larc.nasa.gov/docs/services/api/temporal/daily/",
    "solar_panel_efficiency.md": "https://www.nrel.gov/pv/module-performance.html",
    "weather_impact.md": "https://www.nrel.gov/grid/solar-resource/",
    "bhadla_solar_park.md": "https://en.wikipedia.org/wiki/Bhadla_Solar_Park",
}


class RAGService:
    """Retrieval-Augmented Generation for scientific solar Q&A."""

    def __init__(self):
        self._prompt_template: str = self._load_prompt("rag_prompt.txt")
        self._persist_dir = os.path.join(Config.BASE_DIR, "chroma_db")
        self._embeddings = None
        self._vectorstore = None
        self._retriever = None
        self._llm = None

    def _ensure_ready(self) -> None:
        if self._vectorstore is not None and self._retriever is not None:
            return

        from langchain_chroma import Chroma
        from langchain_google_genai import ChatGoogleGenerativeAI
        from langchain_huggingface import HuggingFaceEmbeddings

        self._embeddings = HuggingFaceEmbeddings(model_name=Config.EMBEDDING_MODEL)
        self._vectorstore = Chroma(
            persist_directory=self._persist_dir,
            embedding_function=self._embeddings,
            collection_name="solar_science",
        )
        self._retriever = self._vectorstore.as_retriever(
            search_kwargs={"k": Config.RAG_TOP_K}
        )
        self._llm = ChatGoogleGenerativeAI(
            model=Config.GEMINI_MODEL,
            google_api_key=Config.GEMINI_API_KEY,
            temperature=Config.LLM_TEMPERATURE,
        )

    def ask(self, question: str) -> dict:
        """Answer a natural-language question using retrieved scientific context."""
        if not Config.GEMINI_API_KEY:
            raise RuntimeError(
                "GEMINI_API_KEY is not configured. Set it in your .env file to enable RAG."
            )

        self._ensure_ready()

        docs = self._retriever.invoke(question)
        if not docs:
            logger.info("No relevant scientific documents found for: %s", question[:80])
            return self._refusal("insufficient_context")

        context_parts = []
        citations = []
        retrieved_documents = []
        for i, doc in enumerate(docs, 1):
            metadata = doc.metadata or {}
            source_path = metadata.get("source", "unknown")
            source_name = Path(str(source_path)).name if source_path else "unknown"
            page = metadata.get("page")
            metadata_section = metadata.get("section")
            section = (
                f"page {page + 1}"
                if isinstance(page, int)
                else (str(metadata_section) if metadata_section else "")
            )
            source_link = PUBLIC_SOURCE_LINKS.get(source_name)
            context_parts.append(
                f"[Source {i}: {source_name}{f' | {section}' if section else ''}]\n{doc.page_content}"
            )
            citations.append(
                {
                    "source": source_name,
                    "section": section,
                    "source_path": str(source_path) if source_path else None,
                    "link": source_link,
                }
            )
            retrieved_documents.append(
                {
                    "source": source_name,
                    "section": section,
                    "source_path": str(source_path) if source_path else None,
                    "link": source_link,
                    "snippet": " ".join(doc.page_content.split())[:320],
                }
            )

        context_text = "\n\n---\n\n".join(context_parts)
        prompt = self._prompt_template.format(context=context_text, question=question)

        logger.info("RAG ask via LangChain retriever (sources=%d)", len(docs))
        response = self._llm.invoke(prompt)

        parsed = self._parse_response(response.content)
        if not parsed.get("citations") and not parsed.get("is_refusal", False):
            parsed["citations"] = citations
        parsed["query"] = question
        parsed["retrieval_count"] = len(retrieved_documents)
        parsed["retrieved_documents"] = retrieved_documents
        return parsed

    def document_count(self) -> int:
        """Best-effort count of indexed chunks for health checks."""
        try:
            self._ensure_ready()
            return int(self._vectorstore._collection.count())
        except Exception:
            return 0

    @staticmethod
    def _load_prompt(filename: str) -> str:
        path = os.path.join(_PROMPT_DIR, filename)
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    @staticmethod
    def _refusal(reason: str) -> dict:
        messages = {
            "insufficient_context": (
                "I don't have sufficient scientific context in the indexed PDFs "
                "to answer this accurately."
            ),
            "outside_scope": "This question is outside the scientific solar scope.",
            "ambiguous_question": (
                "The question is ambiguous for a grounded scientific response. "
                "Please provide more specific details."
            ),
        }
        return {
            "answer": messages.get(reason, messages["insufficient_context"]),
            "citations": [],
            "confidence": "none",
            "is_refusal": True,
            "refusal_reason": reason,
            "query": "",
            "retrieval_count": 0,
            "retrieved_documents": [],
        }

    @staticmethod
    def _parse_response(content: str) -> dict:
        text = content.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            lines = [line for line in lines if not line.strip().startswith("```")]
            text = "\n".join(lines)

        try:
            parsed = json.loads(text)
            parsed.setdefault("answer", "")
            parsed.setdefault("citations", [])
            parsed.setdefault("confidence", "low")
            parsed.setdefault("is_refusal", False)
            parsed.setdefault("refusal_reason", None)
            parsed.setdefault("query", "")
            parsed.setdefault("retrieval_count", 0)
            parsed.setdefault("retrieved_documents", [])
            return parsed
        except json.JSONDecodeError:
            logger.warning("RAG model returned non-JSON response; wrapping raw text.")
            return {
                "answer": text[:1500],
                "citations": [],
                "confidence": "low",
                "is_refusal": False,
                "refusal_reason": None,
                "query": "",
                "retrieval_count": 0,
                "retrieved_documents": [],
                "raw_response": True,
            }
