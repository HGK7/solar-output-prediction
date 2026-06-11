# ADR-0003: Gemini API embeddings for RAG

## Status

Accepted

## Context

Local HuggingFace embeddings (`sentence-transformers` / `all-MiniLM-L6-v2`) pulled PyTorch into the deploy image (~500MB+) even when RAG was runtime-gated. Render free tier cannot host torch + sklearn + Chroma reliably.

LangChain documents RAG as three swappable components: chat model, embeddings model, vector store ([RAG tutorial](https://docs.langchain.com/oss/python/langchain/rag)).

## Decision

- Use **`GoogleGenerativeAIEmbeddings`** (`models/gemini-embedding-001`) via existing `GEMINI_API_KEY`.
- Shared factory: `services/rag_embeddings.py` — used by `RAGService`, ingest scripts, and `rag/vectorstore.py`.
- New Chroma collection default: **`solar_science_gemini`** — old `solar_science` (MiniLM vectors) incompatible; re-ingest required.
- Remove `sentence-transformers` / `langchain-huggingface` from `requirements-rag.txt`.

## Consequences

- RAG on Render needs `requirements-rag.txt` + `GEMINI_API_KEY` + re-ingested `chroma_db` — still no torch.
- Embedding calls are network-bound; cache explanations separately (already done).
- Does not contradict ADR-0001 or ADR-0002.
