"""Technical indicators implemented with pandas/numpy.

Each function takes a pandas DataFrame with at least the columns
``open, high, low, close, volume`` (lower case, indexed by datetime) and
returns a pandas Series or DataFrame aligned with the input index so the
caller can serialize to JSON together with timestamps.
"""
from __future__ import annotations

from typing import Tuple

import numpy as np
import pandas as pd


def sma(series: pd.Series, period: int) -> pd.Series:
    """Simple Moving Average — arithmetic mean over the last ``period`` bars."""
    return series.rolling(window=period, min_periods=1).mean()


def ema(series: pd.Series, period: int) -> pd.Series:
    """Exponential Moving Average — weights recent bars more heavily.

    EMA_t = alpha * price_t + (1 - alpha) * EMA_{t-1}, alpha = 2/(period+1).
    """
    return series.ewm(span=period, adjust=False, min_periods=1).mean()


def rsi(series: pd.Series, period: int = 14) -> pd.Series:
    """Relative Strength Index using Wilder's smoothing.

    RS = avg_gain / avg_loss; RSI = 100 - 100/(1+RS).  Values >70 typically
    indicate overbought; <30 oversold.
    """
    delta = series.diff()
    gain = delta.clip(lower=0.0)
    loss = -delta.clip(upper=0.0)
    avg_gain = gain.ewm(alpha=1 / period, adjust=False, min_periods=period).mean()
    avg_loss = loss.ewm(alpha=1 / period, adjust=False, min_periods=period).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    out = 100 - (100 / (1 + rs))
    return out.fillna(50.0)


def bollinger_bands(series: pd.Series, period: int = 20, stddev: float = 2.0) -> Tuple[pd.Series, pd.Series, pd.Series]:
    """Bollinger Bands — middle = SMA(period); upper/lower = middle ± k*std."""
    middle = sma(series, period)
    std = series.rolling(window=period, min_periods=1).std(ddof=0).fillna(0)
    upper = middle + stddev * std
    lower = middle - stddev * std
    return upper, middle, lower


def macd(series: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9) -> Tuple[pd.Series, pd.Series, pd.Series]:
    """MACD line, signal line, histogram."""
    macd_line = ema(series, fast) - ema(series, slow)
    signal_line = ema(macd_line, signal)
    hist = macd_line - signal_line
    return macd_line, signal_line, hist


def atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
    """Average True Range — proxy for volatility.

    TR = max(high-low, |high-prev_close|, |low-prev_close|).
    """
    prev_close = df["close"].shift(1)
    tr = pd.concat(
        [
            (df["high"] - df["low"]).abs(),
            (df["high"] - prev_close).abs(),
            (df["low"] - prev_close).abs(),
        ],
        axis=1,
    ).max(axis=1)
    return tr.ewm(alpha=1 / period, adjust=False, min_periods=1).mean()


def volatility_pct(series: pd.Series, period: int = 20) -> pd.Series:
    """Annualised-style rolling % volatility = std(returns)*sqrt(period)."""
    returns = series.pct_change().fillna(0)
    return returns.rolling(window=period, min_periods=2).std().fillna(0) * np.sqrt(period) * 100.0


def volume_sma(volume: pd.Series, period: int = 20) -> pd.Series:
    """Volume moving average used for whale detection."""
    return volume.rolling(window=period, min_periods=1).mean()
