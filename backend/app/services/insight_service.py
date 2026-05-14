"""Daily insight & timezone analysis service — enhanced with storytelling framework.

Builds the "Daily Insight Report" by:
1. Pulling 1h candles for a basket of assets across all classes.
2. Running pandas analysis: trend (SMA20/50), best/worst, anomalies, timezone sessions.
3. Calling StorytellingService to generate 4-W narrative blocks per detected event.
4. Composing a full EnhancedDailyInsight that includes both the legacy flat fields
   (backward-compatible with existing API consumers) and the new narrative fields.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Dict, List, Optional

import numpy as np
import pandas as pd
from loguru import logger
import time

from app.core.config import settings
from app.models.schemas import (
    AssetClass,
    DailyInsight,
    GainerLoser,
    TimezoneSession,
)
from app.ml.forecast import generate_prophet_forecast
from app.services.market_service import market_service
from app.services.storytelling_service import storytelling_service


# Trading session UTC hour windows (approximate)
_SESSIONS = {
    "asia":   (0,  8),   # 00:00–08:00 UTC
    "europe": (7,  16),  # 07:00–16:00 UTC
    "us":     (13, 22),  # 13:00–22:00 UTC
}


class InsightService:
    def __init__(self) -> None:
        self._cache: Dict[str, DailyInsight] = {}
        self._enhanced_cache: Dict[str, dict] = {}  # stores the rich narrative payload

        self._last_build_ts: float = 0
        self._building = False
        self._ttl_seconds = 60 * 15

    # ------------------------------------------------------------------
    async def build(self) -> DailyInsight:
        """Build the full daily insight report and persist to both caches."""
        try:
            return await self._build_internal()
        except Exception:
            logger.exception("insight_service.build() failed — writing fallback cache")
            self._write_fallback_cache()
            return self._cache.get("latest")  # type: ignore

    async def _build_internal(self) -> DailyInsight:
        """Actual build logic — separated so build() can catch all errors."""

        # --- Asset universe for this report ---
        universe: List[tuple[AssetClass, str]] = (
            [("crypto", s) for s in settings.CRYPTO_SYMBOLS[:6]] +
            [("index", s) for s in ["^GSPC", "^IXIC"]] +
            [("gold", "GC=F"), ("silver", "SI=F")] +
            [("forex", s) for s in settings.FOREX_TICKERS[:3]]
        )

        # --- Fetch OHLCV concurrently ---
        results = await asyncio.gather(
            *(market_service.get_ohlcv_df(ac, sym, "1h", 200) for ac, sym in universe),
            return_exceptions=True,
        )
        dfs: Dict[str, pd.DataFrame] = {}
        for (ac, sym), df in zip(universe, results):
            if isinstance(df, pd.DataFrame) and not df.empty:
                dfs[f"{ac}:{sym}"] = df

        # ── Core analytics ──────────────────────────────────────────────
        market_state            = self._market_state(dfs)
        anomalies               = self._anomalies(dfs)
        sessions                = self._timezone_analysis(dfs.get("crypto:BTC/USDT"))
        gainers, losers         = self._top_movers(dfs)
        legacy_insights         = self._compose_legacy_insights(dfs, sessions, anomalies, market_state)

        # ── Storytelling layer ───────────────────────────────────────────
        market_narrative        = storytelling_service.market_narrative(market_state, dfs)
        cross_asset_insights    = storytelling_service.cross_asset_insights(dfs)
        anomaly_interpretations = [
            storytelling_service.interpret_anomaly(a, dfs) for a in anomalies
        ]
        session_narratives      = storytelling_service.session_narrative(sessions)
        weekly_summary          = storytelling_service.weekly_summary(
            dfs, market_state, anomalies, gainers, losers
        )

        # ── Historical context (NEW) ─────────────────────────────────────
        try:
            hist_context = storytelling_service.historical_context(dfs)
        except Exception:
            logger.warning("historical_context failed — skipping")
            hist_context = None

        # ── Prophet Forecast for BTC & Gold (NEW) ────────────────────────
        forecast_summaries = []
        for fc_key, fc_ac in [("crypto:BTC/USDT", "crypto"), ("gold:GC=F", "gold")]:
            df_fc = dfs.get(fc_key)
            if df_fc is None or len(df_fc) < 60:
                continue
            try:
                # DataFrame has DatetimeIndex named 'dt' and column 'time' (unix seconds)
                # Reset index to get 'dt' as a column, then build the prophet-compatible df
                df_reset = df_fc.reset_index()   # columns: dt, open, high, low, close, volume
                # Also need unix seconds — 'time' column may or may not exist
                if "time" in df_reset.columns:
                    df_for_prophet = df_reset[["time", "close"]].rename(
                        columns={"time": "time_timestamp"}
                    )
                else:
                    # derive unix seconds from the DatetimeIndex
                    df_for_prophet = df_reset[["dt", "close"]].copy()
                    df_for_prophet["time_timestamp"] = df_for_prophet["dt"].apply(
                        lambda x: int(x.timestamp())
                    )
                    df_for_prophet = df_for_prophet[["time_timestamp", "close"]]

                fc_points = generate_prophet_forecast(df_for_prophet, "1h")
                current_px = float(df_fc["close"].iloc[-1])
                fc_sym = fc_key.split(":", 1)[1]
                fc_narrative = storytelling_service.forecast_narrative(
                    symbol=fc_sym,
                    asset_class=fc_ac,
                    current_price=current_px,
                    forecast_points=fc_points,
                )
                forecast_summaries.append(fc_narrative)
            except Exception:
                logger.warning("Forecast failed for %s — skipping", fc_key)

        # ── Summary sentence (used in the header card) ───────────────────
        top_regime = (
            cross_asset_insights[0].regime
            if cross_asset_insights else market_state
        )
        strongest_session = (
            max(sessions, key=lambda s: s.avg_volume).session
            if sessions else "n/a"
        )
        summary = (
            f"Market is currently {market_state.upper()} "
            f"({top_regime} regime). "
            f"{len(anomalies)} anomalies detected. "
            f"Dominant session: {strongest_session.title()}. "
            f"{len(cross_asset_insights)} cross-asset signal(s) active."
        )

        # ── Assemble base DailyInsight (stays backward-compatible) ───────
        report = DailyInsight(
            date=datetime.now(timezone.utc).date().isoformat(),
            market_state=market_state,
            summary=summary,
            anomalies=anomalies,
            sessions=sessions,
            insights=legacy_insights,
            top_gainers=gainers,
            top_losers=losers,
            timestamp=datetime.now(timezone.utc),
        )
        self._cache["latest"] = report

        # ── Store rich narrative payload separately ───────────────────────
        self._enhanced_cache["latest"] = {
            **report.model_dump(mode="json"),
            # Existing narrative fields
            "market_narrative":          market_narrative.to_dict(),
            "cross_asset_insights":      [c.to_dict() for c in cross_asset_insights],
            "anomaly_interpretations":   [a.to_dict() for a in anomaly_interpretations],
            "session_narratives":        session_narratives,
            "weekly_summary":            weekly_summary.to_dict() if weekly_summary else None,
            # NEW fields
            "forecast_summary":          forecast_summaries if forecast_summaries else None,
            "historical_context":        hist_context,
        }

        self._last_build_ts = time.time()
        return report

    def _write_fallback_cache(self) -> None:
        """Write a minimal valid cache so the frontend never sees None."""
        if "latest" in self._enhanced_cache:
            return  # already have something — keep it
        now = datetime.now(timezone.utc)
        fallback = {
            "date": now.date().isoformat(),
            "market_state": "sideway",
            "summary": "Insight report is being built — please click Rebuild.",
            "anomalies": [],
            "sessions": [],
            "insights": ["Data pipeline is initializing. Click Rebuild to generate the full report."],
            "top_gainers": [],
            "top_losers": [],
            "timestamp": now.isoformat(),
            "market_narrative": None,
            "cross_asset_insights": [],
            "anomaly_interpretations": [],
            "session_narratives": [],
            "weekly_summary": None,
            "forecast_summary": None,
            "historical_context": None,
        }
        self._enhanced_cache["latest"] = fallback
        self._last_build_ts = time.time()

    # ------------------------------------------------------------------
    async def latest(self):
        """
        Auto-build insight nếu cache rỗng hoặc hết hạn.
        """

        need_build = (
            "latest" not in self._cache
            or self._cache_expired()
        )

        if need_build and not self._building:
            self._building = True

            try:
                await self.build()
            finally:
                self._building = False

        return self._cache.get("latest")

    async def latest_enhanced(self):
        """
        Auto-build enhanced insight nếu cache rỗng hoặc hết hạn.
        """

        need_build = (
            "latest" not in self._enhanced_cache
            or self._cache_expired()
        )

        if need_build and not self._building:
            self._building = True

            try:
                await self.build()
            finally:
                self._building = False

        return self._enhanced_cache.get("latest")
    
    def _cache_expired(self) -> bool:
        if not self._last_build_ts:
            return True

        return (time.time() - self._last_build_ts) > self._ttl_seconds

    # ==================================================================
    # Core analytics (unchanged in structure; minor readability tweaks)
    # ==================================================================

    def _market_state(self, dfs: Dict[str, pd.DataFrame]) -> str:
        """Determine overall market state from BTC + major indices."""
        scores: List[float] = []
        for key in ("crypto:BTC/USDT", "index:^GSPC", "index:^IXIC"):
            df = dfs.get(key)
            if df is None or len(df) < 50:
                continue
            short = df["close"].rolling(20).mean().iloc[-1]
            long  = df["close"].rolling(50).mean().iloc[-1]
            last  = df["close"].iloc[-1]
            score = 0.0
            if short > long:
                score += 1.0
            if last > short:
                score += 0.5
            if last > long:
                score += 0.5
            scores.append(score - 1.0)   # centre near 0
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
            vol_ma    = df["volume"].rolling(20, min_periods=5).mean()
            vol_ratio = (
                df["volume"].iloc[-1] / vol_ma.iloc[-1]
                if vol_ma.iloc[-1] else 0.0
            )
            pct_24h = (
                (df["close"].iloc[-1] / df["close"].iloc[-24] - 1) * 100
                if len(df) >= 24 else 0.0
            )
            if vol_ratio >= 2.5 or abs(pct_24h) >= 5:
                ac, sym = key.split(":", 1)
                out.append({
                    "asset_class":    ac,
                    "symbol":         sym,
                    "volume_ratio":   round(float(vol_ratio), 2),
                    "change_24h_pct": round(float(pct_24h), 2),
                    "note":           "Volume spike" if vol_ratio >= 2.5 else "Strong move",
                })
        out.sort(
            key=lambda x: abs(x["change_24h_pct"]) + x["volume_ratio"],
            reverse=True,
        )
        return out[:8]

    # ------------------------------------------------------------------
    def _timezone_analysis(self, df: Optional[pd.DataFrame]) -> List[TimezoneSession]:
        if df is None or df.empty:
            return []
        d        = df.copy()
        d["hour"] = d.index.hour
        d["ret"]  = d["close"].pct_change().fillna(0)

        sessions: List[TimezoneSession] = []
        for name, (h0, h1) in _SESSIONS.items():
            mask = (d["hour"] >= h0) & (d["hour"] < h1)
            sub  = d[mask]
            if sub.empty:
                continue
            avg_vol   = float(sub["volume"].mean())
            avg_volat = float(sub["ret"].abs().mean() * 100)
            net       = (
                float((sub["close"].iloc[-1] / sub["close"].iloc[0] - 1) * 100)
                if len(sub) >= 2 else 0.0
            )
            sessions.append(TimezoneSession(
                session=name,           # type: ignore[arg-type]
                avg_volume=avg_vol,
                avg_volatility_pct=avg_volat,
                net_change_pct=net,
            ))
        return sessions

    # ------------------------------------------------------------------
    def _top_movers(
        self, dfs: Dict[str, pd.DataFrame]
    ) -> tuple[List[GainerLoser], List[GainerLoser]]:
        movers: List[GainerLoser] = []
        for key, df in dfs.items():
            if len(df) < 24:
                continue
            ac, sym = key.split(":", 1)
            pct = float((df["close"].iloc[-1] / df["close"].iloc[-24] - 1) * 100)
            movers.append(GainerLoser(
                symbol=sym,
                asset_class=ac,         # type: ignore[arg-type]
                price=float(df["close"].iloc[-1]),
                change_pct=round(pct, 3),
                volume=float(df["volume"].iloc[-24:].sum()),
            ))
        movers.sort(key=lambda x: x.change_pct, reverse=True)
        return movers[:5], list(reversed(movers[-5:]))

    # ------------------------------------------------------------------
    def _compose_legacy_insights(
        self,
        dfs: Dict[str, pd.DataFrame],
        sessions: List[TimezoneSession],
        anomalies: List[dict],
        market_state: str,
    ) -> List[str]:
        """
        Produce the legacy flat List[str] insights field.
        Now richer than before — each bullet tells a complete, data-backed story.
        """
        insights: List[str] = []

        # 1. Session volume leadership
        if sessions:
            top = max(sessions, key=lambda s: s.avg_volume)
            most_volatile = max(sessions, key=lambda s: s.avg_volatility_pct)
            insights.append(
                f"The {top.session.title()} session dominated trading volume "
                f"(avg {top.avg_volume:,.0f} units, {top.avg_volatility_pct:.3f}% avg hourly volatility). "
                + (
                    f"Notably, the {most_volatile.session.title()} session was more volatile "
                    f"({most_volatile.avg_volatility_pct:.3f}%/bar) despite lower volume — "
                    "suggesting sharp, low-liquidity price swings."
                    if most_volatile.session != top.session else ""
                )
            )

        # 2. Capital rotation: Crypto vs Gold
        btc  = dfs.get("crypto:BTC/USDT")
        gold = dfs.get("gold:GC=F")
        if btc is not None and gold is not None and len(btc) >= 24 and len(gold) >= 24:
            btc_pct  = (btc["close"].iloc[-1]  / btc["close"].iloc[-24]  - 1) * 100
            gold_pct = (gold["close"].iloc[-1] / gold["close"].iloc[-24] - 1) * 100
            if btc_pct < -1 and gold_pct > 0.3:
                insights.append(
                    f"Risk-off rotation detected: BTC ({btc_pct:+.2f}%) vs Gold ({gold_pct:+.2f}%). "
                    "Capital appears to be exiting crypto and moving into the safe-haven Gold trade — "
                    "a pattern that historically precedes extended crypto drawdowns when sustained."
                )
            elif btc_pct > 1 and gold_pct < -0.3:
                insights.append(
                    f"Risk-on flow confirmed: BTC ({btc_pct:+.2f}%) while Gold ({gold_pct:+.2f}%). "
                    "Investors are rotating out of safe-haven assets and into high-growth crypto, "
                    "signaling elevated risk appetite and positive macro sentiment."
                )

        # 3. Equities vs Forex (USD proxy)
        sp  = dfs.get("index:^GSPC")
        eur = dfs.get("forex:EURUSD=X")
        if sp is not None and eur is not None and len(sp) >= 24 and len(eur) >= 24:
            sp_pct  = (sp["close"].iloc[-1]  / sp["close"].iloc[-24]  - 1) * 100
            eur_pct = (eur["close"].iloc[-1] / eur["close"].iloc[-24] - 1) * 100
            if sp_pct > 0 and eur_pct > 0:
                insights.append(
                    f"Equities and EUR/USD both climbing ({sp_pct:+.2f}% / {eur_pct:+.2f}%) — "
                    "a USD weakness narrative. When stocks and EUR/USD rise together, "
                    "the driver is typically dollar depreciation rather than standalone equity strength."
                )
            elif sp_pct < -0.5 and eur_pct < -0.3:
                insights.append(
                    f"S&P 500 ({sp_pct:+.2f}%) and EUR/USD ({eur_pct:+.2f}%) both declining — "
                    "USD strength is creating headwinds for global risk assets. "
                    "Dollar appreciation typically pressures commodities, emerging markets, and crypto."
                )

        # 4. Most notable anomaly with interpretation
        if anomalies:
            a = anomalies[0]
            severity_word = (
                "critical" if abs(a["change_24h_pct"]) > 10 or a["volume_ratio"] > 5
                else "notable" if abs(a["change_24h_pct"]) > 5 else "elevated"
            )
            insights.append(
                f"Most {severity_word} anomaly: {a['symbol']} ({a['asset_class'].upper()}) "
                f"moved {a['change_24h_pct']:+.2f}% with {a['volume_ratio']}× volume. "
                f"{a['note']} — this level of activity requires a news-catalyst check "
                "to determine if it's a fundamental repricing or a technical/liquidity event."
            )

        # 5. Market state interpretation
        state_text = {
            "bullish": (
                "SMA trend filters align bullishly across major benchmarks. "
                "Momentum strategies are favored; watch for RSI divergence as an exhaustion signal."
            ),
            "bearish": (
                "Major benchmarks trading below their 50-period SMA — trend is structurally negative. "
                "Defensive positioning and cash preservation are the priority."
            ),
            "sideway": (
                "Market structure is range-bound with no clear directional bias. "
                "Mean-reversion strategies favored; wait for a volume-confirmed breakout before trending."
            ),
        }
        insights.append(state_text.get(market_state, "Market direction is currently unclear."))

        # 6. Volatility comparison across asset classes
        vol_summary = []
        for key, df in dfs.items():
            if len(df) < 24:
                continue
            vol = float(df["close"].pct_change().tail(24).std() * 100)
            ac  = key.split(":")[0]
            vol_summary.append((ac, vol))
        if vol_summary:
            by_vol = sorted(vol_summary, key=lambda x: x[1], reverse=True)
            highest = by_vol[0]
            lowest  = by_vol[-1]
            insights.append(
                f"Volatility spectrum: {highest[0].title()} assets are the most volatile "
                f"({highest[1]:.2f}% hourly std), while {lowest[0].title()} assets remain "
                f"the calmest ({lowest[1]:.2f}%). "
                "High volatility differential often signals cross-asset opportunity for pairs traders."
            )

        return insights


insight_service = InsightService()
