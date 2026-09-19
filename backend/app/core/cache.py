"""Simple thread-safe in-memory TTL cache.

Everything stays in this process: no database, no persistence, no personal data.

Entries are evicted in three ways so memory stays bounded even for keys that
are never read again (unique search queries, backtest parameter combos):
1. Lazy: a get() on an expired key removes it.
2. Periodic: every _SWEEP_EVERY writes, all expired entries are swept.
3. Cap: when the store exceeds _MAX_ENTRIES, soonest-to-expire entries are
dropped first.
"""

from __future__ import annotations

import threading
import time
from typing import Any

_MAX_ENTRIES = 20_000
_SWEEP_EVERY = 256


class TTLCache:
    def __init__(self) -> None:
        self._store: dict[str, tuple[float, Any]] = {}
        self._lock = threading.Lock()
        self._sets = 0

    def get(self, key: str) -> Any:
        with self._lock:
            item = self._store.get(key)
            if item is None:
                return None
            expires_at, value = item
            if expires_at < time.monotonic():
                del self._store[key]
                return None
            return value

    def set(self, key: str, value: Any, ttl: float) -> None:
        with self._lock:
            self._store[key] = (time.monotonic() + ttl, value)
            self._sets += 1
            if self._sets % _SWEEP_EVERY == 0 or len(self._store) > _MAX_ENTRIES:
                self._sweep_locked()

    def _sweep_locked(self) -> None:
        """Drop expired entries, then enforce the cap (soonest-expiry first)."""
        now = time.monotonic()
        for key in [k for k, (expires_at, _) in self._store.items() if expires_at < now]:
            del self._store[key]
        if len(self._store) > _MAX_ENTRIES:
            overflow = len(self._store) - _MAX_ENTRIES
            for key, _ in sorted(self._store.items(), key=lambda kv: kv[1][0])[:overflow]:
                del self._store[key]

    def clear(self) -> None:
        with self._lock:
            self._store.clear()


cache = TTLCache()
