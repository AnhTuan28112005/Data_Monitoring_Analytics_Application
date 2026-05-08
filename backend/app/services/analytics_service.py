"""Analytical features service: indicators, correlation matrix, intraday timeline."""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import List

import numpy as np
import pandas as pd

from app.ml import indicators as ind
from app.models.schemas import (
    AssetClass,
    CorrelationResponse,
    IndicatorResponse,
    IndicatorSeries,
    IntradayPoint,
    IntradayResponse,
)
from app.services.market_service import market_service


def _series_to_list(s: pd.Series) -> List[float | None]:
    out: List[float | None] = []
    for v in s.tolist():
        if v is None or (isinstance(v, float) and (np.isnan(v) or np.isinf(v))):
            out.append(None)
        else:
            out.append(float(v))
    return out


class AnalyticsService:
    # ------------------------------------------------------------------
    async def indicators(self, asset_class: AssetClass, symbol: str, timeframe: str,
                         names: List[str]) -> IndicatorResponse:
        df = await market_service.get_ohlcv_df(asset_class, symbol, timeframe, 300)
        if df.empty:
            return IndicatorResponse(symbol=symbol, timeframe=timeframe, times=[], series=[])

        times = [int(ts.timestamp()) for ts in df.index]
        series: List[IndicatorSeries] = []

        for n in names:
            n_l = n.lower()
            if n_l.startswith("sma"):
                period = int(n_l.replace("sma", "") or 20)
                series.append(IndicatorSeries(name=f"SMA{period}",
                                              values=_series_to_list(ind.sma(df["close"], period))))
            elif n_l.startswith("ema"):
                period = int(n_l.replace("ema", "") or 50)
                series.append(IndicatorSeries(name=f"EMA{period}",
                                              values=_series_to_list(ind.ema(df["close"], period))))
            elif n_l == "rsi":
                series.append(IndicatorSeries(name="RSI14",
                                              values=_series_to_list(ind.rsi(df["close"], 14))))
            elif n_l in ("bbands", "bb"):
                up, mid, lo = ind.bollinger_bands(df["close"], 20, 2.0)
                series.append(IndicatorSeries(name="BB_UP", values=_series_to_list(up)))
                series.append(IndicatorSeries(name="BB_MID", values=_series_to_list(mid)))
                series.append(IndicatorSeries(name="BB_LOW", values=_series_to_list(lo)))
            elif n_l == "macd":
                m, s, h = ind.macd(df["close"])
                series.append(IndicatorSeries(name="MACD", values=_series_to_list(m)))
                series.append(IndicatorSeries(name="MACD_SIGNAL", values=_series_to_list(s)))
                series.append(IndicatorSeries(name="MACD_HIST", values=_series_to_list(h)))
            elif n_l == "atr":
                series.append(IndicatorSeries(name="ATR14", values=_series_to_list(ind.atr(df, 14))))
            elif n_l in ("volatility", "vol"):
                series.append(IndicatorSeries(name="VOLATILITY",
                                              values=_series_to_list(ind.volatility_pct(df["close"], 20))))

        return IndicatorResponse(symbol=symbol, timeframe=timeframe, times=times, series=series)

    # ------------------------------------------------------------------
    async def correlation(self, pairs: List[tuple[AssetClass, str]],
                          timeframe: str = "1d", limit: int = 90) -> CorrelationResponse:
        dfs = await asyncio.gather(*(
            market_service.get_ohlcv_df(ac, sym, timeframe, limit) for ac, sym in pairs
        ))
        closes = {}
        for (ac, sym), df in zip(pairs, dfs):
            if df is None or df.empty:
                continue
            closes[f"{sym}"] = df["close"].pct_change().dropna()
        if not closes:
            return CorrelationResponse(symbols=[], matrix=[], timestamp=datetime.now(timezone.utc))

        merged = pd.concat(closes, axis=1, join="inner").dropna()
        # Compute Pearson correlation across percentage returns
        corr = merged.corr(method="pearson").fillna(0)
        symbols = list(corr.columns)
        matrix = [[round(float(corr.iloc[i, j]), 4) for j in range(len(symbols))]
                  for i in range(len(symbols))]
        return CorrelationResponse(symbols=symbols, matrix=matrix, timestamp=datetime.now(timezone.utc))

    # ------------------------------------------------------------------
    async def intraday_timeline(self, asset_class: AssetClass, symbol: str) -> IntradayResponse:
        # 5-minute bars, 1-day window
        df = await market_service.get_ohlcv_df(asset_class, symbol, "5m", 288)
        if df.empty:
            return IntradayResponse(symbol=symbol, points=[])

        df = df.copy()
        df["ret"] = df["close"].pct_change().fillna(0) * 100
        # Mark bars whose return is outside ±2σ as pump/dump
        std = df["ret"].std() or 0.5
        threshold = max(2.0 * std, 1.0)

        points: List[IntradayPoint] = []
        for ts, row in df.iterrows():
            event = None
            if row["ret"] >= threshold:
                event = "pump"
            elif row["ret"] <= -threshold:
                event = "dump"
            points.append(IntradayPoint(
                time=int(ts.timestamp()),
                price=float(row["close"]),
                volume=float(row["volume"]),
                event=event,
            ))
        return IntradayResponse(symbol=symbol, points=points)


analytics_service = AnalyticsService()
