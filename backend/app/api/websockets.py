"""WebSocket endpoints for the real-time dashboard."""
from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from loguru import logger

from app.core.cache import prices_cache
from app.core.connection_manager import manager
from app.services.market_service import market_service

router = APIRouter()


@router.websocket("/ws/market")
async def ws_market(ws: WebSocket):
    """Live price snapshot stream.

    Clients receive JSON messages of the form:
        { "type": "snapshot", "ticks": [PriceTick, ...] }
    or
        { "type": "tick", "tick": PriceTick }

    Clients may send `{"action": "ping"}` to keep the connection alive.
    """
    await manager.connect("market", ws)
    try:
        # Send initial snapshot from cache so the UI paints immediately.
        cached = [prices_cache.get(k) for k in prices_cache.keys()]
        cached = [c for c in cached if c]
        if cached:
            await ws.send_text(json.dumps({"type": "snapshot", "ticks": cached}, default=str))
        while True:
            try:
                msg = await asyncio.wait_for(ws.receive_text(), timeout=30.0)
                # Echo simple pings so the heartbeat works for both directions.
                if msg:
                    try:
                        data = json.loads(msg)
                    except Exception:
                        data = {"raw": msg}
                    if data.get("action") == "ping":
                        await ws.send_text(json.dumps({"type": "pong"}))
            except asyncio.TimeoutError:
                await ws.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.debug(f"ws/market error: {exc}")
    finally:
        await manager.disconnect("market", ws)


@router.websocket("/ws/alerts")
async def ws_alerts(ws: WebSocket):
    """Live alerts stream — same payloads as the SSE channel."""
    await manager.connect("alerts", ws)
    try:
        while True:
            try:
                await asyncio.wait_for(ws.receive_text(), timeout=30.0)
            except asyncio.TimeoutError:
                await ws.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect("alerts", ws)
