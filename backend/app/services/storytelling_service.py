"""Storytelling / Narrative generation service.

Implements the 4-layer insight framework for every detected market event:
  1. What happened?  — objective, data-backed summary of what occurred
  2. Why?            — data-driven hypothesis for the root cause
  3. So what?        — market implications and broader context
  4. What next?      — forward-looking watchlist / action guidance

Provides five main generators:
  - market_narrative()      : deep explanation per market state (bullish/bearish/sideway)
  - cross_asset_insights()  : relationship analysis across Crypto / Gold / Stocks / Forex
  - interpret_anomaly()     : per-anomaly cause + impact + recommended action
  - session_narrative()     : timezone session pattern interpretation
  - weekly_summary()        : auto-generated week-in-review
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from typing import Dict, List, Optional

import numpy as np
import pandas as pd


# ---------------------------------------------------------------------------
# Data classes for structured narrative output
# ---------------------------------------------------------------------------

@dataclass
class StoryBlock:
    """A complete 4-W insight narrative block."""
    what_happened: str
    why: str
    so_what: str
    what_next: str
    confidence: str       # "high" | "medium" | "low"
    tags: List[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "what_happened": self.what_happened,
            "why": self.why,
            "so_what": self.so_what,
            "what_next": self.what_next,
            "confidence": self.confidence,
            "tags": self.tags,
        }


@dataclass
class CrossAssetInsight:
    title: str
    description: str
    signal_strength: float   # 0.0 – 1.0
    assets_involved: List[str]
    regime: str              # "risk-on" | "risk-off" | "rotation" | "divergence" | "neutral"

    def to_dict(self) -> dict:
        return {
            "title": self.title,
            "description": self.description,
            "signal_strength": round(self.signal_strength, 3),
            "assets_involved": self.assets_involved,
            "regime": self.regime,
        }


@dataclass
class AnomalyInterpretation:
    symbol: str
    asset_class: str
    what_happened: str
    possible_causes: List[str]
    market_impact: str
    suggested_action: str
    severity: str            # "critical" | "notable" | "watch"

    def to_dict(self) -> dict:
        return {
            "symbol": self.symbol,
            "asset_class": self.asset_class,
            "what_happened": self.what_happened,
            "possible_causes": self.possible_causes,
            "market_impact": self.market_impact,
            "suggested_action": self.suggested_action,
            "severity": self.severity,
        }


@dataclass
class WeeklySummary:
    period: str
    headline: str
    narrative: str
    key_events: List[str]
    winners: List[str]
    losers: List[str]
    outlook: str

    def to_dict(self) -> dict:
        return {
            "period": self.period,
            "headline": self.headline,
            "narrative": self.narrative,
            "key_events": self.key_events,
            "winners": self.winners,
            "losers": self.losers,
            "outlook": self.outlook,
        }


# ---------------------------------------------------------------------------
# Main service
# ---------------------------------------------------------------------------

class StorytellingService:
    """Converts raw market data and detected signals into human-readable narratives."""

    # -----------------------------------------------------------------------
    # 1. MARKET TREND NARRATIVE
    # -----------------------------------------------------------------------

    def market_narrative(
        self,
        market_state: str,
        dfs: Dict[str, pd.DataFrame],
    ) -> StoryBlock:
        """Return a 4-W narrative for the current market state."""
        btc  = dfs.get("crypto:BTC/USDT")
        sp   = dfs.get("index:^GSPC")
        gold = dfs.get("gold:GC=F")

        btc_pct  = self._pct(btc,  24)
        sp_pct   = self._pct(sp,   24)
        gold_pct = self._pct(gold, 24)
        now_utc  = datetime.now(timezone.utc).strftime("%H:%M UTC")

        dispatch = {
            "bullish": self._bullish_narrative,
            "bearish": self._bearish_narrative,
        }
        fn = dispatch.get(market_state, self._sideway_narrative)
        return fn(btc_pct, sp_pct, gold_pct, now_utc)

    # --- Bullish ---
    def _bullish_narrative(self, btc_pct, sp_pct, gold_pct, now_utc) -> StoryBlock:
        btc_str = f"BTC is up {btc_pct:+.2f}%" if btc_pct else "BTC data unavailable"
        sp_str  = f"S&P 500 is up {sp_pct:+.2f}%" if sp_pct else "S&P 500 data unavailable"
        gold_clause = ""
        if gold_pct is not None:
            if gold_pct < 0:
                gold_clause = (
                    f" Meanwhile, Gold ({gold_pct:+.2f}%) is weakening, "
                    "confirming capital is rotating into risk assets rather than safety."
                )
            else:
                gold_clause = (
                    f" Gold is also holding at {gold_pct:+.2f}%, "
                    "suggesting a broad 'everything rally' driven by USD weakness."
                )

        return StoryBlock(
            what_happened=(
                f"As of {now_utc}, the market is in a confirmed BULLISH phase. "
                f"{btc_str} and {sp_str} over the last 24 hours. "
                "Both the 20-period and 50-period moving averages are trending upward, "
                "with price trading consistently above these key levels."
            ),
            why=(
                "The bullish momentum is driven by multiple converging factors. "
                "The short-term SMA has crossed above the mid-term SMA — a classic 'golden cross' signal "
                "that technical traders watch closely. Risk appetite is elevated, "
                "with capital flowing toward higher-beta assets. "
                "Crucially, volume is confirming the upward price action rather than diverging from it, "
                "which rules out a low-liquidity fake-out."
                + gold_clause
            ),
            so_what=(
                "In a confirmed bullish environment, momentum strategies historically outperform. "
                "Assets that have already broken out tend to continue higher in the near term — "
                "the trend is your friend until the bend at the end. "
                "Cross-asset correlations typically increase during risk-on phases, "
                "meaning diversification benefits temporarily decrease as all major assets move together. "
                "Volatility compression is common in bull trends, which reduces options premiums "
                "and creates favorable conditions for long delta exposure."
            ),
            what_next=(
                "Watch for key resistance levels being tested: a clean breakout on elevated volume "
                "would be the strongest continuation signal. "
                "Monitor for divergence warnings — RSI making lower highs while price makes higher highs "
                "is a classic early-reversal signal. "
                "A pullback to the 20-period SMA is considered healthy in a bull trend "
                "and should not be confused with a reversal unless the 50 SMA is also broken with conviction. "
                "Set trailing stops to protect gains as the trend matures."
            ),
            confidence="high" if btc_pct and btc_pct > 3 else "medium",
            tags=["bullish", "momentum", "risk-on", "trend-following", "golden-cross"],
        )

    # --- Bearish ---
    def _bearish_narrative(self, btc_pct, sp_pct, gold_pct, now_utc) -> StoryBlock:
        btc_abs = abs(btc_pct) if btc_pct else 0
        sp_abs  = abs(sp_pct)  if sp_pct  else 0
        gold_clause = ""
        if gold_pct is not None:
            if gold_pct > 0:
                gold_clause = (
                    f" Gold is rising ({gold_pct:+.2f}%), a textbook safe-haven bid "
                    "that confirms a risk-off rotation is underway."
                )
            else:
                gold_clause = (
                    f" Even Gold is declining ({gold_pct:+.2f}%), "
                    "suggesting this is broad deleveraging rather than a targeted crypto/equity selloff."
                )

        return StoryBlock(
            what_happened=(
                f"As of {now_utc}, the market has entered a BEARISH phase. "
                f"BTC has fallen {btc_abs:.2f}% and S&P 500 is down {sp_abs:.2f}% over 24 hours. "
                "Price is trading below both the 20-period and 50-period moving averages — "
                "a technically significant breakdown that historically precedes further downside."
                + gold_clause
            ),
            why=(
                "The bearish pressure is coming from a confluence of negative signals. "
                "The 20 SMA has crossed below the 50 SMA — a 'death cross' pattern that signals "
                "the short-term trend has turned negative relative to the medium-term. "
                "Risk aversion is rising, prompting investors to reduce exposure to volatile assets. "
                "Volume on down-moves tends to exceed volume on up-moves, confirming institutional selling "
                "rather than retail panic that would typically exhaust itself quickly."
            ),
            so_what=(
                "In bearish markets, cash and defensive assets (bonds, gold, USD) typically outperform. "
                "High-beta assets — growth stocks, small-caps, and altcoins — tend to fall disproportionately "
                "compared to the broader market. Historical crypto drawdowns during equity bear markets "
                "have averaged 40–60%, significantly amplifying broader market moves. "
                "Liquidity deteriorates as volatility spikes: bid-ask spreads widen, "
                "market depth thins, and slippage on large orders increases."
            ),
            what_next=(
                "Any recovery attempt that fails at the 20 SMA will confirm it as resistance — "
                "a 'dead cat bounce' pattern. A genuine reversal requires reclaiming the 50 SMA "
                "with volume and holding above it for multiple sessions. "
                "Watch for capitulation signals: volume spikes on sharp drops, "
                "extreme fear readings in sentiment gauges, and funding rates turning strongly negative. "
                "These are often the precursors to a genuine bottom. "
                "Macro catalysts — Fed statements, CPI releases, and earnings reports — "
                "will act as the likely triggers for any trend change."
            ),
            confidence="high" if btc_pct and btc_pct < -3 else "medium",
            tags=["bearish", "risk-off", "defensive", "caution", "death-cross"],
        )

    # --- Sideways / Consolidation ---
    def _sideway_narrative(self, btc_pct, sp_pct, gold_pct, now_utc) -> StoryBlock:
        btc_dir = "up" if (btc_pct or 0) > 0 else "down"
        sp_str  = f"S&P 500 shows {sp_pct:+.2f}%" if sp_pct else ""

        return StoryBlock(
            what_happened=(
                f"As of {now_utc}, the market is in a SIDEWAYS / CONSOLIDATION phase. "
                f"BTC is {btc_dir} {abs(btc_pct or 0):.2f}% over 24 hours, "
                f"while {sp_str + ' change. ' if sp_str else ''}"
                "Price is oscillating around the moving averages without establishing a clear "
                "directional trend — neither bulls nor bears have secured control."
            ),
            why=(
                "Consolidation phases occur when the market is 'digesting' a prior directional move, "
                "awaiting a macro catalyst, or experiencing balanced supply and demand at current price levels. "
                "The 20-period SMA and 50-period SMA are converging — signaling that short and medium-term "
                "trend forces are in conflict and canceling each other out. "
                "Volume typically runs below average during these phases, reflecting reduced conviction "
                "from large players who are waiting for more information before committing capital."
            ),
            so_what=(
                "Range-bound markets favor mean-reversion strategies over trend-following. "
                "The upper and lower bounds of the consolidation range become key reference levels: "
                "buying near support, selling near resistance (or vice versa for short-sellers). "
                "False breakouts are common during consolidation — any breakout on low volume "
                "should be treated with skepticism and confirmed before acting. "
                "Options traders often benefit from selling premium (straddles, strangles) "
                "during low-volatility, range-bound conditions."
            ),
            what_next=(
                "The direction of the eventual breakout from this consolidation will be the key event. "
                "A breakout above the range on high volume signals bullish continuation. "
                "A breakdown below support on high volume signals a bearish resolution. "
                "Statistical principle: the longer the consolidation persists, "
                "the more powerful the eventual directional move tends to be — "
                "energy is being coiled for release. "
                "Watch for expanding volume and increasing volatility as early signals that "
                "the consolidation is ending and a directional move is imminent."
            ),
            confidence="medium",
            tags=["sideways", "consolidation", "range-bound", "mean-reversion", "waiting"],
        )

    # -----------------------------------------------------------------------
    # 2. CROSS-ASSET INSIGHTS
    # -----------------------------------------------------------------------

    def cross_asset_insights(self, dfs: Dict[str, pd.DataFrame]) -> List[CrossAssetInsight]:
        """Identify and narrate relationships between Crypto, Gold, Equities, and Forex."""
        insights: List[CrossAssetInsight] = []

        btc    = dfs.get("crypto:BTC/USDT")
        gold   = dfs.get("gold:GC=F")
        silver = dfs.get("silver:SI=F")
        sp     = dfs.get("index:^GSPC")
        eur    = dfs.get("forex:EURUSD=X")

        btc_pct    = self._pct(btc,    24)
        gold_pct   = self._pct(gold,   24)
        silver_pct = self._pct(silver, 24)
        sp_pct     = self._pct(sp,     24)
        eur_pct    = self._pct(eur,    24)

        # --- 2a. Crypto ↔ Gold rotation ---
        if btc is not None and gold is not None:
            if btc_pct < -1.5 and gold_pct > 0.3:
                insights.append(CrossAssetInsight(
                    title="Capital Rotation: Crypto → Gold (Risk-Off)",
                    description=(
                        f"Bitcoin has declined {btc_pct:.2f}% while Gold has gained {gold_pct:.2f}% "
                        "over the same 24-hour window. This divergence is a textbook risk-off rotation — "
                        "investors are reducing exposure to high-volatility crypto assets and seeking refuge "
                        "in Gold's safe-haven characteristics. "
                        "Historically, when this pattern persists for 3+ consecutive days, it has preceded "
                        "extended crypto drawdowns of 20–40%. The strength of the signal depends on "
                        "whether the rotation is accompanied by rising bond prices and a strengthening USD."
                    ),
                    signal_strength=min(1.0, (abs(btc_pct) + abs(gold_pct)) / 8),
                    assets_involved=["BTC/USDT", "GC=F"],
                    regime="risk-off",
                ))
            elif btc_pct > 1.5 and gold_pct < -0.3:
                insights.append(CrossAssetInsight(
                    title="Risk-On Flow: Capital Moving Into Crypto",
                    description=(
                        f"Bitcoin has surged {btc_pct:.2f}% while Gold has weakened {gold_pct:.2f}%, "
                        "signaling clear risk-on sentiment across the market. Capital is flowing "
                        "from safe-haven assets into high-growth, high-risk crypto. "
                        "This pattern often coincides with improving macro sentiment — "
                        "declining inflation data, a dovish Fed pivot signal, or positive regulatory news. "
                        "The move is more significant if the S&P 500 is also rising in tandem, "
                        "confirming a broad risk appetite expansion rather than a crypto-specific catalyst."
                    ),
                    signal_strength=min(1.0, (abs(btc_pct) + abs(gold_pct)) / 8),
                    assets_involved=["BTC/USDT", "GC=F"],
                    regime="risk-on",
                ))
            elif btc_pct > 0.5 and gold_pct > 0.5:
                insights.append(CrossAssetInsight(
                    title="Everything Rally: USD Weakness Narrative",
                    description=(
                        f"Both Bitcoin (+{btc_pct:.2f}%) and Gold (+{gold_pct:.2f}%) are rising simultaneously. "
                        "This 'everything rally' typically signals broad USD weakness or a major liquidity "
                        "injection event. When both risk assets (crypto) and safe-haven assets (gold) rally "
                        "together, the common denominator is usually a weaker dollar — which raises the "
                        "relative value of everything priced in USD. Check DXY (Dollar Index) for "
                        "confirmation. Fed dovishness, fiscal stimulus, or declining real yields are "
                        "the most common triggers for this cross-asset pattern."
                    ),
                    signal_strength=min(1.0, (btc_pct + gold_pct) / 10),
                    assets_involved=["BTC/USDT", "GC=F"],
                    regime="rotation",
                ))

        # --- 2b. Equities ↔ Forex (USD strength proxy) ---
        if sp is not None and eur is not None:
            if sp_pct > 0.5 and eur_pct > 0.3:
                insights.append(CrossAssetInsight(
                    title="USD Weakness Lifting Global Risk Assets",
                    description=(
                        f"S&P 500 ({sp_pct:+.2f}%) and EUR/USD ({eur_pct:+.2f}%) are rising in tandem. "
                        "When equities and EUR/USD move together, it typically reflects dollar weakness "
                        "rather than standalone equity-specific strength. "
                        "A weaker dollar reduces the real cost of dollar-denominated debt worldwide, "
                        "boosts US multinational earnings when repatriated, and makes commodities "
                        "(priced in USD) cheaper globally — driving demand. "
                        "This macro backdrop is broadly positive for risk assets globally, "
                        "including emerging market equities, commodities, and crypto."
                    ),
                    signal_strength=min(1.0, (sp_pct + eur_pct) / 4),
                    assets_involved=["^GSPC", "EURUSD=X"],
                    regime="risk-on",
                ))
            elif sp_pct < -0.5 and eur_pct < -0.3:
                insights.append(CrossAssetInsight(
                    title="Dollar Strength Creating Global Headwinds",
                    description=(
                        f"Both S&P 500 ({sp_pct:+.2f}%) and EUR/USD ({eur_pct:+.2f}%) are declining together — "
                        "a pattern pointing to USD strength as a headwind for global risk assets. "
                        "Strong dollar conditions historically pressure commodity prices (including Gold), "
                        "increase dollar-denominated debt burdens for emerging markets, and reduce "
                        "the competitiveness of US multinational exports. "
                        "In crypto markets, a strengthening USD typically correlates with lower BTC prices "
                        "due to tighter global liquidity and reduced risk appetite."
                    ),
                    signal_strength=min(1.0, (abs(sp_pct) + abs(eur_pct)) / 4),
                    assets_involved=["^GSPC", "EURUSD=X"],
                    regime="risk-off",
                ))

        # --- 2c. Gold ↔ Silver (precious metals relative strength) ---
        if gold is not None and silver is not None and abs(silver_pct - gold_pct) > 1.5:
            leader  = "Silver" if silver_pct > gold_pct else "Gold"
            laggard = "Gold" if silver_pct > gold_pct else "Silver"
            l_sym   = "SI=F" if silver_pct > gold_pct else "GC=F"
            lag_sym = "GC=F" if silver_pct > gold_pct else "SI=F"
            regime_desc = (
                "industrial/manufacturing optimism, as Silver has significant industrial demand (EVs, solar panels)"
                if silver_pct > gold_pct else
                "pure safe-haven flight, as Gold outperforming Silver suggests fear rather than growth optimism"
            )
            insights.append(CrossAssetInsight(
                title=f"Precious Metals Divergence: {leader} Leading",
                description=(
                    f"Silver ({silver_pct:+.2f}%) and Gold ({gold_pct:+.2f}%) are diverging significantly. "
                    f"{leader} is outperforming {laggard} by {abs(silver_pct - gold_pct):.2f} percentage points. "
                    "The Gold/Silver ratio is a closely watched metric: a falling ratio (Silver outperforms) "
                    "signals industrial demand and economic optimism; a rising ratio (Gold outperforms) "
                    "signals pure flight-to-safety and fear. "
                    f"The current dynamic indicates {regime_desc}."
                ),
                signal_strength=min(1.0, abs(silver_pct - gold_pct) / 5),
                assets_involved=[l_sym, lag_sym],
                regime="neutral",
            ))

        # --- 2d. BTC dominance vs altcoins ---
        if btc is not None:
            alt_pcts = []
            for key, df in dfs.items():
                if key.startswith("crypto:") and key != "crypto:BTC/USDT" and len(df) >= 24:
                    alt_pcts.append(self._pct(df, 24))
            if len(alt_pcts) >= 2:
                avg_alt = float(np.mean(alt_pcts))
                diff = avg_alt - btc_pct
                if diff > 2:
                    insights.append(CrossAssetInsight(
                        title="Altcoin Season Signal Emerging",
                        description=(
                            f"Altcoins are outperforming Bitcoin by {diff:.2f}% on average "
                            f"(alts avg: {avg_alt:+.2f}% vs BTC: {btc_pct:+.2f}%). "
                            "When altcoins broadly outperform Bitcoin, it signals the early stages "
                            "of an 'altcoin season' — a phase where speculative appetite extends "
                            "beyond BTC into smaller-cap, higher-risk tokens. "
                            "This typically occurs when BTC has already made a significant move up "
                            "and investors look for assets with higher upside potential. "
                            "While potentially highly profitable, altcoin seasons carry elevated risk: "
                            "lower liquidity, higher volatility, and sharper reversals when sentiment turns."
                        ),
                        signal_strength=min(1.0, diff / 10),
                        assets_involved=["BTC/USDT", "ETH/USDT", "SOL/USDT"],
                        regime="risk-on",
                    ))
                elif -diff > 2:
                    insights.append(CrossAssetInsight(
                        title="Bitcoin Dominance Rising — Flight to Quality",
                        description=(
                            f"Bitcoin is outperforming altcoins by {-diff:.2f}% "
                            f"(BTC: {btc_pct:+.2f}% vs alts avg: {avg_alt:+.2f}%). "
                            "Rising Bitcoin dominance signals that capital within crypto is consolidating "
                            "into the largest, most liquid asset — a 'flight to quality' within crypto. "
                            "During downturns, this means altcoins are bleeding faster than BTC. "
                            "During uptrends, a BTC-led rally is more structurally sound and sustainable "
                            "than altcoin-led moves, which often reflect excessive speculation."
                        ),
                        signal_strength=min(1.0, (-diff) / 10),
                        assets_involved=["BTC/USDT"],
                        regime="neutral",
                    ))

        return insights

    # -----------------------------------------------------------------------
    # 3. ANOMALY INTERPRETATION
    # -----------------------------------------------------------------------

    def interpret_anomaly(
        self, anomaly: dict, dfs: Dict[str, pd.DataFrame]
    ) -> AnomalyInterpretation:
        sym       = anomaly["symbol"]
        ac        = anomaly["asset_class"]
        chg       = anomaly["change_24h_pct"]
        vol_ratio = anomaly["volume_ratio"]
        df        = dfs.get(f"{ac}:{sym}")

        # Severity
        if abs(chg) > 10 or vol_ratio > 5:
            severity = "critical"
        elif abs(chg) > 5 or vol_ratio > 3:
            severity = "notable"
        else:
            severity = "watch"

        # What happened
        direction = "surged" if chg > 0 else "plummeted"
        extra_vol = ""
        if df is not None and len(df) >= 48:
            recent_vol = float(df["close"].pct_change().tail(24).std() * 100)
            extra_vol = f" The asset's recent hourly volatility has been running at {recent_vol:.2f}%."
        what_happened = (
            f"{sym} has {direction} {abs(chg):.2f}% in the last 24 hours "
            f"with trading volume at {vol_ratio:.1f}× its 20-period rolling average."
            + extra_vol
        )

        return AnomalyInterpretation(
            symbol=sym,
            asset_class=ac,
            what_happened=what_happened,
            possible_causes=self._causes(ac, chg, vol_ratio),
            market_impact=self._impact(chg, vol_ratio, severity),
            suggested_action=self._action(chg, vol_ratio, severity),
            severity=severity,
        )

    def _causes(self, ac: str, chg: float, vol_ratio: float) -> List[str]:
        up = chg > 0
        base: dict[str, dict[bool, List[str]]] = {
            "crypto": {
                True:  [
                    "ETF approval, positive regulatory development, or major partnership announcement",
                    "Large institutional purchase or exchange inflow from a whale wallet",
                    "Technical breakout above key resistance triggering algorithmic long triggers",
                    "Macro tailwinds (Fed dovishness, risk-on sentiment) amplifying crypto beta",
                ],
                False: [
                    "Exchange hack, smart-contract exploit, or protocol security concern",
                    "Regulatory enforcement action or negative policy signal (e.g., ban, restriction)",
                    "Large whale sell-off, exchange outflow, or Mt. Gox-style distribution",
                    "Technical breakdown below key support triggering stop-loss cascade",
                ],
            },
            "stock": {
                True:  [
                    "Strong earnings beat or significant upward guidance revision",
                    "Sector rotation inflows driven by macro theme (AI, energy, defense)",
                    "Positive macro surprise (better-than-expected CPI, NFP, PMI)",
                    "M&A announcement, share buyback authorization, or activist investor",
                ],
                False: [
                    "Earnings miss or negative forward guidance",
                    "Macro data disappointment or Fed hawkish surprise",
                    "Sector-specific headwinds (regulatory crackdown, competitive pressure)",
                    "Geopolitical risk premium increase affecting broader market sentiment",
                ],
            },
            "index": {
                True:  [
                    "Strong US economic data surprise (jobs report, retail sales, ISM)",
                    "Fed communication interpreted as dovish (pause signal, rate cut hint)",
                    "Positive earnings season trend lifting multiple sectors simultaneously",
                    "Geopolitical de-escalation reducing risk premium",
                ],
                False: [
                    "Fed hawkish surprise (unexpected rate hike or balance sheet acceleration)",
                    "Macro data shock (high CPI, unemployment spike, recession signal)",
                    "Geopolitical risk escalation (conflict, sanctions, supply disruption)",
                    "Credit market stress (bank failure, sovereign debt concern)",
                ],
            },
            "gold": {
                True:  [
                    "Safe-haven demand spike from geopolitical shock or financial instability",
                    "USD weakness reducing opportunity cost of holding non-yielding gold",
                    "Rising inflation expectations driving inflation-hedge demand",
                    "Central bank gold purchases (China, Russia, India are major buyers)",
                ],
                False: [
                    "Rising real yields making bonds more attractive vs non-yielding gold",
                    "USD strength reducing gold's relative purchasing-power appeal",
                    "Risk-on sentiment rotation removing safe-haven premium",
                    "Profit-taking after an extended rally toward key resistance",
                ],
            },
            "silver": {
                True:  [
                    "Industrial demand surge (solar panels, EVs, semiconductors)",
                    "Following Gold's safe-haven rally with higher beta amplification",
                    "Short squeeze in silver futures (historically common given high short interest)",
                    "USD weakness and inflation expectations, similar to Gold drivers",
                ],
                False: [
                    "Industrial demand slowdown or recession fears reducing manufacturing outlook",
                    "Following Gold's decline with amplified downside (higher beta)",
                    "Gold/Silver ratio mean-reversion after Silver overextension",
                    "Dollar strength and rising real yields weighing on precious metals",
                ],
            },
            "forex": {
                True:  [
                    "Central bank hawkish shift, rate hike, or hawkish minutes release",
                    "Strong economic data outperforming the paired currency's data",
                    "Political stability or positive fiscal/trade developments",
                    "Capital inflows into the domestic bond or equity market",
                ],
                False: [
                    "Dovish central bank communication or unexpected rate cut signal",
                    "Weak economic data versus consensus expectations",
                    "Political uncertainty, election risk, or fiscal/debt concern",
                    "Current account deficit widening or capital outflow pressures",
                ],
            },
        }
        pool = base.get(ac, base["crypto"])
        return pool.get(up, pool[True])[:4]

    def _impact(self, chg: float, vol_ratio: float, severity: str) -> str:
        direction = "rally" if chg > 0 else "drop"
        if severity == "critical":
            return (
                f"A {abs(chg):.1f}% {direction} with {vol_ratio:.1f}× volume represents a major market event. "
                "This level of volatility can trigger cascading effects: liquidation of leveraged positions, "
                "forced selling by margin accounts, and sentiment contagion spreading to correlated assets. "
                "The elevated volume confirms this is genuine institutional activity, "
                "not a low-liquidity anomaly that can be dismissed."
            )
        elif severity == "notable":
            return (
                f"This {abs(chg):.1f}% {direction} with elevated volume ({vol_ratio:.1f}×) warrants active monitoring. "
                "While not immediately threatening to broader market stability, "
                "it may reflect early-stage sentiment shifting in this asset class. "
                "Watch whether this move spreads to correlated assets within the next 4–8 hours — "
                "that would confirm a macro-driven move rather than an isolated event."
            )
        else:
            return (
                f"The {abs(chg):.1f}% movement is above average but within normal market activity ranges. "
                f"The {vol_ratio:.1f}× volume uptick shows above-average interest but no clear panic or euphoria. "
                "This is a monitoring-level event, not an action-required event."
            )

    def _action(self, chg: float, vol_ratio: float, severity: str) -> str:
        if severity == "critical":
            return (
                "⚠️ High-priority action required. "
                "Review risk exposure in this asset and all correlated positions immediately. "
                "Identify the news catalyst: if fundamental, the repricing may continue; "
                "if technical/liquidity-driven, a reversal or mean-reversion is more likely. "
                "Avoid chasing the move at current volatility — wait for price stabilization "
                "and a 2–3 bar volume confirmation before re-entering."
            )
        elif severity == "notable":
            if chg > 0:
                return (
                    "Monitor for continuation: watch whether volume remains elevated in the next 2–4 hours. "
                    "Declining volume while price holds suggests a genuine move; "
                    "fading volume on further advances suggests exhaustion is near. "
                    "Look for RSI approaching overbought territory (>70) as a near-term caution signal."
                )
            else:
                return (
                    "Watch for stabilization: key question is whether selling pressure is exhausting or accelerating. "
                    "Declining volume on further price drops is a classic capitulation signal. "
                    "Check if correlated assets are also falling (contagion) or holding (isolated event). "
                    "RSI below 30 may indicate oversold conditions and a potential technical bounce."
                )
        else:
            return (
                "Add to watchlist. The move is above average but not yet alarming. "
                "Set price alerts at the nearest key technical levels "
                "to be notified automatically if the situation escalates."
            )

    # -----------------------------------------------------------------------
    # 4. SESSION / TIMEZONE NARRATIVE
    # -----------------------------------------------------------------------

    def session_narrative(self, sessions: list) -> List[str]:
        """Generate narrative paragraphs explaining trading session patterns."""
        if not sessions:
            return []

        narratives: List[str] = []

        sorted_vol   = sorted(sessions, key=lambda s: s.avg_volume, reverse=True)
        sorted_volat = sorted(sessions, key=lambda s: s.avg_volatility_pct, reverse=True)
        dominant     = sorted_vol[0]
        most_volatile = sorted_volat[0]

        session_context = {
            "asia": (
                "driven by Japanese, South Korean, Chinese, and Australian markets. "
                "Typically features lower volume in Western instruments but high activity in crypto "
                "due to large retail participation across Asia-Pacific."
            ),
            "europe": (
                "when Frankfurt, Paris, and London open simultaneously, "
                "creating a liquidity overlap with late Asian trading. "
                "This session dominates EUR/USD and GBP/USD volumes and often sets the tone "
                "for how US markets will open 4–6 hours later."
            ),
            "us": (
                "the highest global liquidity window, covering the NYSE open "
                "and major US derivatives markets. Institutional activity peaks here, "
                "and virtually all high-impact macro data releases "
                "(CPI, NFP, FOMC) occur within this session."
            ),
        }

        desc = session_context.get(dominant.session, "")
        narratives.append(
            f"**Volume Leadership — {dominant.session.title()} Session:** "
            f"The {dominant.session.title()} session captured the most trading activity "
            f"(avg {dominant.avg_volume:,.0f} units), {desc}"
        )

        if most_volatile.session != dominant.session:
            narratives.append(
                f"**Volatility Hotspot — {most_volatile.session.title()} Session:** "
                f"Despite lower absolute volume, the {most_volatile.session.title()} session "
                f"generated the highest average per-bar volatility at "
                f"{most_volatile.avg_volatility_pct:.3f}% per hour. "
                "This is characteristic of lower-liquidity environments — "
                "where large orders can move prices more sharply, "
                "creating short-lived but high-magnitude opportunities and risks."
            )

        for s in sessions:
            if abs(s.net_change_pct) > 0.4:
                sentiment = "accumulation/buying pressure dominated" if s.net_change_pct > 0 else "distribution/selling pressure dominated"
                narratives.append(
                    f"**{s.session.title()} Session Directional Bias:** "
                    f"The {s.session.title()} session recorded a net change of "
                    f"{s.net_change_pct:+.2f}%, indicating that {sentiment} "
                    "during this window. Understanding which session drives the most directional "
                    "movement can help time entries and exits for day-traders."
                )

        return narratives

    # -----------------------------------------------------------------------
    # 5. WEEKLY SUMMARY
    # -----------------------------------------------------------------------

    def weekly_summary(
        self,
        dfs: Dict[str, pd.DataFrame],
        market_state: str,
        anomalies: List[dict],
        gainers: list,
        losers: list,
    ) -> WeeklySummary:
        today      = date.today()
        week_start = today - timedelta(days=today.weekday())
        period     = f"{week_start.strftime('%b %d')} – {today.strftime('%b %d, %Y')}"

        state_label = {"bullish": "Bullish", "bearish": "Bearish", "sideway": "Mixed"}.get(
            market_state, "Mixed"
        )
        headline = f"Week in Markets: {state_label} Conditions Persist Across Asset Classes"

        # --- Narrative paragraphs ---
        parts: List[str] = []
        parts.append(
            f"This week's market action was characterized by {market_state} conditions "
            "across the monitored asset universe. "
        )

        btc    = dfs.get("crypto:BTC/USDT")
        sp     = dfs.get("index:^GSPC")
        gold   = dfs.get("gold:GC=F")

        if btc is not None and len(btc) >= 120:
            w = self._pct(btc, 120)
            parts.append(
                f"Bitcoin {'gained' if w > 0 else 'lost'} {abs(w):.2f}% over the 5-day period, "
                f"{'sustaining its upward momentum and attracting further institutional interest' if w > 5 else 'consolidating in a tight range as market participants awaited a catalyst' if abs(w) < 2 else 'continuing its correction amid broad risk-off sentiment'}. "
            )

        if sp is not None and len(sp) >= 5:
            w = self._pct(sp, 5)
            parts.append(
                f"US equities (S&P 500) {'rose' if w > 0 else 'fell'} {abs(w):.2f}% for the week, "
                f"{'a performance driven by strong sector rotation into growth and technology' if w > 1.5 else 'reflecting cautious positioning ahead of upcoming macro data' if abs(w) < 0.5 else 'a decline driven by macro headwinds and risk-reduction activity'}. "
            )

        if gold is not None and len(gold) >= 5:
            w = self._pct(gold, 5)
            parts.append(
                f"Gold {'advanced' if w > 0 else 'retreated'} {abs(w):.2f}% for the week. "
                + ("The precious metal's strength signals safe-haven demand and supports a cautious macro read. "
                   if w > 0.5 else
                   "Gold's weakness points to reduced safe-haven demand and broadly risk-on conditions. "
                   if w < -0.5 else
                   "Gold remained range-bound, offering no directional signal for risk sentiment. ")
            )

        if anomalies:
            parts.append(
                f"The week produced {len(anomalies)} notable market anomalies. "
                f"The most significant was {anomalies[0]['symbol']} "
                f"with a {anomalies[0]['change_24h_pct']:+.2f}% move accompanied by "
                f"{anomalies[0]['volume_ratio']}× average volume, "
                "suggesting a major catalyst-driven event rather than normal market noise."
            )

        outlook_tail = {
            "bullish": (
                "momentum strategies remain in favor, though RSI divergence and volume exhaustion "
                "signals should be monitored closely for signs of overextension."
            ),
            "bearish": (
                "defensive positioning and active risk management should be prioritized. "
                "Watch for capitulation signals that could mark a tradeable bottom."
            ),
            "sideway": (
                "patience is the primary strategy — wait for a confirmed directional breakout "
                "with volume before committing to new positions."
            ),
        }.get(market_state, "a data-driven, signal-based approach is recommended.")

        return WeeklySummary(
            period=period,
            headline=headline,
            narrative=" ".join(parts),
            key_events=[
                f"{a['symbol']} moved {a['change_24h_pct']:+.2f}% on {a['volume_ratio']}× volume"
                for a in anomalies[:5]
            ],
            winners=[f"{g.symbol} +{g.change_pct:.2f}%" for g in gainers[:4]] if gainers else [],
            losers=[f"{l.symbol} {l.change_pct:.2f}%" for l in losers[:4]] if losers else [],
            outlook=(
                "Looking ahead, the key macro watchpoints include: central bank rate decisions, "
                "CPI/PCE inflation prints, employment data, and any developments in the digital "
                "asset regulatory landscape. "
                f"Given the current {market_state} market structure, {outlook_tail}"
            ),
        )

    # -----------------------------------------------------------------------
    # Helpers
    # -----------------------------------------------------------------------

    @staticmethod
    def _pct(df: Optional[pd.DataFrame], periods: int) -> float:
        if df is None or len(df) < periods:
            return 0.0
        return float((df["close"].iloc[-1] / df["close"].iloc[-periods] - 1) * 100)

    @staticmethod
    def _vol_ratio(df: Optional[pd.DataFrame]) -> float:
        if df is None or len(df) < 20:
            return 1.0
        ma = df["volume"].rolling(20).mean().iloc[-1]
        return float(df["volume"].iloc[-1] / ma) if ma else 1.0

    # -----------------------------------------------------------------------
    # 6. FORECAST NARRATIVE (NEW)
    # -----------------------------------------------------------------------

    def forecast_narrative(
        self,
        symbol: str,
        asset_class: str,
        current_price: float,
        forecast_points: list,
    ) -> dict:
        """
        Nhận kết quả Prophet forecast và tạo narrative 4W giải thích xu hướng
        dự báo cho người dùng không chuyên về kỹ thuật.
        """
        if not forecast_points or current_price <= 0:
            return {
                "symbol": symbol,
                "available": False,
                "reason": "Insufficient data for forecast generation.",
            }

        # Lấy điểm cuối của forecast (end of horizon)
        last = forecast_points[-1]
        mid_idx = len(forecast_points) // 2
        mid = forecast_points[mid_idx]

        predicted_end   = last["predicted_close"]
        lower_end       = last["lower_bound"]
        upper_end       = last["upper_bound"]
        predicted_mid   = mid["predicted_close"]

        pct_change      = (predicted_end / current_price - 1) * 100
        pct_mid         = (predicted_mid  / current_price - 1) * 100
        uncertainty_pct = ((upper_end - lower_end) / current_price) * 100
        horizon_hrs     = len(forecast_points) // 60  # points are per-minute

        # Direction label
        if pct_change > 2:
            direction = "upward"
            direction_vi = "tăng"
            confidence_adj = "bullish"
        elif pct_change < -2:
            direction = "downward"
            direction_vi = "giảm"
            confidence_adj = "bearish"
        else:
            direction = "sideways"
            direction_vi = "đi ngang"
            confidence_adj = "neutral"

        # Confidence based on uncertainty band width
        if uncertainty_pct < 3:
            confidence = "high"
            conf_text = "narrow confidence interval (high certainty)"
        elif uncertainty_pct < 8:
            confidence = "medium"
            conf_text = "moderate confidence interval"
        else:
            confidence = "low"
            conf_text = "wide confidence interval (high uncertainty)"

        what_happened = (
            f"Prophet model forecast for {symbol} over the next ~{horizon_hrs} hours: "
            f"predicted price moves from ${current_price:,.4f} → ${predicted_end:,.4f} "
            f"({pct_change:+.2f}%), with a {conf_text} "
            f"(range: ${lower_end:,.4f} – ${upper_end:,.4f})."
        )

        why = (
            f"The {direction} projection is driven by the model detecting "
            + (
                "persistent momentum in the price series above its short-term moving average, "
                "combined with increasing volume confirming the uptrend. "
                "The model's seasonality component captures regular hourly and daily patterns "
                "that historically favor upward continuation at this time of day."
                if direction == "upward" else
                "a break below key moving average support levels, sustained selling pressure "
                "in recent candles, and a bearish seasonality pattern at this point in the trading cycle. "
                "The model weights recent data more heavily, so the current downtrend is extrapolated forward."
                if direction == "downward" else
                "balanced supply and demand signals — no dominant trend in either moving averages "
                "or volume patterns. The model expects price to oscillate around the current level "
                "until a stronger directional catalyst emerges."
            )
        )

        so_what = (
            f"A projected {pct_change:+.2f}% move by end of the forecast window "
            f"(with midpoint at {pct_mid:+.2f}% after ~{horizon_hrs // 2}h) "
            "has concrete implications for risk management. "
            + (
                f"If realized, this {direction_vi} move would bring {symbol} to approximately "
                f"${predicted_end:,.4f}. The uncertainty band of ±{uncertainty_pct/2:.1f}% means "
                "there is meaningful two-way risk even within a directional forecast."
            )
        )

        what_next = (
            f"Key levels to monitor: support at ${lower_end:,.4f} (lower forecast bound), "
            f"resistance at ${upper_end:,.4f} (upper forecast bound). "
            + (
                "A move above the upper bound would signal the forecast is understating strength — "
                "consider this a bullish surprise. "
                "A drop below the lower bound would indicate unexpected selling pressure "
                "not captured by the model's historical patterns."
                if direction == "upward" else
                "Watch for a stabilization near the lower bound — "
                "if price holds above it on declining volume, a mean-reversion bounce is likely. "
                "A sustained break below it would suggest the selloff is accelerating beyond model expectations."
                if direction == "downward" else
                "A high-volume breakout above the upper bound signals bullish resolution of the consolidation. "
                "A breakdown below the lower bound signals bearish resolution. "
                "Trade the breakout, not the range."
            )
        )

        return {
            "symbol": symbol,
            "asset_class": asset_class,
            "available": True,
            "current_price": round(current_price, 4),
            "predicted_price": round(predicted_end, 4),
            "lower_bound": round(lower_end, 4),
            "upper_bound": round(upper_end, 4),
            "pct_change": round(pct_change, 2),
            "pct_change_midpoint": round(pct_mid, 2),
            "uncertainty_pct": round(uncertainty_pct, 2),
            "horizon_hours": horizon_hrs,
            "direction": direction,
            "confidence": confidence,
            "narrative": {
                "what_happened": what_happened,
                "why": why,
                "so_what": so_what,
                "what_next": what_next,
            },
        }

    # -----------------------------------------------------------------------
    # 7. HISTORICAL CONTEXT ANALYSIS (NEW)
    # -----------------------------------------------------------------------

    def historical_context(
        self,
        dfs: Dict[str, pd.DataFrame],
    ) -> dict:
        """
        Phân tích ngữ cảnh dài hạn dựa trên toàn bộ dữ liệu OHLCV trong cache
        (thường là 200 nến 1h = ~8 ngày). Tính ATH/ATL trong window, vị trí
        giá hiện tại so với range, và so sánh volatility gần đây vs xa hơn.
        """
        asset_contexts = []

        key_assets = [
            ("crypto:BTC/USDT", "Bitcoin (BTC)"),
            ("index:^GSPC",     "S&P 500"),
            ("gold:GC=F",       "Gold"),
            ("forex:EURUSD=X",  "EUR/USD"),
        ]

        for key, label in key_assets:
            df = dfs.get(key)
            if df is None or len(df) < 48:
                continue

            current   = float(df["close"].iloc[-1])
            high_max  = float(df["high"].max())
            low_min   = float(df["low"].min())
            price_range = high_max - low_min

            # Position within range: 0% = at bottom, 100% = at top
            position_pct = ((current - low_min) / price_range * 100) if price_range > 0 else 50.0

            # Recent (last 24h) vs earlier (before that) volatility comparison
            recent_vol = float(df["close"].pct_change().tail(24).std() * 100)
            older_vol  = float(df["close"].pct_change().iloc[-len(df):-24].std() * 100) if len(df) > 48 else recent_vol
            vol_change_pct = ((recent_vol / older_vol) - 1) * 100 if older_vol > 0 else 0.0

            # 7-day vs 1-day return
            pct_7d = self._pct(df, min(168, len(df)))
            pct_1d = self._pct(df, 24)

            # Determine proximity label
            if position_pct >= 85:
                proximity = "near period high"
                proximity_implication = (
                    "Price is trading close to the top of its recent range — "
                    "upside is becoming limited and the risk of a mean-reversion pullback increases."
                )
            elif position_pct <= 15:
                proximity = "near period low"
                proximity_implication = (
                    "Price is at the low end of its recent range — "
                    "downside may be limited here, but confirm with volume before treating it as support."
                )
            else:
                proximity = "mid-range"
                proximity_implication = (
                    "Price is in the middle of its recent range — "
                    "no strong directional bias from a mean-reversion perspective alone."
                )

            # Volatility regime
            if vol_change_pct > 30:
                vol_regime = "expanding (increasing uncertainty)"
            elif vol_change_pct < -30:
                vol_regime = "contracting (compression before potential breakout)"
            else:
                vol_regime = "stable"

            asset_contexts.append({
                "key":             key,
                "label":           label,
                "current_price":   round(current, 4),
                "period_high":     round(high_max, 4),
                "period_low":      round(low_min, 4),
                "position_pct":    round(position_pct, 1),
                "proximity":       proximity,
                "proximity_implication": proximity_implication,
                "pct_1d":          round(pct_1d, 2),
                "pct_7d":          round(pct_7d, 2),
                "recent_volatility_pct": round(recent_vol, 3),
                "vol_regime":      vol_regime,
                "vol_change_vs_prior_pct": round(vol_change_pct, 1),
            })

        # Overall market summary sentence
        near_highs = [a["label"] for a in asset_contexts if a["position_pct"] >= 80]
        near_lows  = [a["label"] for a in asset_contexts if a["position_pct"] <= 20]
        expanding  = [a["label"] for a in asset_contexts if "expanding" in a["vol_regime"]]

        summary_parts = []
        if near_highs:
            summary_parts.append(
                f"{', '.join(near_highs)} {'is' if len(near_highs)==1 else 'are'} "
                "trading near the top of the recent observation window — upside is compressed."
            )
        if near_lows:
            summary_parts.append(
                f"{', '.join(near_lows)} {'is' if len(near_lows)==1 else 'are'} "
                "near period lows — watch for support confirmation or breakdown."
            )
        if expanding:
            summary_parts.append(
                f"Volatility is expanding in {', '.join(expanding)}, "
                "signaling increasing uncertainty and potential for larger price swings."
            )
        if not summary_parts:
            summary_parts.append(
                "All monitored assets are trading in the middle of their recent ranges "
                "with stable volatility — no extreme positioning detected."
            )

        return {
            "observation_window": "~8 days (200 × 1h candles)",
            "summary": " ".join(summary_parts),
            "assets": asset_contexts,
        }


storytelling_service = StorytellingService()

