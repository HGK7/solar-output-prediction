# syntax=docker/dockerfile:1
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=5000 \
    FLASK_DEBUG=false \
    PHYSICS_MODE=analytical \
    ENABLE_RAG_GROUNDING=true \
    REQUIRE_PRETRAINED_MODELS=true \
    COMPUTE_DEVICE=auto \
    SYSTEM_KEY_HOURLY_LIMIT=30

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Hugging Face Spaces runs containers as uid 1000; SQLite needs write access to rag/.
RUN useradd -m -u 1000 user
WORKDIR /app

COPY --chown=user requirements.txt ./
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY --chown=user . .
USER user

# Pre-train ML models and pre-build the SQLite RAG index
RUN python scripts/train_models.py && \
    python -c "from rag.lite_store import get_lite_store; get_lite_store().ensure_synced()"

EXPOSE 5000

CMD ["gunicorn", "-c", "gunicorn.conf.py", "app:app"]
