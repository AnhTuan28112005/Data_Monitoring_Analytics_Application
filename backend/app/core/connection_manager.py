"""WebSocket and SSE broadcast manager.

Maintains lists of connected WebSocket clients per channel (e.g. 'market', 'alerts')
and provides asyncio.Queue based fan-out for SSE subscribers.
"""
from __future__ import annotations

import asyncio
import json
from collections import defaultdict
from typing import Dict, List, Set

from fastapi import WebSocket
from loguru import logger


class ConnectionManager:
    def __init__(self) -> None:
        self._sockets: Dict[str, List[WebSocket]] = defaultdict(list)
        self._sse_queues: Dict[str, Set[asyncio.Queue]] = defaultdict(set)
        self._lock = asyncio.Lock()

    # ---------- WebSocket ----------
    async def connect(self, channel: str, ws: WebSocket) -> None:
        await ws.accept()
        async with self._lock:
            self._sockets[channel].append(ws)
        logger.info(f"WS connected channel={channel} total={len(self._sockets[channel])}")

    async def disconnect(self, channel: str, ws: WebSocket) -> None:
        async with self._lock:
            if ws in self._sockets[channel]:
                self._sockets[channel].remove(ws)
        logger.info(f"WS disconnected channel={channel}")

    async def broadcast(self, channel: str, payload: dict) -> None:
        if not self._sockets.get(channel):
            return
        message = json.dumps(payload, default=str)
        dead: List[WebSocket] = []
        for ws in list(self._sockets[channel]):
            try:
                await ws.send_text(message)
            except Exception as exc:  # noqa: BLE001
                logger.debug(f"WS send failed: {exc}")
                dead.append(ws)
        if dead:
            async with self._lock:
                for ws in dead:
                    if ws in self._sockets[channel]:
                        self._sockets[channel].remove(ws)

    # ---------- SSE ----------
    def subscribe_sse(self, channel: str) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=200)
        self._sse_queues[channel].add(q)
        return q

    def unsubscribe_sse(self, channel: str, q: asyncio.Queue) -> None:
        self._sse_queues[channel].discard(q)

    async def publish_sse(self, channel: str, payload: dict) -> None:
        for q in list(self._sse_queues.get(channel, [])):
            try:
                if q.full():
                    # Drop oldest to keep latest events
                    try:
                        q.get_nowait()
                    except asyncio.QueueEmpty:
                        pass
                await q.put(payload)
            except Exception as exc:  # noqa: BLE001
                logger.debug(f"SSE publish failed: {exc}")


manager = ConnectionManager()
