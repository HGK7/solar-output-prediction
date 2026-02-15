# Gunicorn configuration for production deployment
# Start with: gunicorn app:app

import multiprocessing
import os

# Server socket
bind = f"0.0.0.0:{os.environ.get('PORT', '5000')}"

# Worker processes
workers = min(multiprocessing.cpu_count() * 2 + 1, 4)  # Cap at 4 for MVP
worker_class = "gthread"
threads = 2

# Timeout (longer for model loading on cold start)
timeout = 120
graceful_timeout = 30
keepalive = 5

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"

# Preload app to share model memory across workers
preload_app = True

# Restart workers after this many requests (prevent memory leaks)
max_requests = 1000
max_requests_jitter = 50
