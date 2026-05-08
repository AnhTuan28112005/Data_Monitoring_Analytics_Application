"""Direct Yahoo Finance chart-API fallback.

The :pypi:`yfinance` package is repeatedly blocked by Yahoo's cookie /
crumb authorisation endpoints which causes errors such as::

    $AAPL: possibly delisted; No price data found
    Failed to get ticker 'EURUSD=X' reason: Expecting value: line 1 column 1

The unauthenticated public chart endpoint
``https://query1.finance.yahoo.com/v8/finance/chart/<symbol>`` keeps
working in those situations and returns a clean JSON document.  This
module talks to it directly via :pypi:`httpx` and exposes the same
``fetch_quote`` / ``fetch_ohlcv`` API that :class:`YFinanceService`
relies on, so it can transparently take over when yfinance fails.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

import httpx
from loguru import logger

from app.models.schemas import AssetClass, Candle, PriceTick


def _classify(ticker: str) -> AssetClass:
    if ticker in {"GC=F", "XAUUSD=X"}:
        return "gold"
    if ticker in {"SI=F", "XAGUSD=X"}:
        return "silver"
    if ticker.endswith("=X"):
        return "forex"
    if ticker.startswith("^"):
        return "index"
    return "stock"


# Map our app's timeframe → (Yahoo `interval`, Yahoo `range`)
_RANGE_MAP = {
    "1m": ("1m", "1d"),
    "5m": ("5m", "5d"),
    "15m": ("15m", "5d"),
    "30m": ("30m", "1mo"),
    "1h": ("60m", "1mo"),
    "4h": ("60m", "3mo"),  # aggregated downstream
    "1d": ("1d", "1y"),
    "1w": ("1wk", "5y"),
}


class YahooChartService:
    """Async client for the public Yahoo chart JSON endpoint."""

    BASE = "https://query1.finance.yahoo.com/v8/finance/chart/"

    def __init__(self) -> None:
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(15.0, connect=10.0),
                headers={
                    "User-Agent": (
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/124.0 Safari/537.36"
                    ),
                    "Accept": "application/json,text/plain,*/*",
                    "Accept-Language": "en-US,en;q=0.9",
                },
                follow_redirects=True,
            )
        return self._client

    async def aclose(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    async def _fetch_chart(self, ticker: str, interval: str, rng: str) -> Optional[dict]:
        params = {"interval": interval, "range": rng, "includePrePost": "false"}
        try:
            client = await self._get_client()
            r = await client.get(self.BASE + ticker, params=params)
            r.raise_for_status()
            data = r.json()
        except Exception as exc:
            logger.debug(f"yahoo-chart {ticker} {interval}/{rng}: {exc}")
            return None
        chart = data.get("chart") or {}
        if chart.get("error"):
            logger.debug(f"yahoo-chart {ticker} error={chart['error']}")
            return None
        result = chart.get("result")
        if not result:
            return None
        return result[0]

    async def fetch_quote(self, ticker: str) -> Optional[PriceTick]:
        """Return a live PriceTick using the chart endpoint's `meta` block."""
        result = await self._fetch_chart(ticker, "1d", "5d")
        if not result:
            return None
        meta = result.get("meta") or {}
        price = meta.get("regularMarketPrice")
        prev = meta.get("chartPreviousClose") or meta.get("previousClose")
        if price is None:
            return None
        try:
            price = float(price)
        except (TypeError, ValueError):
            return None
        prev_f = float(prev) if prev is not None else price
        change_abs = price - prev_f
        change_pct = (change_abs / prev_f * 100.0) if prev_f else 0.0
        return PriceTick(
            symbol=ticker,
            asset_class=_classify(ticker),
            price=price,
            change_24h_pct=change_pct,
            change_24h_abs=change_abs,
            volume_24h=float(meta.get("regularMarketVolume") or 0.0),
            high_24h=float(meta.get("regularMarketDayHigh") or price),
            low_24h=float(meta.get("regularMarketDayLow") or price),
            timestamp=datetime.now(timezone.utc),
        )

    async def fetch_ohlcv(self, ticker: str, timeframe: str = "1h", limit: int = 200) -> List[Candle]:
        interval, rng = _RANGE_MAP.get(timeframe, ("60m", "1mo"))
        result = await self._fetch_chart(ticker, interval, rng)
        if not result:
            return []
        timestamps = result.get("timestamp") or []
        indicators = (result.get("indicators") or {}).get("quote") or [{}]
        q = indicators[0] if indicators else {}
        opens = q.get("open") or []
        highs = q.get("high") or []
        lows = q.get("low") or []
        closes = q.get("close") or []
        volumes = q.get("volume") or []
        candles: List[Candle] = []
        for i, ts in enumerate(timestamps):
            try:
                o = opens[i]; h = highs[i]; lo = lows[i]; c = closes[i]
            except IndexError:
                continue
            if c is None:
                continue
            try:
                candles.append(Candle(
                    time=int(ts),
                    open=float(o if o is not None else c),
                    high=float(h if h is not None else c),
                    low=float(lo if lo is not None else c),
                    close=float(c),
                    volume=float(volumes[i] if i < len(volumes) and volumes[i] is not None else 0.0),
                ))
            except (TypeError, ValueError):
                continue

        candles = candles[-limit:]
        if timeframe == "4h" and candles:
            candles = _aggregate_to_4h(candles)
        return candles


def _aggregate_to_4h(candles: List[Candle]) -> List[Candle]:
    import pandas as pd

    df = pd.DataFrame([c.model_dump() for c in candles])
    df["dt"] = pd.to_datetime(df["time"], unit="s", utc=True)
    df.set_index("dt", inplace=True)
    agg = df.resample("4H").agg({
        "open": "first", "high": "max", "low": "min", "close": "last", "volume": "sum"
    }).dropna()
    out: List[Candle] = []
    for ts, row in agg.iterrows():
        out.append(Candle(
            time=int(ts.timestamp()),
            open=float(row["open"]), high=float(row["high"]),
            low=float(row["low"]), close=float(row["close"]),
            volume=float(row["volume"]),
        ))
    return out


# Public singleton.  Imported as ``stooq_service`` for backward
# compatibility with existing call-sites; it now talks to Yahoo's chart
# endpoint directly.
stooq_service = YahooChartService()
yahoo_chart_service = stooq_service
