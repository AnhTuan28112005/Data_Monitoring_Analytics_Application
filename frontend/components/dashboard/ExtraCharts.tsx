"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { format } from "date-fns";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { useDateRangeStore } from "@/lib/stores/dateRangeStore";
import type { AssetClass, MarketOverview, PriceTick } from "@/lib/types";
import { fmtNumber, fmtPct } from "@/lib/utils";

const Plot = dynamic(() => import("@/components/charts/PlotlyClient"), { ssr: false });

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
    const load = () => api.overview().then(setOv).catch(() => {});
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  const ready = ov && ov.btc_dominance > 0;
  return (
    <Card title="Market Dominance">
      {ready ? (
        <>
          <Plot
            data={[{
              type: "pie",
              hole: 0.6,
              labels: ["BTC", "ETH", "Others"],
              values: [
                ov!.btc_dominance,
                ov!.eth_dominance,
                Math.max(0, 100 - ov!.btc_dominance - ov!.eth_dominance),
              ],
              marker: { colors: ["#f7931a", "#627eea", "#3b82f6"] },
              textinfo: "label+percent",
              hovertemplate: "%{label}<br>%{value:.2f}%<extra></extra>",
            }]}
            layout={{ ...PLOT_LAYOUT_BASE, showlegend: false, height: 260 }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: "100%", height: "260px" }}
            useResizeHandler
          />
          <div className="mt-3 p-2 bg-bg-card/50 border border-line/40 rounded text-xs text-text-secondary">
            <p className="text-[10px] uppercase text-text-muted mb-1">📊 Dominance Summary</p>
            <p>Bitcoin controls {ov!.btc_dominance.toFixed(1)}% of crypto market cap, while Ethereum holds {ov!.eth_dominance.toFixed(1)}%. Remaining cryptocurrencies account for {Math.max(0, 100 - ov!.btc_dominance - ov!.eth_dominance).toFixed(1)}% of the total market.</p>
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
    const load = () => api.overview().then(setOv).catch(() => {});
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  const v = ov?.fear_greed ?? null;
  const label =
    v == null ? "—" :
    v < 25 ? "Extreme Fear" :
    v < 45 ? "Fear" :
    v < 55 ? "Neutral" :
    v < 75 ? "Greed" : "Extreme Greed";

  const sentiment =
    v == null ? "" :
    v < 25 ? "an opportunity for contrarian investors to accumulate assets" :
    v < 45 ? "caution in the market with selective buying opportunities" :
    v < 55 ? "equilibrium between buying and selling pressure" :
    v < 75 ? "strong bullish momentum with potential for overextension" :
    "excessive euphoria signaling possible profit-taking ahead";

  return (
    <Card title="Fear & Greed Index">
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
            style={{ width: "100%", height: "260px" }}
            useResizeHandler
          />
          <div className="text-center text-sm text-text-muted -mt-2 mb-3">{label}</div>
          <div className="p-2 bg-bg-card/50 border border-line/40 rounded text-xs text-text-secondary">
            <p className="text-[10px] uppercase text-text-muted mb-1">📊 Sentiment Analysis</p>
            <p>Current fear & greed index at <span className="text-text-primary font-semibold">{v.toFixed(0)}</span> suggests {sentiment}.</p>
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
    const load = () => api.prices().then(setTicks).catch(() => {});
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
    <Card title="24h Volume · by Asset Class">
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
              height: 260,
              yaxis: { ...PLOT_LAYOUT_BASE.yaxis, type: "log", title: "Volume (log)" },
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: "100%", height: "260px" }}
            useResizeHandler
          />
          <div className="mt-3 p-2 bg-bg-card/50 border border-line/40 rounded text-xs text-text-secondary">
            <p className="text-[10px] uppercase text-text-muted mb-1">📊 Volume Summary</p>
            <p>24h trading volume across {data.x.length} asset classes, with <span className="text-text-primary font-semibold">{topClass?.[0].toUpperCase()}</span> leading at ${(topClass?.[1] ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}.</p>
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
    const load = () => api.prices().then(setTicks).catch(() => {});
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
      title="24h Returns · Distribution"
      action={
        stats && (
          <div className="text-xs flex gap-3 num-tabular">
            <span className="text-accent-green">▲ {stats.pos}</span>
            <span className="text-accent-red">▼ {stats.neg}</span>
            <span className="text-text-muted">μ {fmtPct(stats.mean)}</span>
          </div>
        )
      }
    >
      {values.length > 0 ? (
        <>
          <Plot
            data={[{
              type: "histogram",
              x: values,
              xbins: { size: 1 },
              marker: {
                color: values,
                colorscale: [
                  [0, "#ea3943"],
                  [0.5, "#1a2438"],
                  [1, "#16c784"],
                ],
                cmid: 0,
                line: { width: 0 },
              },
              hovertemplate: "%{x:.2f}%%: %{y}<extra></extra>",
            }]}
            layout={{
              ...PLOT_LAYOUT_BASE,
              height: 260,
              xaxis: { ...PLOT_LAYOUT_BASE.xaxis, title: "Change %", zeroline: true, zerolinecolor: "#9aa6bd" },
              yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: "Count" },
              bargap: 0.05,
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: "100%", height: "260px" }}
            useResizeHandler
          />
          <div className="mt-3 p-2 bg-bg-card/50 border border-line/40 rounded text-xs text-text-secondary">
            <p className="text-[10px] uppercase text-text-muted mb-1">📊 Returns Analysis</p>
            <p>24h market shows <span className="text-accent-green">{stats.pos} gainers</span> and <span className="text-accent-red">{stats.neg} losers</span> across {values.length} assets, with average return of <span className="text-text-primary font-semibold">{fmtPct(stats.mean)}</span>.</p>
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
    const load = () => api.prices().then(setTicks).catch(() => {});
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
    <Card title="Top 10 Crypto · Market Cap">
      {data.labels.length > 0 ? (
        <>
          <Plot
            data={[{
              type: "bar",
              orientation: "h",
              x: data.values,
              y: data.labels,
              marker: {
                color: data.changes,
                colorscale: [
                  [0, "#ea3943"],
                  [0.5, "#1a2438"],
                  [1, "#16c784"],
                ],
                cmid: 0,
                cmin: -10,
                cmax: 10,
              },
              text: data.values.map((v) => "$" + fmtNumber(v)),
              textposition: "outside" as any,
              hovertemplate: "%{y}<br>Mcap $%{x:,.0f}<br>24h %{customdata:+.2f}%<extra></extra>",
              customdata: data.changes,
            }]}
            layout={{
              ...PLOT_LAYOUT_BASE,
              height: 320,
              margin: { t: 20, l: 60, r: 70, b: 30 },
              yaxis: { ...PLOT_LAYOUT_BASE.yaxis, autorange: "reversed" },
              xaxis: { ...PLOT_LAYOUT_BASE.xaxis, type: "log", title: "Market Cap (log)" },
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: "100%", height: "320px" }}
            useResizeHandler
          />
          <div className="mt-3 p-2 bg-bg-card/50 border border-line/40 rounded text-xs text-text-secondary">
            <p className="text-[10px] uppercase text-text-muted mb-1">📊 Market Cap Summary</p>
            <p>Top 10 cryptocurrencies ranked by market cap, led by <span className="text-text-primary font-semibold">{data.topAsset?.symbol.replace("/USDT", "")}</span> at ${fmtNumber(data.topAsset?.market_cap ?? 0)} with 24h change of <span className={data.topAsset && data.topAsset.change_24h_pct >= 0 ? "text-accent-green" : "text-accent-red"}>{fmtPct(data.topAsset?.change_24h_pct ?? 0)}</span>.</p>
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
  { label: "BTC", symbol: "BTC/USDT", asset_class: "crypto", color: "#f7931a" },
  { label: "ETH", symbol: "ETH/USDT", asset_class: "crypto", color: "#627eea" },
  { label: "S&P 500", symbol: "^GSPC", asset_class: "index", color: "#22d3ee" },
  { label: "Gold", symbol: "GC=F", asset_class: "gold", color: "#facc15" },
  { label: "EUR/USD", symbol: "EURUSD=X", asset_class: "forex", color: "#a855f7" },
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
      title="Normalized Performance (base = 100)"
      action={
        <div className="flex items-center gap-1 bg-bg-elev border border-line/60 rounded-lg p-1">
          {["1h", "4h", "1d"].map((t) => (
            <button
              key={t}
              onClick={() => setTf(t)}
              className={`px-2 py-1 text-xs uppercase rounded-md ${
                tf === t ? "bg-accent-cyan text-bg-base font-semibold" : "text-text-secondary hover:text-white"
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
              yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: "Index" },
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: "100%", height: "320px" }}
            useResizeHandler
          />
          <div className="mt-3 p-2 bg-bg-card/50 border border-line/40 rounded text-xs text-text-secondary">
            <p className="text-[10px] uppercase text-text-muted mb-1">📊 Performance Analysis</p>
            <p>Comparing {series.length} major assets on normalized basis (base=100) across crypto, equities, commodities, and forex. <span className="text-text-primary font-semibold">{topPerformer?.name}</span> is currently outperforming with {(topPerformer?.y[topPerformer.y.length - 1] ?? 100).toFixed(2)} index value.</p>
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
    const load = () => api.prices().then(setTicks).catch(() => {});
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
    <Card title="Volatility Radar · |24h Δ|">
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
          <div className="mt-3 p-2 bg-bg-card/50 border border-line/40 rounded text-xs text-text-secondary">
            <p className="text-[10px] uppercase text-text-muted mb-1">📊 Volatility Summary</p>
            <p>Top 6 cryptocurrencies volatility proxy based on |24h change|. <span className="text-text-primary font-semibold">{data.maxVol?.symbol.replace("/USDT", "")}</span> shows highest volatility at {Math.abs(data.maxVol?.change_24h_pct ?? 0).toFixed(2)}% movement.</p>
          </div>
        </>
      ) : (
        <Skeleton h={320} />
      )}
    </Card>
  );
}

// =============================================================
// 8. BTC Hourly Activity Heatmap (hour-of-day x day-of-week, last 7d)
// =============================================================
export function BtcActivityHeatmap() {
  const [matrix, setMatrix] = useState<number[][] | null>(null);
  const [maxVol, setMaxVol] = useState(0);
  const [peakTime, setPeakTime] = useState<{ day: string; hour: string } | null>(null);
  const dateRange = useDateRangeStore((s) => s.dateRange);

  useEffect(() => {
    let alive = true;
    const startDate = format(dateRange.startDate, "yyyy-MM-dd");
    const endDate = format(dateRange.endDate, "yyyy-MM-dd");

    api
      .ohlcv("crypto", "BTC/USDT", "1h", 200, startDate, endDate)
      .then((r) => {
        if (!alive) return;
        // 7 rows (Mon..Sun), 24 cols (00..23)
        const m: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
        const cnt: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
        let mx = 0;
        let peakRow = 0, peakCol = 0;
        for (const c of r.candles) {
          const d = new Date(c.time * 1000);
          const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
          const hour = d.getUTCHours();
          m[dow][hour] += c.volume;
          cnt[dow][hour] += 1;
        }
        for (let i = 0; i < 7; i++) {
          for (let j = 0; j < 24; j++) {
            if (cnt[i][j] > 0) m[i][j] /= cnt[i][j];
            if (m[i][j] > mx) {
              mx = m[i][j];
              peakRow = i;
              peakCol = j;
            }
          }
        }
        const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        setPeakTime({ day: days[peakRow], hour: `${peakCol.toString().padStart(2, "0")}:00` });
        setMatrix(m);
        setMaxVol(mx);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [dateRange]);

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, "0")}h`);

  return (
    <Card
      title="BTC Hourly Activity · Last 7 Days (UTC)"
      action={maxVol > 0 ? <span className="text-xs text-text-muted">peak ≈ {fmtNumber(maxVol)}</span> : null}
    >
      {matrix ? (
        <>
          <Plot
            data={[{
              type: "heatmap",
              z: matrix,
              x: hours,
              y: days,
              colorscale: [
                [0, "#0a0e17"],
                [0.3, "#1a2438"],
                [0.6, "#22d3ee"],
                [1, "#facc15"],
              ],
              hovertemplate: "%{y} %{x}<br>vol %{z:,.2f}<extra></extra>",
              colorbar: { thickness: 10, tickfont: { color: "#9aa6bd" } },
            }]}
            layout={{
              ...PLOT_LAYOUT_BASE,
              height: 320,
              margin: { t: 20, l: 50, r: 50, b: 50 },
              xaxis: { ...PLOT_LAYOUT_BASE.xaxis, tickangle: -45 },
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: "100%", height: "320px" }}
            useResizeHandler
          />
          <div className="mt-3 p-2 bg-bg-card/50 border border-line/40 rounded text-xs text-text-secondary">
            <p className="text-[10px] uppercase text-text-muted mb-1">📊 Activity Summary</p>
            <p>Bitcoin hourly activity heatmap over the last 7 days (UTC). Peak trading activity occurs on {peakTime?.day} around {peakTime?.hour} with average volume of {fmtNumber(maxVol)}.</p>
          </div>
        </>
      ) : (
        <Skeleton h={320} />
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
