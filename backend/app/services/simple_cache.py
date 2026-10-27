"""
In-Memory Cache Service with TTL (Time-To-Live) for High-Frequency Endpoints.
Prevents disk I/O, polygon re-parsing, and remote scraping bursts under rapid client polling.
"""

import time
from typing import Any, Dict, Tuple, Optional

class SimpleMemoryCache:
    def __init__(self, default_ttl_seconds: int = 35):
        self._cache: Dict[str, Tuple[float, Any]] = {}
        self._default_ttl = default_ttl_seconds

    def get(self, key: str) -> Optional[Any]:
        entry = self._cache.get(key)
        if not entry:
            return None
        expires_at, value = entry
        if time.time() > expires_at:
            self._cache.pop(key, None)
            return None
        return value

    def set(self, key: str, value: Any, ttl: Optional[int] = None):
        expire_ttl = ttl if ttl is not None else self._default_ttl
        self._cache[key] = (time.time() + expire_ttl, value)

    def clear(self):
        self._cache.clear()

memory_cache = SimpleMemoryCache(default_ttl_seconds=35)
