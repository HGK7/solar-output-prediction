# ADR-0002: Render lite dependency profile

## Status

Accepted

## Context

Render free tier (~512 MB) cannot host sklearn + PySAM + sentence-transformers/torch + Chroma at once. Runtime gating (`ENABLE_RAG_GROUNDING=false`, `PHYSICS_MODE=analytical`) avoids loading heavy stacks per request, but `pip install` still pulled torch via `sentence-transformers` in `requirements.txt`, inflating slug size and boot RSS.

## Decision

- **Production (`requirements.txt`)**: Flask, sklearn inference, `google-genai` for explanations only. No RAG packages.
- **RAG extras (`requirements-rag.txt`)**: chromadb, langchain-google-genai (Gemini embeddings API — no torch). Installed locally via `requirements-dev.txt`. See ADR-0003.
- **`/ask` and RAG grounding** on Render without RAG extras return 503 with install instructions; explanations use prediction context only.
- **Analysis orchestration** consolidated in `AnalysisPipeline` so memory policy (serial stages) is not duplicated across routes.

## Consequences

- Local full profile: `pip install -r requirements-dev.txt` (includes RAG + optional PySAM).
- Re-enabling RAG on a paid host requires adding `requirements-rag.txt` to the deploy build and setting `ENABLE_RAG_GROUNDING=true`.
- Does not contradict ADR-0001: ML predictions unchanged; RAG remains language/retrieval only.
