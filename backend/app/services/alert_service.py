"""Alert engine.

Subscribes to the price/OHLCV polling loops via the AlertService.process()
method and emits structured Alert objects. Alerts are:
 - cached for REST replay
 - broadcast to the 'alerts' WebSocket channel
 - published to all SSE subscribers
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from loguru import logger

from app.core.cache import alerts_cache, tick_history
from app.core.connection_manager import manager
from app.models.schemas import Alert, PriceTick


class AlertService:
    def __init__(self) -> None:
        # symbol -> last alert timestamp; used to throttle duplicate alerts.
        self._cooldown: dict[str, float] = {}
        self._cooldown_seconds = 60.0

    # ------------------------------------------------------------------
    async def process_tick(self, tick: PriceTick) -> None:
        key = f"{tick.asset_class}:{tick.symbol}"
        prev_window = tick_history.window(key)
        # Push current tick first so subsequent windows include it.
        tick_history.push(key, {
            "price": tick.price,
            "volume": tick.volume_24h,
            "ts": tick.timestamp.timestamp(),
        })
        await self._check_short_window_spike(key, tick, prev_window)

    async def _check_short_window_spike(self, key: str, tick: PriceTick, history: List[dict]) -> None:
        """5-minute rolling spike detection vs first sample inside the 5m window."""
        now = tick.timestamp.timestamp()
        five_min_ago = now - 300
        window = [h for h in history if h["ts"] >= five_min_ago]
        if not window:
            return
        baseline = window[0]["price"]
        if not baseline:
            return
        pct = (tick.price - baseline) / baseline * 100.0
        if abs(pct) >= 3.0:
            await self._emit(Alert(
                id=str(uuid.uuid4()),
                type="price_spike" if pct > 0 else "price_drop",
                severity="critical" if abs(pct) >= 6 else "warning",
                symbol=tick.symbol,
                asset_class=tick.asset_class,
                message=f"{tick.symbol} moved {pct:+.2f}% in last 5 minutes.",
                detail={"window_minutes": 5, "move_pct": round(pct, 3), "price": tick.price},
                timestamp=datetime.now(timezone.utc),
            ))

    # ------------------------------------------------------------------
    async def emit_pattern(self, tick: PriceTick, pattern_type: str, severity: str,
                           message: str, detail: dict) -> None:
        await self._emit(Alert(
            id=str(uuid.uuid4()),
            type=pattern_type,  # type: ignore[arg-type]
            severity=severity,  # type: ignore[arg-type]
            symbol=tick.symbol,
            asset_class=tick.asset_class,
            message=message,
            detail=detail,
            timestamp=datetime.now(timezone.utc),
        ))

    async def emit_news_event(self, title: str, source: str, url: str) -> None:
        await self._emit(Alert(
            id=str(uuid.uuid4()),
            type="news",
            severity="info",
            symbol=None,
            asset_class=None,
            message=title,
            detail={"source": source, "url": url},
            timestamp=datetime.now(timezone.utc),
        ))

    # ------------------------------------------------------------------
    async def _emit(self, alert: Alert) -> None:
        # Throttle duplicates per (symbol, type)
        cd_key = f"{alert.symbol}:{alert.type}"
        ts = alert.timestamp.timestamp()
        last = self._cooldown.get(cd_key, 0.0)
        if ts - last < self._cooldown_seconds:
            return
        self._cooldown[cd_key] = ts

        alerts_cache.push("alerts", alert.model_dump(mode="json"))
        payload = alert.model_dump(mode="json")
        try:
            await manager.broadcast("alerts", payload)
            await manager.publish_sse("alerts", payload)
        except Exception as exc:
            logger.debug(f"alert broadcast failed: {exc}")

    # ------------------------------------------------------------------
    def recent(self, n: int = 50) -> List[Alert]:
        return [Alert(**a) for a in alerts_cache.window("alerts", n)]


alert_service = AlertService()
