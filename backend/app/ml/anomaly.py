"""Anomaly / pattern detection logic.

These are intentionally lightweight, deterministic detectors so the system
behaves predictably even with limited training data.  Where a model is used
(IsolationForest), it is fit on the rolling window provided so no offline
training is required.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

from app.ml.indicators import volume_sma


@dataclass
class Pattern:
    type: str            # "fomo" | "divergence" | "anomaly"
    severity: str        # "info" | "warning" | "critical"
    message: str
    detail: dict
    index: int           # bar index where pattern was detected (last bar)


def detect_fomo(df: pd.DataFrame,
                price_threshold_pct: float = 2.0,
                volume_multiplier: float = 2.5) -> Optional[Pattern]:
    """FOMO Warning — last candle has price spike AND volume spike vs SMA.

    Heuristic: latest %change > threshold AND latest volume > k * SMA20(volume).
    """
    if len(df) < 21:
        return None
    last = df.iloc[-1]
    prev_close = df["close"].iloc[-2]
    pct = (last["close"] - prev_close) / prev_close * 100.0 if prev_close else 0.0
    vol_ma = volume_sma(df["volume"], 20).iloc[-1]
    if vol_ma <= 0:
        return None
    vol_ratio = last["volume"] / vol_ma
    if pct >= price_threshold_pct and vol_ratio >= volume_multiplier:
        return Pattern(
            type="fomo",
            severity="warning",
            message=f"FOMO Warning: price +{pct:.2f}% with volume {vol_ratio:.1f}× the 20-bar average.",
            detail={"price_change_pct": round(pct, 3), "volume_ratio": round(vol_ratio, 2)},
            index=len(df) - 1,
        )
    return None


def detect_divergence(df: pd.DataFrame,
                      lookback: int = 14) -> Optional[Pattern]:
    """Bearish/bullish divergence between price and RSI.

    Bearish: price makes a higher high while RSI makes a lower high.
    Bullish: price makes a lower low while RSI makes a higher low.
    Used for "Tin tốt giá giảm" / unexpected reaction detection.
    """
    if len(df) < lookback * 2 + 2:
        return None
    from app.ml.indicators import rsi as _rsi
    rsi_series = _rsi(df["close"])
    recent = df.tail(lookback * 2)
    first_half = recent.head(lookback)
    second_half = recent.tail(lookback)
    rsi_first = rsi_series.tail(lookback * 2).head(lookback)
    rsi_second = rsi_series.tail(lookback)

    price_hh = second_half["close"].max() > first_half["close"].max()
    price_ll = second_half["close"].min() < first_half["close"].min()
    rsi_lh = rsi_second.max() < rsi_first.max()
    rsi_hl = rsi_second.min() > rsi_first.min()

    if price_hh and rsi_lh:
        return Pattern(
            type="divergence",
            severity="warning",
            message="Bearish divergence: price higher highs while RSI fading.",
            detail={"direction": "bearish"},
            index=len(df) - 1,
        )
    if price_ll and rsi_hl:
        return Pattern(
            type="divergence",
            severity="info",
            message="Bullish divergence: price lower lows while RSI rising — possible reversal.",
            detail={"direction": "bullish"},
            index=len(df) - 1,
        )
    return None


def detect_volume_outliers(volume: pd.Series, contamination: float = 0.03) -> List[int]:
    """Use IsolationForest on rolling volume to flag whale-like outliers.

    Returns the integer indices (within the input series) of detected outliers.
    """
    if len(volume) < 30:
        return []
    X = volume.values.reshape(-1, 1)
    try:
        model = IsolationForest(
            n_estimators=80,
            contamination=contamination,
            random_state=42,
        )
        preds = model.fit_predict(X)
    except Exception:
        return []
    return [int(i) for i, p in enumerate(preds) if p == -1]


def detect_whale(df: pd.DataFrame,
                 multiplier: float = 3.0) -> Optional[Pattern]:
    """Whale activity — last bar volume vastly exceeds 20-bar SMA volume."""
    if len(df) < 21:
        return None
    last_vol = df["volume"].iloc[-1]
    avg = volume_sma(df["volume"], 20).iloc[-1]
    if avg <= 0:
        return None
    ratio = last_vol / avg
    if ratio >= multiplier:
        direction = "buy" if df["close"].iloc[-1] >= df["open"].iloc[-1] else "sell"
        return Pattern(
            type="whale",
            severity="critical" if ratio >= 5 else "warning",
            message=f"Whale activity: volume {ratio:.1f}× SMA20 ({direction}).",
            detail={"volume_ratio": round(ratio, 2), "direction": direction},
            index=len(df) - 1,
        )
    return None


def detect_spike(df: pd.DataFrame,
                 window_minutes: int = 5,
                 threshold_pct: float = 3.0) -> Optional[Pattern]:
    """Detect rapid price moves (>threshold% within window).

    Assumes the dataframe has 1-minute candles.  Falls back to last 5 bars.
    """
    if len(df) < window_minutes + 1:
        return None
    window = df.tail(window_minutes + 1)
    high = window["high"].max()
    low = window["low"].min()
    open_ = window["open"].iloc[0]
    close = window["close"].iloc[-1]
    move_pct = (close - open_) / open_ * 100.0 if open_ else 0.0
    if abs(move_pct) >= threshold_pct:
        return Pattern(
            type="price_spike" if move_pct > 0 else "price_drop",
            severity="critical" if abs(move_pct) >= threshold_pct * 2 else "warning",
            message=f"Price moved {move_pct:+.2f}% in last {window_minutes}m.",
            detail={
                "move_pct": round(move_pct, 3),
                "high": float(high),
                "low": float(low),
            },
            index=len(df) - 1,
        )
    return None
