"""Background polling loops.

* `price_loop`     - polls all asset prices, caches, broadcasts via WS,
                     feeds the alert engine for spike detection.
                     Persists price snapshots every PRICE_DB_INTERVAL seconds.
* `pattern_loop`   - periodically pulls OHLCV and runs ML pattern detectors;
                     emits FOMO / divergence / whale alerts.
* `news_loop`      - refreshes the macro news feed and emits a single
                     'news' alert per fresh entry.
* `insight_loop`   - rebuilds the daily insight report periodically so the
                     `/api/insights/daily` endpoint stays warm.
"""
from __future__ import annotations

import asyncio
import time
from typing import Set

from loguru import logger

from app.core.cache import news_cache
from app.core.config import settings
from app.core.connection_manager import manager
from app.core.database import get_session
from app.services.persistence_service import PersistenceService
from app.ml.pattern_recognition import scan_patterns
from app.services.alert_service import alert_service
from app.services.crypto_service import crypto_service
from app.services.insight_service import insight_service
from app.services.market_service import market_service
from app.services.news_service import news_service


# Throttle DB writes so we don't insert every 5 seconds (too much data).
# Save price snapshots every 60 seconds instead.
_PRICE_DB_INTERVAL = 60
_last_price_db_write: float = 0.0


async def price_loop() -> None:
    global _last_price_db_write
    while True:
        try:
            ticks = await market_service.fetch_all_prices()
            payload = {"type": "snapshot", "ticks": [t.model_dump(mode="json") for t in ticks]}
            await manager.broadcast("market", payload)

            # --- Persist to DB (throttled) ---
            now = time.time()
            if now - _last_price_db_write >= _PRICE_DB_INTERVAL:
                _last_price_db_write = now
                await asyncio.to_thread(_persist_price_ticks, ticks)

            for t in ticks:
                await alert_service.process_tick(t)
        except Exception as exc:
            logger.warning(f"price_loop error: {exc}")
        await asyncio.sleep(settings.PRICE_POLL_INTERVAL)


def _persist_price_ticks(ticks):
    """Run in a thread to avoid blocking the event loop."""
    db = get_session()
    if db is None:
        return
    try:
        PersistenceService.save_price_ticks(db, ticks)
    finally:
        db.close()


async def pattern_loop() -> None:
    """Run pattern detection on top crypto symbols using 1m and 1h frames."""
    while True:
        try:
            for sym in settings.CRYPTO_SYMBOLS[:6]:
                df_1m = await crypto_service.ohlcv_dataframe(sym, "1m", 60)
                df_1h = await crypto_service.ohlcv_dataframe(sym, "1h", 120)

                from app.core.cache import prices_cache
                tick_dict = prices_cache.get(f"crypto:{sym}")
                if not tick_dict:
                    continue
                from app.models.schemas import PriceTick
                tick = PriceTick(**tick_dict)

                for df in (df_1m, df_1h):
                    if df.empty:
                        continue
                    for p in scan_patterns(df):
                        await alert_service.emit_pattern(
                            tick=tick,
                            pattern_type=p.type,
                            severity=p.severity,
                            message=p.message,
                            detail=p.detail,
                        )
                        # Persist alert in background thread
                        await asyncio.to_thread(
                            _persist_alert,
                            {
                                "symbol": tick.symbol,
                                "asset_class": tick.asset_class,
                                "alert_type": p.type,
                                "severity": p.severity,
                                "message": p.message,
                                "detail": p.detail,
                            },
                        )
        except Exception as exc:
            logger.warning(f"pattern_loop error: {exc}")
        await asyncio.sleep(settings.OHLCV_POLL_INTERVAL)


def _persist_alert(alert_data: dict):
    db = get_session()
    if db is None:
        return
    try:
        PersistenceService.save_alert(db, alert_data)
    finally:
        db.close()


async def news_loop() -> None:
    seen: Set[str] = set()
    while True:
        try:
            items = await news_service.fetch_all(limit=30)
            news_cache.set("news", [i.model_dump(mode="json") for i in items])
            new_items = [i for i in items if i.id not in seen]

            # --- Persist new news items (in thread) ---
            if new_items:
                await asyncio.to_thread(_persist_news_batch, new_items)

            for n in new_items[:5]:
                seen.add(n.id)
                await alert_service.emit_news_event(
                    title=f"[{n.source}] {n.title}",
                    source=n.source,
                    url=n.url,
                )
            for old in items[5:]:
                seen.add(old.id)  # don't re-alert backlog on first run
            # Cap memory footprint of seen-set
            if len(seen) > 2000:
                seen = set(list(seen)[-1000:])
        except Exception as exc:
            logger.warning(f"news_loop error: {exc}")
        await asyncio.sleep(settings.NEWS_POLL_INTERVAL)


def _persist_news_batch(items):
    db = get_session()
    if db is None:
        return
    try:
        for n in items:
            PersistenceService.save_news(db, n)
    finally:
        db.close()


async def insight_loop() -> None:
    while True:
        try:
            report = await insight_service.build()
            logger.info("Daily insight rebuilt.")

            # Persist as JSONB (in thread)
            await asyncio.to_thread(_persist_insight, report)
        except Exception as exc:
            logger.warning(f"insight_loop error: {exc}")
        await asyncio.sleep(settings.INSIGHT_REBUILD_INTERVAL)


def _persist_insight(report):
    db = get_session()
    if db is None:
        return
    try:
        PersistenceService.save_daily_insight(db, report)
    finally:
        db.close()