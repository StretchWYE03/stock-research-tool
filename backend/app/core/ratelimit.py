"""In-memory sliding-window rate limiter.

Applies to every endpoint (global guard) plus per-route buckets, keyed by client
IP. No external dependency, no persistent state, nothing leaves this process.
"""

from __future__ import annotations

import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request


class RateLimiter:
    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()
        self._checks = 0

    def _sweep(self, now: float, window: float) -> None:
        """Drop long-idle buckets so memory stays bounded."""
        idle_cutoff = now - window * 10
        for key in [k for k, bucket in self._hits.items() if not bucket or bucket[-1] < idle_cutoff]:
            del self._hits[key]

    def check(self, key: str, limit: int, window: float = 60.0) -> None:
        now = time.monotonic()
        with self._lock:
            self._checks += 1
            if self._checks % 500 == 0:
                self._sweep(now, window)
            bucket = self._hits[key]
            while bucket and bucket[0] < now - window:
                bucket.popleft()
            if len(bucket) >= limit:
                retry = max(1, int(window - (now - bucket[0])) + 1)
                raise HTTPException(
                    status_code=429,
                    detail=f"Rate limit exceeded. Retry in {retry}s.",
                    headers={"Retry-After": str(retry)},
                )
            bucket.append(now)


limiter = RateLimiter()


def client_key(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def rate_limit(limit: int = 30, window: float = 60.0, scope: str = "path"):
    """FastAPI dependency that rate-limits per client IP.

    scope="path": separate bucket per route (default).
    scope="ip":   single shared bucket per client IP.
    """

    def dependency(request: Request) -> None:
        ip = client_key(request)
        if scope == "ip":
            limiter.check(f"ip:{ip}", limit, window)
        else:
            limiter.check(f"{request.url.path}:{ip}", limit, window)

    return dependency
