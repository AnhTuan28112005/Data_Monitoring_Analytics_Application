"""In-memory cache used to store the latest snapshots of market data so the
REST endpoints can serve immediately and the WebSocket loop can diff against
previous values to detect spikes/whales.
"""
from __future__ import annotations

import threading
import time
from collections import deque
from typing import Any, Deque, Dict, Optional


class TTLStore:
    """Thread-safe key-value cache with optional TTL semantics."""

    def __init__(self) -> None:
        self._data: Dict[str, tuple[Any, float]] = {}
        self._lock = threading.RLock()

    def set(self, key: str, value: Any, ttl: Optional[float] = None) -> None:
        with self._lock:
            expiry = time.time() + ttl if ttl else 0.0
            self._data[key] = (value, expiry)

    def get(self, key: str, default: Any = None) -> Any:
        with self._lock:
            item = self._data.get(key)
            if item is None:
                return default
            value, expiry = item
            if expiry and time.time() > expiry:
                self._data.pop(key, None)
                return default
            return value

    def delete(self, key: str) -> None:
        with self._lock:
            self._data.pop(key, None)

    def keys(self):
        with self._lock:
            return list(self._data.keys())


class HistoryStore:
    """Bounded ring buffer of recent ticks for spike/whale detection."""

    def __init__(self, maxlen: int = 240) -> None:
        self._buffers: Dict[str, Deque[Dict[str, Any]]] = {}
        self._maxlen = maxlen
        self._lock = threading.RLock()

    def push(self, key: str, tick: Dict[str, Any]) -> None:
        with self._lock:
            buf = self._buffers.setdefault(key, deque(maxlen=self._maxlen))
            buf.append(tick)

    def latest(self, key: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            buf = self._buffers.get(key)
            return buf[-1] if buf else None

    def window(self, key: str, n: Optional[int] = None) -> list:
        with self._lock:
            buf = self._buffers.get(key, deque())
            return list(buf)[-n:] if n else list(buf)


# Singletons --------------------------------------------------------------
prices_cache = TTLStore()      # key: "<assetClass>:<symbol>" -> price dict
ohlcv_cache = TTLStore()       # key: "<assetClass>:<symbol>:<tf>" -> list[ohlcv]
news_cache = TTLStore()        # key: "news" -> list
alerts_cache = HistoryStore(maxlen=300)  # key: "alerts" -> recent alerts feed
tick_history = HistoryStore(maxlen=240)  # per-symbol short rolling history
forecast_cache = TTLStore()    # key: "<symbol>:<tf>" -> list[ForecastPoint dicts]
