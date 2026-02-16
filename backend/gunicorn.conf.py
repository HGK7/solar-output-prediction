# Gunicorn configuration for production deployment
# Start with: gunicorn app:app
#
# Memory-optimised for Render free tier (512 MB RAM).
# Heavy dependencies (sentence-transformers, ChromaDB) are lazy-loaded,
# so a single worker can serve prediction/explain requests immediately
# while RAG loads only on first /ask call.

import os

# Server socket
bind = f"0.0.0.0:{os.environ.get('PORT', '5000')}"

# Worker processes — single worker to stay within free-tier memory
workers = 1
worker_class = "gthread"
threads = 2

# Timeout (longer for model loading + lazy RAG init on first call)
timeout = 180
graceful_timeout = 30
keepalive = 5

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"

# Do NOT preload — let the worker load app in its own process to
# avoid doubling memory during fork.
preload_app = False

# Restart workers after this many requests (prevent memory leaks)
max_requests = 1000
max_requests_jitter = 50
