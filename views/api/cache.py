"""
Small in-process TTL cache for inexpensive reuse of backend command results.
"""
import time
from threading import Lock


class TTLCache:
    def __init__(self):
        self._entries = {}
        self._lock = Lock()

    def get(self, key):
        now = time.monotonic()
        with self._lock:
            entry = self._entries.get(key)
            if not entry:
                return None

            expires_at, value = entry
            if expires_at <= now:
                self._entries.pop(key, None)
                return None

            return value

    def set(self, key, value, ttl_seconds):
        if ttl_seconds <= 0:
            return value

        with self._lock:
            self._entries[key] = (time.monotonic() + ttl_seconds, value)

        return value

    def get_or_set(self, key, ttl_seconds, loader):
        cached = self.get(key)
        if cached is not None:
            return cached

        value = loader()
        return self.set(key, value, ttl_seconds)

    def invalidate_matching(self, predicate):
        with self._lock:
            keys = [key for key in self._entries if predicate(key)]
            for key in keys:
                self._entries.pop(key, None)

        return len(keys)
