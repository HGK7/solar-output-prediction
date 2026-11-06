"""
Security & BYOK (Bring Your Own Key) trust-boundary utilities.

Responsibilities:
- Extract optional `X-Gemini-Api-Key` header without logging or storing it.
- Enforce per-IP sliding-window rate limits when using the server's System GEMINI_API_KEY.
- Sanitize untrusted user strings before interpolating into LLM prompts.
"""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass
import re
import threading
import time
from typing import Mapping

from config import Config


class QuotaExceededError(Exception):
    """Raised when an IP exceeds the free System Key rate limit."""

    def __init__(self, message: str, retry_after_seconds: int = 3600):
        self.message = message
        self.retry_after_seconds = retry_after_seconds
        super().__init__(message)


@dataclass(frozen=True)
class ResolvedGeminiKey:
    """Resolved Gemini API key for a single request."""

    api_key: str
    key_source: str  # "byok" | "system" | "none"
    remaining_system_quota: int | None = None


class SlidingWindowRateLimiter:
    """Thread-safe in-memory per-IP sliding-window rate limiter for System Key calls."""

    def __init__(self, max_requests: int = 30, window_seconds: int = 3600):
        self.max_requests = max(1, int(max_requests))
        self.window_seconds = max(1, int(window_seconds))
        self._lock = threading.Lock()
        self._hits: dict[str, deque[float]] = {}

    def _prune(self, bucket: deque[float], now: float) -> None:
        cutoff = now - self.window_seconds
        while bucket and bucket[0] <= cutoff:
            bucket.popleft()

    def status(self, client_ip: str) -> dict[str, int | bool]:
        now = time.monotonic()
        ip = (client_ip or "unknown").strip()[:64]
        with self._lock:
            bucket = self._hits.get(ip)
            if not bucket:
                return {
                    "allowed": True,
                    "remaining": self.max_requests,
                    "limit": self.max_requests,
                    "retry_after_seconds": 0,
                }
            self._prune(bucket, now)
            used = len(bucket)
            remaining = max(0, self.max_requests - used)
            retry_after = (
                int(max(1.0, self.window_seconds - (now - bucket[0])))
                if used >= self.max_requests and bucket
                else 0
            )
            return {
                "allowed": used < self.max_requests,
                "remaining": remaining,
                "limit": self.max_requests,
                "retry_after_seconds": retry_after,
            }

    def check_and_record(self, client_ip: str) -> dict[str, int | bool]:
        now = time.monotonic()
        ip = (client_ip or "unknown").strip()[:64]
        with self._lock:
            bucket = self._hits.setdefault(ip, deque())
            self._prune(bucket, now)
            if len(bucket) >= self.max_requests:
                retry_after = int(max(1.0, self.window_seconds - (now - bucket[0])))
                return {
                    "allowed": False,
                    "remaining": 0,
                    "limit": self.max_requests,
                    "retry_after_seconds": retry_after,
                }
            bucket.append(now)
            remaining = max(0, self.max_requests - len(bucket))
            return {
                "allowed": True,
                "remaining": remaining,
                "limit": self.max_requests,
                "retry_after_seconds": 0,
            }

    def require_quota(self, client_ip: str) -> int:
        res = self.check_and_record(client_ip)
        if not res["allowed"]:
            raise QuotaExceededError(
                "System API key rate limit reached for this hour. "
                "Add your own Gemini API key (BYOK) in Settings to continue without limits.",
                retry_after_seconds=int(res["retry_after_seconds"]),
            )
        return int(res["remaining"])


# Singleton rate limiter for the server's System GEMINI_API_KEY
SYSTEM_KEY_RATE_LIMITER = SlidingWindowRateLimiter(
    max_requests=int(getattr(Config, "SYSTEM_KEY_HOURLY_LIMIT", 30)),
    window_seconds=3600,
)


def extract_client_ip(headers: Mapping[str, str], remote_addr: str | None = None) -> str:
    """Extract client IP safely (first hop of X-Forwarded-For or remote_addr)."""
    forwarded = headers.get("X-Forwarded-For") or headers.get("x-forwarded-for")
    if forwarded:
        first_ip = forwarded.split(",")[0].strip()
        if first_ip:
            return first_ip[:64]
    return (remote_addr or "127.0.0.1").strip()[:64]


def resolve_gemini_key(
    headers: Mapping[str, str],
    client_ip: str = "127.0.0.1",
    rate_limiter: SlidingWindowRateLimiter | None = None,
    consume_quota: bool = True,
) -> ResolvedGeminiKey:
    """
    Resolve the Gemini API key for the current request:
    1. If `X-Gemini-Api-Key` header is present and non-empty, use it (BYOK) and bypass system rate limits.
    2. Otherwise, use `Config.GEMINI_API_KEY` and enforce the per-IP sliding-window rate limit.
    """
    raw_byok = (
        headers.get("X-Gemini-Api-Key")
        or headers.get("x-gemini-api-key")
        or ""
    ).strip()

    if raw_byok:
        if len(raw_byok) < 12 or len(raw_byok) > 256 or any(c.isspace() for c in raw_byok):
            raise ValueError("Invalid X-Gemini-Api-Key header format.")
        return ResolvedGeminiKey(
            api_key=raw_byok,
            key_source="byok",
            remaining_system_quota=None,
        )

    system_key = (Config.GEMINI_API_KEY or "").strip()
    if not system_key:
        return ResolvedGeminiKey(
            api_key="",
            key_source="none",
            remaining_system_quota=0,
        )

    limiter = rate_limiter or SYSTEM_KEY_RATE_LIMITER
    if consume_quota:
        remaining = limiter.require_quota(client_ip)
    else:
        remaining = int(limiter.status(client_ip)["remaining"])

    return ResolvedGeminiKey(
        api_key=system_key,
        key_source="system",
        remaining_system_quota=remaining,
    )


def sanitize_untrusted_text(text: str | None, max_len: int = 500) -> str:
    """Strip XML delimiter tags, control chars, and bound length on user context."""
    if not text:
        return ""
    cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", " ", str(text))
    cleaned = re.sub(r"</?untrusted_[^>]*>", "", cleaned, flags=re.IGNORECASE)
    cleaned = " ".join(cleaned.split())
    return cleaned[:max_len]
