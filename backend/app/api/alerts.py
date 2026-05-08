"""Alerts REST + SSE endpoints."""
from __future__ import annotations

import asyncio
import json
from typing import AsyncGenerator, List

from fastapi import APIRouter, Query, Request
from sse_starlette.sse import EventSourceResponse

from app.core.connection_manager import manager
from app.models.schemas import Alert
from app.services.alert_service import alert_service
from app.services.news_service import news_service
from app.models.schemas import NewsItem

router = APIRouter(tags=["alerts"])


@router.get("/api/alerts/recent", response_model=List[Alert])
async def recent_alerts(n: int = Query(50, ge=1, le=300)):
    return alert_service.recent(n)


@router.get("/api/news", response_model=List[NewsItem])
async def get_news(limit: int = Query(30, ge=1, le=100)):
    return await news_service.fetch_all(limit)


@router.get("/sse/alerts")
async def sse_alerts(request: Request):
    """Server-Sent Events stream of live alerts.

    Each event is a JSON-encoded `Alert`.  Frontend can use the native
    EventSource API.
    """
    queue = manager.subscribe_sse("alerts")

    async def event_gen() -> AsyncGenerator[dict, None]:
        try:
            # Replay last 10 alerts so newly-connected clients aren't blank.
            for a in alert_service.recent(10):
                yield {"event": "alert", "data": json.dumps(a.model_dump(mode="json"), default=str)}
            while True:
                if await request.is_disconnected():
                    break
                try:
                    payload = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield {"event": "alert", "data": json.dumps(payload, default=str)}
                except asyncio.TimeoutError:
                    # Heartbeat keeps proxies from closing the connection.
                    yield {"event": "ping", "data": "keepalive"}
        finally:
            manager.unsubscribe_sse("alerts", queue)

    return EventSourceResponse(event_gen())
