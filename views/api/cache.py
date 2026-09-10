"""
Small in-process TTL cache for inexpensive reuse of backend command results.
"""
import time
from threading import Event, Lock


class TTLCache:
    def __init__(self):
        self._entries = {}
        self._inflight = {}
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
        now = time.monotonic()
        with self._lock:
            entry = self._entries.get(key)
            if entry:
                expires_at, value = entry
                if expires_at > now:
                    return value
                self._entries.pop(key, None)

            state = self._inflight.get(key)
            if state is None:
                state = {"event": Event(), "value": None, "error": None}
                self._inflight[key] = state
                is_loader = True
            else:
                is_loader = False

        if not is_loader:
            state["event"].wait()
            if state["error"] is not None:
                raise state["error"]
            return state["value"]

        try:
            value = loader()
        except BaseException as error:
            with self._lock:
                state["error"] = error
                self._inflight.pop(key, None)
                state["event"].set()
            raise

        with self._lock:
            if ttl_seconds > 0:
                self._entries[key] = (time.monotonic() + ttl_seconds, value)
            state["value"] = value
            self._inflight.pop(key, None)
            state["event"].set()
        return value

    def invalidate_matching(self, predicate):
        with self._lock:
            keys = [key for key in self._entries if predicate(key)]
            for key in keys:
                self._entries.pop(key, None)

        return len(keys)
