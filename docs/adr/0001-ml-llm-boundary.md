# ADR-0001: ML / LLM boundary

- Status: Accepted
- Date: 2026-08-06

## Context

Zenith produces numeric Predictions and financial/engineering figures that Users may treat as decision inputs. LLMs (Gemini) are used for explanation, RAG Q&A, and portfolio narrative.

## Decision

1. **Predictions are ML-only.** Routes and services that emit irradiance Predictions (and deterministic financial/physics/recommendation numbers) must not use an LLM to generate or alter those numbers.
2. **LLMs explain, ask, or summarize with grounding — or refuse.** `/explain`, `/ask`, and portfolio insights may narrate only over provided or retrieved context. Prefer grounded, data-backed answers; degrade gracefully on quota/unavailable rather than inventing content.
3. **Degrade, don’t invent.** If the LLM fails, numeric Analysis results still return; explanation may be marked degraded.
4. **RAG is product-on.** Knowledge-base Q&A is intended to be available in deployments that showcase the product; when RAG or the API quota fails, the UI must state unavailability clearly — never fake answers.

## Consequences

- Frontend and agents must never ask an LLM to “recompute” a Prediction.
- Prompts in `backend/prompts/` encode this boundary.
- RAG may be unavailable (503) without changing ML behavior.

## Related

- `backend/docs/adr/0002-render-lite-dependencies.md`
- `backend/docs/adr/0003-gemini-rag-embeddings.md`
- `docs/context/api.md`
