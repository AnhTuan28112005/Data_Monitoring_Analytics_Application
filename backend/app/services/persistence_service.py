"""Persistence service — saves data to PostgreSQL.

All methods are static and accept an optional Session.  If the session
is ``None`` (database not configured) the method returns silently so the
rest of the application is unaffected.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import List, Optional

from loguru import logger
from sqlalchemy import text
from sqlalchemy.orm import Session


class PersistenceService:
    # ------------------------------------------------------------------
    # Price snapshots (from price_loop ticks)
    # ------------------------------------------------------------------
    @staticmethod
    def save_price_ticks(db: Optional[Session], ticks: list) -> None:
        """Save latest price ticks into the ``prices`` table.

        This stores a *snapshot* row per asset — NOT candle data.
        """
        if db is None or not ticks:
            return
        try:
            query = text("""
                INSERT INTO prices (symbol, asset_class, price, change_24h_pct, volume_24h, timestamp)
                VALUES (:symbol, :asset_class, :price, :change_24h_pct, :volume_24h, :ts)
            """)
            for t in ticks:
                d = t.model_dump()
                db.execute(query, {
                    "symbol": d["symbol"],
                    "asset_class": d["asset_class"],
                    "price": d["price"],
                    "change_24h_pct": d.get("change_24h_pct", 0.0),
                    "volume_24h": d.get("volume_24h", 0.0),
                    "ts": d["timestamp"],
                })
            db.commit()
        except Exception as exc:
            db.rollback()
            logger.debug(f"save_price_ticks error: {exc}")

    # ------------------------------------------------------------------
    # OHLCV candles (from backfill or periodic OHLCV fetch)
    # ------------------------------------------------------------------
    @staticmethod
    def save_candles(db: Optional[Session], symbol: str, timeframe: str,
                     candles: list) -> int:
        """Insert candles with ON CONFLICT DO NOTHING (upsert-safe).

        ``candles`` is a list of dicts with keys:
        ``open, high, low, close, volume, time`` (unix seconds).

        Returns the number of rows actually inserted.
        """
        if db is None or not candles:
            return 0
        inserted = 0
        try:
            query = text("""
                INSERT INTO ohlcv_candles
                    (symbol, timeframe, open, high, low, close, volume, time_timestamp)
                VALUES
                    (:symbol, :tf, :open, :high, :low, :close, :volume, :ts)
                ON CONFLICT (symbol, timeframe, time_timestamp) DO NOTHING
            """)
            for c in candles:
                result = db.execute(query, {
                    "symbol": symbol,
                    "tf": timeframe,
                    "open": float(c.get("open", 0)),
                    "high": float(c.get("high", 0)),
                    "low": float(c.get("low", 0)),
                    "close": float(c.get("close", 0)),
                    "volume": float(c.get("volume", 0)),
                    "ts": int(c.get("time", 0)),
                })
                inserted += result.rowcount
            db.commit()
            return inserted
        except Exception as exc:
            db.rollback()
            logger.debug(f"save_candles error: {exc}")
            return 0

    # ------------------------------------------------------------------
    # News
    # ------------------------------------------------------------------
    @staticmethod
    def save_news(db: Optional[Session], item) -> None:
        """Save a single news item. Uses ON CONFLICT to skip duplicates."""
        if db is None:
            return
        try:
            query = text("""
                INSERT INTO news (news_id, title, source, url, published_at, summary, category)
                VALUES (:id, :title, :source, :url, :published_at, :summary, :category)
                ON CONFLICT (news_id) DO NOTHING
            """)
            db.execute(query, {
                "id": str(item.id),
                "title": item.title,
                "source": item.source,
                "url": item.url,
                "published_at": item.published_at,
                "summary": getattr(item, "summary", None),
                "category": getattr(item, "category", None),
            })
            db.commit()
        except Exception as exc:
            db.rollback()
            logger.debug(f"save_news error: {exc}")

    # ------------------------------------------------------------------
    # Alerts
    # ------------------------------------------------------------------
    @staticmethod
    def save_alert(db: Optional[Session], alert_data: dict) -> None:
        """Save an alert to the ``alerts`` table."""
        if db is None:
            return
        try:
            detail = alert_data.get("detail", {})
            if isinstance(detail, dict):
                detail = json.dumps(detail)

            query = text("""
                INSERT INTO alerts
                    (alert_id, alert_type, severity, symbol, asset_class, message, detail, timestamp)
                VALUES
                    (:alert_id, :alert_type, :severity, :symbol, :asset_class, :message, :detail::jsonb, :ts)
            """)
            db.execute(query, {
                "alert_id": alert_data.get("id", ""),
                "alert_type": alert_data.get("alert_type", alert_data.get("type", "")),
                "severity": alert_data.get("severity", "info"),
                "symbol": alert_data.get("symbol"),
                "asset_class": alert_data.get("asset_class"),
                "message": alert_data.get("message", ""),
                "detail": detail,
                "ts": datetime.now(timezone.utc),
            })
            db.commit()
        except Exception as exc:
            db.rollback()
            logger.debug(f"save_alert error: {exc}")

    # ------------------------------------------------------------------
    # Daily insights
    # ------------------------------------------------------------------
    @staticmethod
    def save_daily_insight(db: Optional[Session], report) -> None:
        """Save/upsert the daily insight report as JSONB."""
        if db is None:
            return
        try:
            report_dict = report.model_dump(mode="json")
            query = text("""
                INSERT INTO daily_insights (report_date, market_state, summary, content_json)
                VALUES (:dt, :state, :summary, :content::jsonb)
                ON CONFLICT (report_date) DO UPDATE SET
                    market_state = EXCLUDED.market_state,
                    summary      = EXCLUDED.summary,
                    content_json = EXCLUDED.content_json,
                    created_at   = NOW()
            """)
            db.execute(query, {
                "dt": report_dict.get("date", datetime.now(timezone.utc).date().isoformat()),
                "state": report_dict.get("market_state", "sideway"),
                "summary": report_dict.get("summary", ""),
                "content": json.dumps(report_dict),
            })
            db.commit()
            logger.info("💾 Daily insight saved to DB.")
        except Exception as exc:
            db.rollback()
            logger.debug(f"save_daily_insight error: {exc}")