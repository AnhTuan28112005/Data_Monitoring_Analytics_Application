"""
Forecast API — uses the SAME live OHLCV source as the chart (market_service)
and caches the Prophet result for 5 minutes to avoid timeouts.

Flow:
  1. Check forecast_cache → return immediately if fresh hit
  2. Cache miss → run Prophet in a thread pool (non-blocking)
  3. Store result in cache with 5-minute TTL
  4. Return result
"""
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor

import pandas as pd
from fastapi import APIRouter, Query

from app.core.cache import forecast_cache
from app.ml.forecast import generate_prophet_forecast, TIMEFRAME_CONFIG
from app.services.market_service import market_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/forecast", tags=["forecast"])

# Separate thread pool so Prophet doesn't block the uvicorn event loop
_prophet_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="prophet")

# How long to keep forecast results in cache (seconds)
_CACHE_TTL: dict[str, int] = {
    "5m":  3 * 60,      # 3 min
    "15m": 5 * 60,      # 5 min
    "1h":  10 * 60,     # 10 min
    "4h":  20 * 60,     # 20 min
    "1d":  60 * 60,     # 60 min
}


def _guess_asset_class(symbol: str) -> str:
    s = symbol.upper()
    if "/" in s and ("USDT" in s or "USDC" in s or "BTC" in s):
        return "crypto"
    if s.startswith("^"):
        return "index"
    if s in ("GC=F", "XAUUSD=X"):
        return "gold"
    if s in ("SI=F", "XAGUSD=X"):
        return "silver"
    if s.endswith("=X"):
        return "forex"
    return "crypto"


def _run_prophet(df: pd.DataFrame, timeframe: str) -> list:
    """Blocking call — run in thread pool."""
    return generate_prophet_forecast(df, timeframe)


@router.get("/{symbol:path}")
async def get_forecast(
    symbol: str,
    timeframe: str = Query("1h"),
    asset_class: str = Query(""),
):
    cache_key = f"{symbol}:{timeframe}"

    # ── 1. Fast path: cache hit ───────────────────────────────────────────
    cached = forecast_cache.get(cache_key)
    if cached is not None:
        logger.info("Forecast cache HIT symbol=%s tf=%s points=%s", symbol, timeframe, len(cached))
        return {"success": True, "symbol": symbol, "timeframe": timeframe, "data": cached}

    # ── 2. Cache miss: fetch live OHLCV ──────────────────────────────────
    try:
        config = TIMEFRAME_CONFIG.get(timeframe, TIMEFRAME_CONFIG["1h"])
        ac = asset_class if asset_class else _guess_asset_class(symbol)

        # Candle limit: enough history for Prophet (lookback minutes → candles)
        # lookback is in minutes; each candle covers tf_minutes minutes
        tf_minutes = {"5m": 5, "15m": 15, "1h": 60, "4h": 240, "1d": 1440}.get(timeframe, 60)
        limit = min(config["lookback"] // tf_minutes + 20, 1000)

        candles = await market_service.get_ohlcv(ac, symbol, timeframe, limit=limit)

        if not candles or len(candles) < 10:
            logger.warning(
                "Forecast: not enough candles symbol=%s tf=%s got=%s",
                symbol, timeframe, len(candles) if candles else 0,
            )
            return {"success": True, "symbol": symbol, "timeframe": timeframe, "data": []}

        df = pd.DataFrame([{"time_timestamp": c.time, "close": c.close} for c in candles])

        # ── 3. Run Prophet in thread pool (non-blocking) ─────────────────
        loop = asyncio.get_running_loop()
        forecast = await loop.run_in_executor(_prophet_executor, _run_prophet, df, timeframe)

        # ── 4. Store in cache ─────────────────────────────────────────────
        ttl = _CACHE_TTL.get(timeframe, 5 * 60)
        forecast_cache.set(cache_key, forecast, ttl=ttl)

        logger.info(
            "Forecast OK symbol=%s tf=%s candles=%s points=%s ttl=%ss",
            symbol, timeframe, len(candles), len(forecast), ttl,
        )
        return {"success": True, "symbol": symbol, "timeframe": timeframe, "data": forecast}

    except Exception:
        logger.exception("Forecast API failed symbol=%s tf=%s", symbol, timeframe)
        return {"success": True, "symbol": symbol, "timeframe": timeframe, "data": []}