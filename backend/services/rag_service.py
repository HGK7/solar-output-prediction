"""
RAG service — answers domain questions grounded in trusted documents.

Uses ChromaDB (in-memory) + sentence-transformers embeddings.
The LLM is constrained to answer ONLY from retrieved context and must
explicitly refuse when context is insufficient.

Uses the google-genai SDK (google.genai) — the current, supported SDK.
The deprecated google-generativeai package is NOT used.
"""

import json
import os

from google import genai
from google.genai import types

from config import Config
from rag.vectorstore import VectorStore
from utils.logging import logger

_PROMPT_DIR = os.path.join(Config.BASE_DIR, "prompts")


class RAGService:
    """Retrieval-Augmented Generation for solar-domain Q&A."""

    def __init__(self, vectorstore: VectorStore):
        self._vectorstore = vectorstore
        self._client: genai.Client | None = None
        self._prompt_template: str = self._load_prompt("rag_prompt.txt")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def ask(self, question: str) -> dict:
        """
        Answer a natural-language question using RAG.

        Pipeline:  question → retrieve → augment prompt → LLM → structured answer
        """
        # --- Retrieve ---
        results = self._vectorstore.query(question, k=Config.RAG_TOP_K)
        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]

        if not documents:
            logger.info("No relevant documents found for: %s", question[:80])
            return self._refusal("insufficient_context")

        # --- Build context ---
        context_parts = []
        for i, (doc, meta) in enumerate(zip(documents, metadatas), 1):
            source = meta.get("source", "unknown")
            section = meta.get("section", "")
            header = f"[Source {i}: {source}"
            if section:
                header += f" § {section}"
            header += "]"
            context_parts.append(f"{header}\n{doc}")

        context_text = "\n\n---\n\n".join(context_parts)

        # --- Augment & call LLM ---
        client = self._get_client()
        prompt = self._prompt_template.format(
            context=context_text, question=question
        )

        logger.info("Sending RAG query to Gemini (sources: %d) …", len(documents))
        response = client.models.generate_content(
            model=Config.GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=self._system_instruction(),
                temperature=Config.LLM_TEMPERATURE,
                response_mime_type="application/json",
            ),
        )

        return self._parse_response(response.text)

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _get_client(self) -> genai.Client:
        if self._client is None:
            if not Config.GEMINI_API_KEY:
                raise RuntimeError(
                    "GEMINI_API_KEY is not configured. "
                    "Set it in your .env file to enable RAG."
                )
            self._client = genai.Client(api_key=Config.GEMINI_API_KEY)
        return self._client

    @staticmethod
    def _system_instruction() -> str:
        return (
            "You are a solar energy knowledge assistant embedded in a "
            "decision-support system. You answer questions using ONLY the "
            "provided context documents. You NEVER fabricate information. "
            "If the context is insufficient, you must refuse clearly. "
            "Always respond in valid JSON matching the requested schema."
        )

    @staticmethod
    def _load_prompt(filename: str) -> str:
        path = os.path.join(_PROMPT_DIR, filename)
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    @staticmethod
    def _refusal(reason: str) -> dict:
        messages = {
            "insufficient_context": (
                "I don't have sufficient information in my knowledge base "
                "to answer this question accurately."
            ),
            "outside_scope": "This question is outside the scope of this system.",
            "ambiguous_question": (
                "The question is too ambiguous to provide a reliable answer. "
                "Please rephrase with more specifics."
            ),
        }
        return {
            "answer": messages.get(reason, messages["insufficient_context"]),
            "citations": [],
            "confidence": "none",
            "is_refusal": True,
            "refusal_reason": reason,
        }

    @staticmethod
    def _parse_response(content: str) -> dict:
        """Parse the LLM JSON response, handling markdown fences."""
        text = content.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            text = "\n".join(lines)

        try:
            parsed = json.loads(text)
            # Ensure required keys exist
            parsed.setdefault("answer", "")
            parsed.setdefault("citations", [])
            parsed.setdefault("confidence", "low")
            parsed.setdefault("is_refusal", False)
            parsed.setdefault("refusal_reason", None)
            return parsed
        except json.JSONDecodeError:
            logger.warning("LLM returned non-JSON RAG answer; wrapping.")
            return {
                "answer": text[:1000],
                "citations": [],
                "confidence": "low",
                "is_refusal": False,
                "refusal_reason": None,
                "raw_response": True,
            }
