"""Market data service for stocks, indexes, gold, silver and forex.

The historical implementation relied on the :pypi:`yfinance` package,
but the underlying Yahoo authorisation endpoint (cookie / crumb) is
frequently rate-limited or geo-blocked which leaves the entire
dashboard with empty data and floods the console with errors such as::

    $AAPL: possibly delisted; No price data found  (period=2d)
    Failed to get ticker 'EURUSD=X' reason: Expecting value: line 1 column 1 (char 0)

Yahoo's *public* chart JSON endpoint (``query1.finance.yahoo.com``) is
not affected by that issue and remains reachable from the same network.
We therefore route all requests directly to it via
:class:`~app.services.stooq_service.YahooChartService` (kept under the
old module name for backward compatibility).  The previous
``yfinance_service`` symbol still exists – it now wraps the chart
client and keeps the original API used elsewhere in the codebase.
"""
from __future__ import annotations

import asyncio
from typing import List, Optional

import pandas as pd

from app.models.schemas import Candle, PriceTick
from app.services.stooq_service import yahoo_chart_service


class YFinanceService:
    """Adapter exposing the public API used by :mod:`market_service`.

    Internally it talks to :class:`YahooChartService` (Yahoo public
    chart JSON endpoint).  No third-party finance library is required.
    """

    async def fetch_quote(self, ticker: str) -> Optional[PriceTick]:
        return await yahoo_chart_service.fetch_quote(ticker)

    async def fetch_quotes(self, tickers: List[str]) -> List[PriceTick]:
        results = await asyncio.gather(*(self.fetch_quote(t) for t in tickers))
        return [r for r in results if r is not None]

    async def fetch_ohlcv(self, ticker: str, timeframe: str = "1h", limit: int = 200) -> List[Candle]:
        return await yahoo_chart_service.fetch_ohlcv(ticker, timeframe, limit)

    async def ohlcv_dataframe(self, ticker: str, timeframe: str = "1h", limit: int = 200) -> pd.DataFrame:
        candles = await self.fetch_ohlcv(ticker, timeframe, limit)
        if not candles:
            return pd.DataFrame(columns=["open", "high", "low", "close", "volume"])
        df = pd.DataFrame([c.model_dump() for c in candles])
        df["dt"] = pd.to_datetime(df["time"], unit="s", utc=True)
        df.set_index("dt", inplace=True)
        return df[["open", "high", "low", "close", "volume"]]


yfinance_service = YFinanceService()
