"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { format } from "date-fns";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { useDateRangeStore } from "@/lib/stores/dateRangeStore";
import type { AssetClass, MarketOverview, PriceTick } from "@/lib/types";
import { fmtNumber, fmtPct } from "@/lib/utils";

import Plot from "@/components/charts/PlotlyClient";

const PLOT_LAYOUT_BASE = {
  paper_bgcolor: "transparent",
  plot_bgcolor: "transparent",
  font: { color: "#e6edf7", size: 11 },
  margin: { t: 20, l: 40, r: 20, b: 35 },
  xaxis: { gridcolor: "rgba(31,42,64,0.5)" },
  yaxis: { gridcolor: "rgba(31,42,64,0.5)" },
  autosize: true,
};

// =============================================================
// 1. Dominance Donut – BTC / ETH / Others
// =============================================================
export function DominanceDonut() {
  const [ov, setOv] = useState<MarketOverview | null>(null);
  useEffect(() => {
    const load = () => api.overview().then(setOv).catch(() => { });
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  const ready = ov && ov.btc_dominance > 0;
  return (
    <Card title="Market Share Allocation" centerTitle>
      {ready ? (
        <>
          <Plot
            data={[{
              type: "pie",
              hole: 0.6,
              labels: ["Bitcoin", "Ethereum", "Altcoins"],
              values: [
                ov!.btc_dominance,
                ov!.eth_dominance,
                Math.max(0, 100 - ov!.btc_dominance - ov!.eth_dominance),
              ],
              marker: { colors: ["#f7931a", "#22d3ee", "#8b5cf6"] },
              textinfo: "label+percent",
              hovertemplate: "%{label}<br>%{value:.2f}%<extra></extra>",
              textposition: "outside",
              automargin: true,
              insidetextorientation: "radial",
            }]}
            layout={{
              ...PLOT_LAYOUT_BASE,
              showlegend: false,
              height: 260,
              margin: { t: 40, b: 40, l: 60, r: 60 }
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: "100%", height: "280px" }}
            useResizeHandler
          />
          <div className="flex-1" />
          <div className="mt-3 p-3 bg-bg-card/50 border border-line/40 rounded-lg text-[13px] text-text-primary leading-relaxed min-h-[150px] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3 border-b border-line/20 pb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse" />
                <p className="uppercase tracking-widest text-[10px] text-text-muted font-bold">Allocation Analysis</p>
              </div>
              <p>Bitcoin maintains a dominant market position at <span className="text-accent-cyan font-bold">{ov!.btc_dominance.toFixed(1)}%</span>, followed by Ethereum at <span className="text-accent-cyan font-bold">{ov!.eth_dominance.toFixed(1)}%</span>. Altcoins collectively represent <span className="text-accent-cyan font-bold">{Math.max(0, 100 - ov!.btc_dominance - ov!.eth_dominance).toFixed(1)}%</span> of the global asset landscape.</p>
            </div>
            <div className="mt-3 pt-3 border-t border-line/30">
              <p className="text-[13px] text-text-primary leading-relaxed">
                <span className="text-accent-cyan font-bold uppercase text-[10px] mr-2">Strategy:</span> 
                {ov!.btc_dominance > 50 
                  ? "High BTC dominance suggests a 'Flight to Safety'. During these periods, focus on large-cap stability and capital preservation rather than speculative altcoin plays which may suffer from higher volatility and liquidity drains." 
                  : "Decreasing BTC dominance often signals an 'Alt-season' expansion. Capital is rotating into high-beta assets. Consider diversifying into leading mid-cap sectors to capture outsized gains as market breadth expands."}
              </p>
            </div>
          </div>
        </>
      ) : (
        <Skeleton h={260} />
      )}
    </Card>
  );
}

// =============================================================
// 2. Fear & Greed Gauge
// =============================================================
export function FearGreedGauge() {
  const [ov, setOv] = useState<MarketOverview | null>(null);
  useEffect(() => {
    const load = () => api.overview().then(setOv).catch(() => { });
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  const v = ov?.fear_greed ?? null;
  const label =
    v == null ? "—" :
      v < 25 ? "High Pessimism" :
        v < 45 ? "Cautious Pessimism" :
          v < 55 ? "Market Neutral" :
            v < 75 ? "Bullish Optimism" : "Peak Euphoria";

  const sentiment =
    v == null ? "" :
      v < 25 ? "signals a period of high pessimism, often considered an accumulation zone for institutional buyers" :
        v < 45 ? "indicates cautious pessimism in the market with selective engagement opportunities" :
          v < 55 ? "shows an equilibrium between market participants with no clear directional bias" :
            v < 75 ? "suggests growing optimism with strong capital inflow into risk assets" :
              "reflects peak euphoria, which historically may precede a significant market consolidation";

  return (
    <Card title="Market Sentiment Index" centerTitle>
      {v != null ? (
        <>
          <Plot
            data={[{
              type: "indicator",
              mode: "gauge+number",
              value: v,
              number: { font: { size: 40, color: "#e6edf7" } },
              gauge: {
                axis: { range: [0, 100], tickcolor: "#9aa6bd", tickfont: { color: "#9aa6bd" } },
                bar: { color: "#22d3ee", thickness: 0.25 },
                bgcolor: "rgba(31,42,64,0.4)",
                steps: [
                  { range: [0, 25], color: "rgba(234,57,67,0.6)" },
                  { range: [25, 45], color: "rgba(234,57,67,0.3)" },
                  { range: [45, 55], color: "rgba(154,166,189,0.3)" },
                  { range: [55, 75], color: "rgba(22,199,132,0.3)" },
                  { range: [75, 100], color: "rgba(22,199,132,0.6)" },
                ],
                threshold: { line: { color: "#facc15", width: 3 }, thickness: 0.8, value: v },
              },
            }]}
            layout={{ ...PLOT_LAYOUT_BASE, height: 260, margin: { t: 30, l: 30, r: 30, b: 10 } }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: "100%", height: "280px" }}
            useResizeHandler
          />
          <div className="flex-1" />
          <div className="text-center text-sm text-text-muted -mt-4 mb-3">{label}</div>
          <div className="mt-3 p-3 bg-bg-card/50 border border-line/40 rounded-lg text-[13px] text-text-primary leading-relaxed min-h-[150px] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3 border-b border-line/20 pb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
                <p className="uppercase tracking-widest text-[10px] text-text-muted font-bold">Sentiment Analysis</p>
              </div>
              <p>Current sentiment score at <span className="text-accent-green font-bold">{v.toFixed(0)}</span> {sentiment}.</p>
            </div>
            <div className="mt-3 pt-3 border-t border-line/30">
              <p className="text-[13px] text-text-primary leading-relaxed">
                <span className="text-accent-cyan font-bold uppercase text-[10px] mr-2">Strategy:</span> 
                {v < 30 
                  ? "Extreme Fear often marks a structural market bottom. Historically, this is an optimal 'Accumulation Zone' for long-term buyers. Focus on assets with strong fundamentals that are being unfairly punished by panic selling." 
                  : v > 70 
                    ? "Extreme Greed indicates potential market exhaustion. Consider tightening trailing stop-losses and taking partial profits. Be cautious of 'FOMO' buying as the risk-to-reward ratio becomes increasingly unfavorable." 
                    : "Market is in an equilibrium phase. Maintain neutral core positions and wait for a clear directional breakout before adding significant directional risk."}
              </p>
            </div>
          </div>
        </>
      ) : (
        <Skeleton h={260} />
      )}
    </Card>
  );
}

// =============================================================
// 3. Volume by Asset Class (bar)
// =============================================================
export function VolumeByAssetClass() {
  const [ticks, setTicks] = useState<PriceTick[]>([]);
  useEffect(() => {
    const load = () => api.prices().then(setTicks).catch(() => { });
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  const data = useMemo(() => {
    const agg: Record<string, number> = {};
    ticks.forEach((t) => {
      agg[t.asset_class] = (agg[t.asset_class] ?? 0) + (t.volume_24h || 0);
    });
    const entries = Object.entries(agg).sort((a, b) => b[1] - a[1]);
    return {
      x: entries.map(([k]) => k.toUpperCase()),
      y: entries.map(([, v]) => v),
      entries,
    };
  }, [ticks]);

  const topClass = data.entries.length > 0 ? data.entries[0] : null;

  return (
    <Card title="Liquidity Distribution (24h)" centerTitle>
      {data.x.length > 0 ? (
        <>
          <Plot
            data={[{
              type: "bar",
              x: data.x, y: data.y,
              marker: {
                color: data.y,
                colorscale: [[0, "#1a2438"], [1, "#22d3ee"]],
              },
              hovertemplate: "%{x}<br>$%{y:,.0f}<extra></extra>",
            }]}
            layout={{
              ...PLOT_LAYOUT_BASE,
              height: 280,
              margin: { ...PLOT_LAYOUT_BASE.margin, l: 80, b: 50 }, // More space for rotated labels
              xaxis: {
                ...PLOT_LAYOUT_BASE.xaxis,
                type: "category",
                tickangle: -45,
              },
              yaxis: { ...PLOT_LAYOUT_BASE.yaxis, type: "log", title: "Volume (USD)" },
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: "100%", height: "280px" }}
            useResizeHandler
          />
          <div className="flex-1" />
          <div className="mt-3 p-3 bg-bg-card/50 border border-line/40 rounded-lg text-[13px] text-text-primary leading-relaxed min-h-[150px] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3 border-b border-line/20 pb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-pulse" />
                <p className="uppercase tracking-widest text-[10px] text-text-muted font-bold">Liquidity Profile</p>
              </div>
              <p>Trading volume across <span className="text-text-primary font-bold">{data.x.length}</span> asset classes indicates significant liquidity in <span className="text-accent-blue font-bold">{topClass?.[0].toUpperCase()}</span>, with capital flows reaching <span className="text-text-primary font-bold">${(topClass?.[1] ?? 0).toLocaleString()}</span>.</p>
            </div>
            <div className="mt-3 pt-3 border-t border-line/30">
              <p className="text-[13px] text-text-primary leading-relaxed">
                <span className="text-accent-cyan font-bold uppercase text-[10px] mr-2">Strategy:</span> 
                Liquidity is the lifeblood of price action. High volume in the {topClass?.[0]} sector confirms the validity of the current trend. Focus trading activity here to ensure minimal slippage and efficient execution during high-volatility sessions.
              </p>
            </div>
          </div>
        </>
      ) : (
        <Skeleton h={260} />
      )}
    </Card>
  );
}

// =============================================================
// 4. Returns Distribution Histogram (24h % across all assets)
// =============================================================
export function ReturnsDistribution() {
  const [ticks, setTicks] = useState<PriceTick[]>([]);
  useEffect(() => {
    const load = () => api.prices().then(setTicks).catch(() => { });
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  const values = useMemo(
    () => ticks.map((t) => t.change_24h_pct).filter((v) => Number.isFinite(v)),
    [ticks]
  );

  const stats = useMemo(() => {
    if (values.length === 0) return null;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const pos = values.filter((v) => v > 0).length;
    return { mean, pos, neg: values.length - pos };
  }, [values]);

  return (
    <Card
      title="Market Breadth Analysis"
      centerTitle
      action={
        stats && (
          <div className="text-xs flex gap-3 num-tabular opacity-70">
            <span className="text-text-primary">{stats.pos} Gainers</span>
            <span className="text-text-primary">{stats.neg} Losers</span>
            <span className="text-text-muted">Avg {fmtPct(stats.mean)}</span>
          </div>
        )
      }
    >
      {values.length > 0 ? (
        <>
          <Plot
            data={[
              {
                type: "histogram",
                x: values.filter(v => v < 0),
                name: "Losers",
                marker: { color: "#ea3943", line: { color: "rgba(255,255,255,0.1)", width: 1 } },
                opacity: 0.8,
                xbins: { size: 0.5 },
                hovertemplate: "Loss %{x}: %{y} assets<extra></extra>",
              },
              {
                type: "histogram",
                x: values.filter(v => v >= 0),
                name: "Gainers",
                marker: { color: "#16c784", line: { color: "rgba(255,255,255,0.1)", width: 1 } },
                opacity: 0.8,
                xbins: { size: 0.5 },
                hovertemplate: "Gain %{x}: %{y} assets<extra></extra>",
              }
            ]}
            layout={{
              ...PLOT_LAYOUT_BASE,
              height: 280,
              barmode: "overlay",
              showlegend: false,
              margin: { ...PLOT_LAYOUT_BASE.margin, l: 50, b: 50, t: 10 },
              xaxis: {
                ...PLOT_LAYOUT_BASE.xaxis,
                type: "linear",
                title: "Daily Return %",
                zeroline: true,
                zerolinecolor: "rgba(255,255,255,0.5)",
                ticksuffix: "%",
                nticks: 10,
              },
              yaxis: {
                ...PLOT_LAYOUT_BASE.yaxis,
                title: "Asset Count",
                gridcolor: "rgba(255,255,255,0.05)",
              },
              bargap: 0.05,
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: "100%", height: "280px" }}
            useResizeHandler
          />
          <div className="flex-1" />
          <div className="mt-3 p-3 bg-bg-card/50 border border-line/40 rounded-lg text-[13px] text-text-primary leading-relaxed min-h-[150px] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3 border-b border-line/20 pb-2">
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${stats && stats.mean >= 0 ? "bg-accent-green" : "bg-accent-red"}`} />
                <p className="uppercase tracking-widest text-[10px] text-text-muted font-bold">Breadth Analysis</p>
              </div>
              {stats && (
                <p>Current distribution profile across <span className="text-text-primary font-bold">{values.length} assets</span> indicates a <span className={stats.mean > 0 ? "text-accent-green font-bold" : "text-accent-red font-bold"}>{stats.mean > 0 ? "bullish" : "bearish"}</span> skew. The majority of volatility is concentrated in the <span className="text-text-primary font-bold">{fmtPct(stats.mean)}</span> segment.</p>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-line/30">
              <p className="text-[13px] text-text-primary leading-relaxed">
                <span className="text-accent-cyan font-bold uppercase text-[10px] mr-2">Strategy:</span> 
                {stats && stats.pos > stats.neg 
                  ? "Bullish market breadth suggests a healthy, broad-based rally. Capital is flowing across multiple sectors rather than just a few leaders. Strategy: Maintain a pro-risk stance, but use oscillators to spot localized overextension in hot sectors." 
                  : "Negative breadth indicates systemic weakness, even if large-cap indices remain stable. Strategy: Prioritize capital preservation. Be wary of 'Bull Traps' and wait for a breadth reversal before adding significant directional risk."}
              </p>
            </div>
          </div>
        </>
      ) : (
        <Skeleton h={260} />
      )}
    </Card>
  );
}

// =============================================================
// 5. Top Market-Cap Crypto (horizontal bar, top 10)
// =============================================================
export function TopMarketCap() {
  const [ticks, setTicks] = useState<PriceTick[]>([]);
  useEffect(() => {
    const load = () => api.prices().then(setTicks).catch(() => { });
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  const data = useMemo(() => {
    const items = ticks
      .filter((t) => t.asset_class === "crypto" && (t.market_cap ?? 0) > 0)
      .sort((a, b) => (b.market_cap ?? 0) - (a.market_cap ?? 0))
      .slice(0, 10);
    return {
      labels: items.map((t) => t.symbol.replace("/USDT", "")),
      values: items.map((t) => t.market_cap ?? 0),
      changes: items.map((t) => t.change_24h_pct),
      topAsset: items[0],
    };
  }, [ticks]);

  return (
    <Card title="Global Asset Capitalization" centerTitle>
      {data.labels.length > 0 ? (
        <>
          <Plot
            data={[{
              type: "bar",
              orientation: "h",
              x: data.values,
              y: data.labels,
              marker: {
                color: data.labels.map((_, i) => i),
                colorscale: [
                  [0, "#3b82f6"],    // Professional Blue
                  [0.25, "#10b981"], // Emerald Green
                  [0.5, "#f59e0b"],  // Amber/Gold
                  [0.75, "#ef4444"], // Deep Rose
                  [1, "#8b5cf6"],    // Royal Purple
                ],
              },
              text: data.values.map((v) => "$" + fmtNumber(v)),
              textposition: "outside" as any,
              cliponaxis: false,
              hovertemplate: "%{y}<br>Mcap $%{x:,.0f}<br>24h %{customdata:+.2f}%<extra></extra>",
              customdata: data.changes,
            }]}
            layout={{
              ...PLOT_LAYOUT_BASE,
              height: 320,
              margin: { t: 20, l: 100, r: 150, b: 40 },
              yaxis: {
                ...PLOT_LAYOUT_BASE.yaxis,
                autorange: "reversed",
                title: { text: "Top Assets", standoff: 20 }
              },
              xaxis: { ...PLOT_LAYOUT_BASE.xaxis, type: "log", title: "Valuation (USD) · Log Scale" },
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: "100%", height: "320px" }}
            useResizeHandler
          />
          <div className="mt-3 p-3 bg-bg-card/50 border border-line/40 rounded-lg text-[13px] text-text-primary leading-relaxed min-h-[150px] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3 border-b border-line/20 pb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
                <p className="uppercase tracking-widest text-[10px] text-text-muted font-bold">Dominance Analysis</p>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <p className="text-text-muted uppercase text-[10px] font-bold tracking-tighter">Market Hierarchy</p>
                  <p>
                    <span className="text-text-primary font-bold">{data.topAsset?.symbol.replace("/USDT", "")}</span> leads with a cap of <span className="text-accent-cyan font-bold">${fmtNumber(data.topAsset?.market_cap ?? 0)}</span>.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-text-muted uppercase text-[10px] font-bold tracking-tighter">Momentum Skew</p>
                  <p>
                    Current 24h trend reflects a <span className={data.topAsset && data.topAsset.change_24h_pct >= 0 ? "text-accent-green font-bold" : "text-accent-red font-bold"}>{fmtPct(data.topAsset?.change_24h_pct ?? 0)}</span> deviation.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-line/30">
              <p className="text-[13px] text-text-primary leading-relaxed">
                <span className="text-accent-cyan font-bold uppercase text-[10px] mr-2">Strategy:</span> 
                {data.topAsset?.symbol.includes("BTC") 
                  ? "High Bitcoin dominance sets the tone for the entire ecosystem. Use BTC price action as your primary 'Market Compass'. When the leader consolidates, look for high-conviction Altcoin setups that show relative strength."
                  : "Diversified capital distribution suggests capital is rotating into riskier segments. Monitor mid-cap rotation carefully to capture the 'Alt-season' momentum before systemic exhaustion sets in."}
              </p>
            </div>
          </div>
        </>
      ) : (
        <Skeleton h={320} />
      )}
    </Card>
  );
}

// =============================================================
// 6. Normalized Performance (BTC, ETH, S&P, Gold, EUR/USD)
// =============================================================
const PERF_ASSETS: { label: string; symbol: string; asset_class: AssetClass; color: string }[] = [
  { label: "Bitcoin", symbol: "BTC/USDT", asset_class: "crypto", color: "#f59e0b" },
  { label: "Ethereum", symbol: "ETH/USDT", asset_class: "crypto", color: "#3b82f6" },
  { label: "S&P 500", symbol: "^GSPC", asset_class: "index", color: "#10b981" },
  { label: "Gold", symbol: "GC=F", asset_class: "gold", color: "#facc15" },
  { label: "EUR/USD", symbol: "EURUSD=X", asset_class: "forex", color: "#ec4899" },
];

export function PerformanceComparison() {
  const [series, setSeries] = useState<{ name: string; color: string; x: Date[]; y: number[] }[]>([]);
  const [tf, setTf] = useState("1d");
  const dateRange = useDateRangeStore((s) => s.dateRange);

  useEffect(() => {
    let alive = true;
    const startDate = format(dateRange.startDate, "yyyy-MM-dd");
    const endDate = format(dateRange.endDate, "yyyy-MM-dd");

    Promise.all(
      PERF_ASSETS.map(async (a) => {
        try {
          const r = await api.ohlcv(a.asset_class, a.symbol, tf, 200, startDate, endDate);
          const candles = r.candles;
          if (candles.length === 0) return null;
          const base = candles[0].close;
          return {
            name: a.label,
            color: a.color,
            x: candles.map((c) => new Date(c.time * 1000)),
            y: candles.map((c) => (c.close / base) * 100),
          };
        } catch {
          return null;
        }
      })
    ).then((rs) => {
      if (alive) setSeries(rs.filter((x): x is NonNullable<typeof x> => x !== null));
    });
    return () => { alive = false; };
  }, [tf, dateRange]);

  const topPerformer = series.length > 0
    ? series.reduce((best, s) => s.y[s.y.length - 1] > best.y[best.y.length - 1] ? s : best)
    : null;

  return (
    <Card
      title="Global Multi-Asset Performance Index"
      centerTitle
      action={
        <div className="flex items-center gap-1 bg-bg-elev border border-line/60 rounded-lg p-1">
          {["1h", "4h", "1d"].map((t) => (
            <button
              key={t}
              onClick={() => setTf(t)}
              className={`px-2 py-1 text-xs uppercase rounded-md ${tf === t ? "bg-accent-cyan text-bg-base font-semibold" : "text-text-secondary hover:text-white"
                }`}
            >
              {t}
            </button>
          ))}
        </div>
      }
    >
      {series.length > 0 ? (
        <>
          <Plot
            data={series.map((s) => ({
              type: "scatter",
              mode: "lines",
              name: s.name,
              x: s.x,
              y: s.y,
              line: { color: s.color, width: 2 },
              hovertemplate: `${s.name}: %{y:.2f}<extra></extra>`,
            }))}
            layout={{
              ...PLOT_LAYOUT_BASE,
              height: 320,
              legend: { orientation: "h", y: -0.18 },
              yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: { text: "Normalized Index (base=100)", standoff: 15 } },
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: "100%", height: "320px" }}
            useResizeHandler
          />
          <div className="mt-3 p-3 bg-bg-card/50 border border-line/40 rounded-lg text-[13px] text-text-primary leading-relaxed min-h-[150px] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3 border-b border-line/20 pb-2">
                <p className="uppercase tracking-widest text-[10px] text-text-muted font-bold">Market Relative Strength Analysis</p>
              </div>
              <p>Comparing <span className="text-text-primary font-bold">{series.length} major assets</span> on a normalized basis (base=100) across crypto, equities, and commodities. <span className="text-accent-blue font-bold">{topPerformer?.name}</span> is currently leading the basket with a <span className="text-accent-cyan font-bold">{(topPerformer?.y[topPerformer.y.length - 1] ?? 100).toFixed(2)}</span> index value.</p>
            </div>
            <div className="mt-3 pt-3 border-t border-line/30">
              <p className="text-[13px] text-text-primary leading-relaxed">
                <span className="text-accent-cyan font-bold uppercase text-[10px] mr-2">Strategy:</span> 
                Relative strength is a key indicator of institutional capital flow. Strategy: Follow the established leaders like {topPerformer?.name}, but maintain a close watch for capital rotation into underperforming sectors that begin to show early signs of reversal.
              </p>
            </div>
          </div>
        </>
      ) : (
        <Skeleton h={320} />
      )}
    </Card>
  );
}

// =============================================================
// 7. Volatility Radar – top 6 cryptos
// =============================================================
export function VolatilityRadar() {
  const [ticks, setTicks] = useState<PriceTick[]>([]);
  useEffect(() => {
    const load = () => api.prices().then(setTicks).catch(() => { });
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  const data = useMemo(() => {
    const items = ticks
      .filter((t) => t.asset_class === "crypto")
      .sort((a, b) => (b.market_cap ?? 0) - (a.market_cap ?? 0))
      .slice(0, 6);
    if (items.length === 0) return null;
    const labels = items.map((t) => t.symbol.replace("/USDT", ""));
    const r = items.map((t) => Math.abs(t.change_24h_pct));
    const maxVol = items[r.indexOf(Math.max(...r))];
    return { labels: [...labels, labels[0]], r: [...r, r[0]], maxVol, items };
  }, [ticks]);

  return (
    <Card title="Asset Volatility Dynamics" centerTitle>
      {data ? (
        <>
          <Plot
            data={[{
              type: "scatterpolar",
              r: data.r,
              theta: data.labels,
              fill: "toself",
              line: { color: "#22d3ee", width: 2 },
              fillcolor: "rgba(34,211,238,0.25)",
              hovertemplate: "%{theta}<br>%{r:.2f}%<extra></extra>",
            }]}
            layout={{
              ...PLOT_LAYOUT_BASE,
              height: 320,
              polar: {
                bgcolor: "rgba(15,22,38,0.6)",
                radialaxis: {
                  visible: true,
                  gridcolor: "rgba(31,42,64,0.7)",
                  tickfont: { color: "#9aa6bd", size: 10 },
                  angle: 90,
                },
                angularaxis: {
                  gridcolor: "rgba(31,42,64,0.7)",
                  tickfont: { color: "#e6edf7", size: 11 },
                },
              },
              margin: { t: 20, l: 40, r: 40, b: 20 },
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: "100%", height: "320px" }}
            useResizeHandler
          />
          <div className="mt-3 p-3 bg-bg-card/50 border border-line/40 rounded-lg text-[13px] text-text-primary leading-relaxed min-h-[150px] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3 border-b border-line/20 pb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-red animate-pulse" />
                <p className="uppercase tracking-widest text-[10px] text-text-muted font-bold">Volatility Pulse</p>
              </div>
              <p>The radar profile identifies <span className="text-text-primary font-bold">{data.maxVol?.symbol.replace("/USDT", "")}</span> as the primary volatility outlier with a <span className="text-accent-red font-bold">{Math.abs(data.maxVol?.change_24h_pct ?? 0).toFixed(2)}%</span> deviation.</p>
            </div>
            <div className="mt-3 pt-3 border-t border-line/30">
              <p className="text-[13px] text-text-primary leading-relaxed">
                <span className="text-accent-cyan font-bold uppercase text-[10px] mr-2">Strategy:</span> 
                High volatility in {data.maxVol.symbol.replace("/USDT", "")} increases the risk of 'Whipsaws' and liquidation. Strategy: Adjust your position sizing downward to account for the increased price range and use wider stop-losses to avoid noise-driven exits.
              </p>
            </div>
          </div>
        </>
      ) : (
        <Skeleton h={320} />
      )}
    </Card>
  );
}

// =============================================================
// 8. Asset Correlation Heatmap (Relationships between top assets)
// =============================================================
export function CorrelationHeatmap() {
  const [matrix, setMatrix] = useState<{ x: string[]; y: string[]; z: number[][] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const assets = [
      { sym: "BTC/USDT", class: "crypto" as AssetClass },
      { sym: "ETH/USDT", class: "crypto" as AssetClass },
      { sym: "SOL/USDT", class: "crypto" as AssetClass },
      { sym: "BNB/USDT", class: "crypto" as AssetClass },
      { sym: "XRP/USDT", class: "crypto" as AssetClass },
      { sym: "ADA/USDT", class: "crypto" as AssetClass },
    ];

    const fetchAll = async () => {
      setLoading(true);
      try {
        const results = await Promise.all(
          assets.map(a => api.ohlcv(a.class, a.sym, "1d", 30))
        );

        const series = results.map(r => r.candles.map(c => c.close));
        const symbols = assets.map(a => a.sym.split("/")[0]);

        // Calculate Pearson Correlation
        const z: number[][] = [];
        for (let i = 0; i < series.length; i++) {
          z[i] = [];
          for (let j = 0; j < series.length; j++) {
            z[i][j] = calculateCorrelation(series[i], series[j]);
          }
        }
        setMatrix({ x: symbols, y: symbols, z });
      } catch (err) {
        console.error("Correlation error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  function calculateCorrelation(x: number[], y: number[]) {
    const n = Math.min(x.length, y.length);
    if (n === 0) return 0;
    const muX = x.reduce((a, b) => a + b, 0) / n;
    const muY = y.reduce((a, b) => a + b, 0) / n;
    let num = 0, denX = 0, denY = 0;
    for (let i = 0; i < n; i++) {
      const dx = x[i] - muX;
      const dy = y[i] - muY;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    }
    return num / Math.sqrt(denX * denY || 1);
  }

  // Find max and min correlation (excluding diagonal)
  const analysis = useMemo(() => {
    if (!matrix) return null;
    let maxVal = -1, minVal = 2;
    let maxPair = "", minPair = "";
    for (let i = 0; i < matrix.z.length; i++) {
      for (let j = i + 1; j < matrix.z.length; j++) {
        const val = matrix.z[i][j];
        if (val > maxVal) {
          maxVal = val;
          maxPair = `${matrix.x[i]} & ${matrix.x[j]}`;
        }
        if (val < minVal) {
          minVal = val;
          minPair = `${matrix.x[i]} & ${matrix.x[j]}`;
        }
      }
    }
    return { maxVal, maxPair, minVal, minPair };
  }, [matrix]);

  return (
    <Card title="Asset Correlation Dynamics" centerTitle>
      {loading ? (
        <Skeleton h={320} />
      ) : matrix && analysis ? (
        <>
          <Plot
            data={[{
              type: "heatmap",
              x: matrix.x,
              y: matrix.y,
              z: matrix.z,
              colorscale: [
                [0, "#1a2438"],
                [1, "#22d3ee"]
              ],
              zmin: 0,
              zmax: 1,
              showscale: true,
              colorbar: { thickness: 10, len: 0.8, tickfont: { color: "#9aa6bd", size: 10 } },
              hovertemplate: "%{x} vs %{y}: %{z:.2f}<extra></extra>",
            }]}
            layout={{
              ...PLOT_LAYOUT_BASE,
              height: 320,
              margin: { t: 10, l: 50, r: 10, b: 50 },
              xaxis: { ...PLOT_LAYOUT_BASE.xaxis, side: "bottom" },
              yaxis: { ...PLOT_LAYOUT_BASE.yaxis, autorange: "reversed" },
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: "100%", height: "320px" }}
            useResizeHandler
          />
          <div className="mt-3 p-3 bg-bg-card/50 border border-line/40 rounded-lg text-[13px] text-text-primary leading-relaxed min-h-[150px] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3 border-b border-line/20 pb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse" />
                <p className="uppercase tracking-widest text-[10px] text-text-muted font-bold">Smart Analysis Report</p>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <p className="text-text-muted uppercase text-[10px] font-bold tracking-tighter">Dominant Linkage</p>
                  <p>
                    <span className="text-text-primary font-bold">{analysis.maxPair}</span> show the tightest correlation at <span className="text-accent-cyan font-bold">{analysis.maxVal.toFixed(2)}</span>.
                  </p>
                  <p className="text-[13px] text-text-primary leading-relaxed">
                    <span className="text-accent-red font-bold uppercase text-[10px] mr-2">Strategy:</span> 
                    High linkage increases systemic risk. These assets move in lockstep; avoid holding both in equal weight to prevent double-exposure during market-wide sell-offs.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-text-muted uppercase text-[10px] font-bold tracking-tighter">Hedging Potential</p>
                  <p>
                    <span className="text-text-primary font-bold">{analysis.minPair}</span> are least correlated (<span className="text-text-primary font-bold">{analysis.minVal.toFixed(2)}</span>), ideal for diversification.
                  </p>
                  <p className="text-[13px] text-text-primary leading-relaxed">
                    <span className="text-accent-green font-bold uppercase text-[10px] mr-2">Strategy:</span> 
                    Ideal for risk balancing. Rebalance into these lower-correlated assets to smooth out your total equity curve and provide a buffer during sector-specific volatility.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-3 pt-2 border-t border-line/30 opacity-80">
              <p className="italic text-[10px]">
                Note: Analysis based on a <span className="text-accent-cyan font-bold not-italic">30D window</span>. High values indicate systemic risk; low values suggest independent movement.
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="h-[320px] flex items-center justify-center text-text-muted">Data unavailable</div>
      )}
    </Card>
  );
}

// =============================================================
function Skeleton({ h }: { h: number }) {
  return (
    <div
      className="flex items-center justify-center text-text-muted text-sm"
      style={{ height: h }}
    >
      Loading chart…
    </div>
  );
}
