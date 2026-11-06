# ADR-0005: Lightweight SQLite Vector Store, BYOK Security Seam, and Dual Compute Profiles

- Status: Accepted
- Date: 2026-11-03
- Implementation note (2026-11-06): no embeddings are stored in `rag_index.sqlite`, so retrieval is BM25 only; dense blending activates once every chunk has an embedding. Primary deploy host is Hugging Face Spaces (`docs/context/deploy.md`).

## Context

1. **Free-Tier RAM Exhaustion**: Even after removing PyTorch in ADR-0002/0003, loading `chromadb` + `hnswlib` C++ bindings in Python consumes ~200–250 MB of RSS for fewer than 150 document chunks, risking OOM kills on Render's 512 MB free tier alongside scikit-learn and Gunicorn.
2. **API Quota & Key Privacy**: Exposing a public deployment backed by a single server `GEMINI_API_KEY` invites quota exhaustion, while power users and evaluators want to bring their own Gemini API key (`BYOK`) without risking key leakage in URLs or server logs.
3. **Local GPU vs Cloud CPU**: Developers running locally on Windows 11 with an NVIDIA GPU (e.g., RTX 3050 Ti 4GB VRAM) benefit from GPU-accelerated local model training/inference and Docker profiles, whereas cloud free tiers run CPU-only.

## Decision

1. **Zero-Bloat `LiteVectorStore` (`backend/rag/lite_store.py`)**:
   - Store document chunks, section metadata, and pre-computed embedding vectors in a lightweight SQLite database (`backend/rag/rag_index.sqlite`) and compute top-k cosine similarity via NumPy (`np.dot`).
   - Memory footprint drops from ~250 MB (Chroma/HNSW) to **<5 MB**, with sub-millisecond retrieval for up to 10,000 chunks and zero C++ vector-DB binary dependencies required in production.
   - Keep LangChain Chroma as an optional fallback only if explicitly configured, while making `LiteVectorStore` the default primary store.
2. **BYOK Header Seam & Sliding-Window Quota Guard (`backend/utils/security.py`)**:
   - Accept optional `X-Gemini-Api-Key` HTTP header on `/analyze`, `/stream-plan`, `/explain`, `/ask`, `/portfolio-insights`, and `POST /validate-key`.
   - Never pass API keys in URL query strings, never log `X-Gemini-Api-Key`, and never persist it on the server.
   - When `X-Gemini-Api-Key` is absent, use `Config.GEMINI_API_KEY` protected by an per-IP sliding-window rate limiter (`30 requests / hour`).
3. **Dual Compute Profile (`COMPUTE_DEVICE=auto|cuda|cpu` + Docker Compose)**:
   - Provide `Dockerfile` and `docker-compose.yml` supporting both a default lightweight CPU profile and an opt-in `--profile gpu` NVIDIA CUDA passthrough profile for local 4GB+ VRAM GPUs.

## Consequences

- Product-on RAG and Agentic `/ask` work reliably on 512 MB cloud free tiers right out of the box because `rag_index.sqlite` ships pre-indexed and uses NumPy for cosine similarity.
- Users can seamlessly switch between System Key and BYOK in the UI.
