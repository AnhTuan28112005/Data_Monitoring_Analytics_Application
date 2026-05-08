"""Daily insight & timezone analysis service.

Builds the "Daily Insight Report" by:
1. Pulling 1h candles for a basket of assets across all classes.
2. Running pandas analysis: trend (SMA50 vs SMA200 light variant), best/worst,
   anomalies (volume spikes), and timezone-bucketed volume/volatility.
3. Composing a markdown-friendly text summary.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Dict, List

import numpy as np
import pandas as pd
from loguru import logger

from app.core.config import settings
from app.models.schemas import (
    AssetClass,
    DailyInsight,
    GainerLoser,
    TimezoneSession,
)
from app.services.market_service import market_service


# Trading session UTC hours (approximate)
_SESSIONS = {
    "asia":   (0, 8),    # 00:00 - 08:00 UTC
    "europe": (7, 16),   # 07:00 - 16:00 UTC
    "us":     (13, 22),  # 13:00 - 22:00 UTC
}


class InsightService:
    def __init__(self) -> None:
        self._cache: Dict[str, DailyInsight] = {}

    # ------------------------------------------------------------------
    async def build(self) -> DailyInsight:
        # Universe used for the report
        universe: List[tuple[AssetClass, str]] = (
            [("crypto", s) for s in settings.CRYPTO_SYMBOLS[:6]] +
            [("index", s) for s in ["^GSPC", "^IXIC"]] +
            [("gold", "GC=F"), ("silver", "SI=F")] +
            [("forex", s) for s in settings.FOREX_TICKERS[:3]]
        )

        dfs: Dict[str, pd.DataFrame] = {}
        results = await asyncio.gather(
            *(market_service.get_ohlcv_df(ac, sym, "1h", 200) for ac, sym in universe),
            return_exceptions=True,
        )
        for (ac, sym), df in zip(universe, results):
            if isinstance(df, pd.DataFrame) and not df.empty:
                dfs[f"{ac}:{sym}"] = df

        # ----- 1. Market state from BTC + S&P trend
        market_state = self._market_state(dfs)

        # ----- 2. Anomalies (volume spike vs SMA20)
        anomalies = self._anomalies(dfs)

        # ----- 3. Timezone analysis (BTC as benchmark)
        sessions = self._timezone_analysis(dfs.get("crypto:BTC/USDT"))

        # ----- 4. Top gainers / losers (24h % change from 1h candles)
        gainers, losers = self._top_movers(dfs)

        # ----- 5. Insight text (data-driven)
        insights = self._compose_insights(dfs, sessions, anomalies, market_state)

        summary = (
            f"Market is currently {market_state.upper()}. "
            f"Anomalies detected on {len(anomalies)} assets. "
            f"Strongest session: {max(sessions, key=lambda s: s.avg_volume).session if sessions else 'n/a'}."
        )

        report = DailyInsight(
            date=datetime.now(timezone.utc).date().isoformat(),
            market_state=market_state,
            summary=summary,
            anomalies=anomalies,
            sessions=sessions,
            insights=insights,
            top_gainers=gainers,
            top_losers=losers,
            timestamp=datetime.now(timezone.utc),
        )
        self._cache["latest"] = report
        return report

    def latest(self) -> DailyInsight | None:
        return self._cache.get("latest")

    # ------------------------------------------------------------------
    def _market_state(self, dfs: Dict[str, pd.DataFrame]) -> str:
        scores: List[float] = []
        for key in ("crypto:BTC/USDT", "index:^GSPC", "index:^IXIC"):
            df = dfs.get(key)
            if df is None or len(df) < 50:
                continue
            short = df["close"].rolling(20).mean().iloc[-1]
            long = df["close"].rolling(50).mean().iloc[-1]
            last = df["close"].iloc[-1]
            score = 0.0
            if short > long:
                score += 1
            if last > short:
                score += 0.5
            if last > long:
                score += 0.5
            scores.append(score - 1.0)  # center near 0
        if not scores:
            return "sideway"
        avg = float(np.mean(scores))
        if avg > 0.4:
            return "bullish"
        if avg < -0.4:
            return "bearish"
        return "sideway"

    # ------------------------------------------------------------------
    def _anomalies(self, dfs: Dict[str, pd.DataFrame]) -> List[dict]:
        out: List[dict] = []
        for key, df in dfs.items():
            if len(df) < 30:
                continue
            vol_ma = df["volume"].rolling(20, min_periods=5).mean()
            ratio = df["volume"].iloc[-1] / vol_ma.iloc[-1] if vol_ma.iloc[-1] else 0
            pct_24h = (df["close"].iloc[-1] / df["close"].iloc[-24] - 1) * 100 if len(df) >= 24 else 0
            if ratio >= 2.5 or abs(pct_24h) >= 5:
                ac, sym = key.split(":", 1)
                out.append({
                    "asset_class": ac,
                    "symbol": sym,
                    "volume_ratio": round(float(ratio), 2),
                    "change_24h_pct": round(float(pct_24h), 2),
                    "note": "Volume spike" if ratio >= 2.5 else "Strong move",
                })
        out.sort(key=lambda x: abs(x["change_24h_pct"]) + x["volume_ratio"], reverse=True)
        return out[:8]

    # ------------------------------------------------------------------
    def _timezone_analysis(self, df: pd.DataFrame | None) -> List[TimezoneSession]:
        if df is None or df.empty:
            return []
        d = df.copy()
        d["hour"] = d.index.hour
        d["ret"] = d["close"].pct_change().fillna(0)

        sessions: List[TimezoneSession] = []
        for name, (h0, h1) in _SESSIONS.items():
            mask = (d["hour"] >= h0) & (d["hour"] < h1)
            sub = d[mask]
            if sub.empty:
                continue
            avg_vol = float(sub["volume"].mean())
            avg_volat = float(sub["ret"].abs().mean() * 100)
            net = float((sub["close"].iloc[-1] / sub["close"].iloc[0] - 1) * 100) if len(sub) >= 2 else 0.0
            sessions.append(TimezoneSession(
                session=name,  # type: ignore[arg-type]
                avg_volume=avg_vol,
                avg_volatility_pct=avg_volat,
                net_change_pct=net,
            ))
        return sessions

    # ------------------------------------------------------------------
    def _top_movers(self, dfs: Dict[str, pd.DataFrame]) -> tuple[List[GainerLoser], List[GainerLoser]]:
        movers: List[GainerLoser] = []
        for key, df in dfs.items():
            if len(df) < 24:
                continue
            ac, sym = key.split(":", 1)
            pct = float((df["close"].iloc[-1] / df["close"].iloc[-24] - 1) * 100)
            movers.append(GainerLoser(
                symbol=sym, asset_class=ac,  # type: ignore[arg-type]
                price=float(df["close"].iloc[-1]),
                change_pct=round(pct, 3),
                volume=float(df["volume"].iloc[-24:].sum()),
            ))
        movers.sort(key=lambda x: x.change_pct, reverse=True)
        return movers[:5], list(reversed(movers[-5:]))

    # ------------------------------------------------------------------
    def _compose_insights(self, dfs, sessions, anomalies, market_state) -> List[str]:
        insights: List[str] = []
        if sessions:
            top_session = max(sessions, key=lambda s: s.avg_volume)
            insights.append(
                f"The {top_session.session.title()} session captured the largest share of trading "
                f"volume (avg {top_session.avg_volume:,.0f}) with {top_session.avg_volatility_pct:.2f}% "
                f"average bar volatility."
            )

        # Capital rotation: compare BTC vs Gold over last 24 bars
        btc = dfs.get("crypto:BTC/USDT")
        gold = dfs.get("gold:GC=F")
        if btc is not None and gold is not None and len(btc) >= 24 and len(gold) >= 24:
            btc_pct = (btc["close"].iloc[-1] / btc["close"].iloc[-24] - 1) * 100
            gold_pct = (gold["close"].iloc[-1] / gold["close"].iloc[-24] - 1) * 100
            if btc_pct < -1 and gold_pct > 0.3:
                insights.append("Capital appears to be rotating out of Crypto into Gold today.")
            elif btc_pct > 1 and gold_pct < -0.3:
                insights.append("Risk-on flow: Crypto outperforming while Gold weakens.")

        # SP500 vs DXY (use EURUSD inverse as proxy if DXY missing)
        sp = dfs.get("index:^GSPC")
        eur = dfs.get("forex:EURUSD=X")
        if sp is not None and eur is not None and len(sp) >= 24 and len(eur) >= 24:
            sp_pct = (sp["close"].iloc[-1] / sp["close"].iloc[-24] - 1) * 100
            eur_pct = (eur["close"].iloc[-1] / eur["close"].iloc[-24] - 1) * 100
            if sp_pct > 0 and eur_pct > 0:
                insights.append("Equities and EUR/USD both climbing — broad USD weakness narrative.")

        if anomalies:
            top_a = anomalies[0]
            insights.append(
                f"Most notable anomaly: {top_a['symbol']} ({top_a['asset_class']}) "
                f"with {top_a['change_24h_pct']:+.2f}% move and {top_a['volume_ratio']}× volume."
            )

        if market_state == "bullish":
            insights.append("Trend filters (SMA20/50) align bullishly across major benchmarks.")
        elif market_state == "bearish":
            insights.append("Major benchmarks below their SMA50 — caution warranted.")
        else:
            insights.append("Market structure is range-bound; mean-reversion strategies favored.")

        return insights


insight_service = InsightService()
