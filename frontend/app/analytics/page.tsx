"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Card } from "@/components/ui/Card";
import { CandlestickChart } from "@/components/charts/CandlestickChart";
import { api } from "@/lib/api";
import type {
  AssetClass,
  Candle,
  CorrelationResponse,
  IndicatorResponse,
  IntradayResponse,
} from "@/lib/types";
import { cls, colorByChange, fmtPct } from "@/lib/utils";

const Plot = dynamic(() => import("@/components/charts/PlotlyClient"), { ssr: false });

const ASSETS: { label: string; symbol: string; asset_class: AssetClass }[] = [
  { label: "BTC/USDT", symbol: "BTC/USDT", asset_class: "crypto" },
  { label: "ETH/USDT", symbol: "ETH/USDT", asset_class: "crypto" },
  { label: "SOL/USDT", symbol: "SOL/USDT", asset_class: "crypto" },
  { label: "S&P 500", symbol: "^GSPC", asset_class: "index" },
  { label: "NASDAQ", symbol: "^IXIC", asset_class: "index" },
  { label: "Gold", symbol: "GC=F", asset_class: "gold" },
  { label: "EUR/USD", symbol: "EURUSD=X", asset_class: "forex" },
];

const TIMEFRAMES = ["15m", "1h", "4h", "1d"];
const INDICATORS = [
  { id: "sma20", label: "SMA 20" },
  { id: "ema50", label: "EMA 50" },
  { id: "bbands", label: "Bollinger" },
  { id: "rsi", label: "RSI 14" },
  { id: "macd", label: "MACD" },
  { id: "atr", label: "ATR" },
  { id: "volatility", label: "Volatility" },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-4">
      <IndicatorsBlock />
      <CorrelationBlock />
      <IntradayBlock />
    </div>
  );
}

// =============================================================
function IndicatorsBlock() {
  const [asset, setAsset] = useState(ASSETS[0]);
  const [tf, setTf] = useState("1h");
  const [enabled, setEnabled] = useState<string[]>(["sma20", "ema50", "bbands", "rsi"]);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [ind, setInd] = useState<IndicatorResponse | null>(null);

  useEffect(() => {
    let alive = true;
    api.ohlcv(asset.asset_class, asset.symbol, tf, 300).then((r) => alive && setCandles(r.candles));
    api
      .indicators(asset.asset_class, asset.symbol, tf, enabled)
      .then((r) => alive && setInd(r))
      .catch(() => {});
    return () => { alive = false; };
  }, [asset, tf, enabled]);

  const overlayLines = useMemo(() => {
    if (!ind) return [];
    const overlayNames = ["SMA20", "EMA50", "BB_UP", "BB_MID", "BB_LOW"];
    return ind.series
      .filter((s) => overlayNames.includes(s.name))
      .map((s, i) => ({
        type: "scatter" as const,
        mode: "lines" as const,
        name: s.name,
        x: ind.times.map((t) => new Date(t * 1000)),
        y: s.values,
        line: {
          width: 1.4,
          color:
            s.name === "SMA20" ? "#22d3ee" :
            s.name === "EMA50" ? "#a855f7" :
            s.name === "BB_UP" ? "rgba(234,57,67,0.7)" :
            s.name === "BB_LOW" ? "rgba(22,199,132,0.7)" :
            "rgba(154,166,189,0.7)",
        },
      }));
  }, [ind]);

  const oscillators = useMemo(() => {
    if (!ind) return null;
    const named = (n: string) => ind.series.find((s) => s.name === n);
    return {
      times: ind.times.map((t) => new Date(t * 1000)),
      rsi: named("RSI14"),
      macd: named("MACD"),
      macdSignal: named("MACD_SIGNAL"),
      macdHist: named("MACD_HIST"),
      atr: named("ATR14"),
      vol: named("VOLATILITY"),
    };
  }, [ind]);

  const closeTrace = useMemo(() => {
    if (!candles.length) return null;
    return {
      type: "scatter" as const,
      mode: "lines" as const,
      name: asset.symbol,
      x: candles.map((c) => new Date(c.time * 1000)),
      y: candles.map((c) => c.close),
      line: { color: "#e6edf7", width: 1.6 },
    };
  }, [candles, asset.symbol]);

  return (
    <Card title="Technical Indicators">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <select
          value={`${asset.asset_class}:${asset.symbol}`}
          onChange={(e) => {
            const [ac, sym] = e.target.value.split(":");
            const f = ASSETS.find((a) => a.asset_class === ac && a.symbol === sym);
            if (f) setAsset(f);
          }}
          className="bg-bg-elev border border-line/60 rounded-lg px-2 py-1.5 text-sm"
        >
          {ASSETS.map((a) => (
            <option key={`${a.asset_class}:${a.symbol}`} value={`${a.asset_class}:${a.symbol}`}>{a.label}</option>
          ))}
        </select>
        <div className="flex items-center gap-1 bg-bg-elev border border-line/60 rounded-lg p-1">
          {TIMEFRAMES.map((t) => (
            <button
              key={t}
              onClick={() => setTf(t)}
              className={cls(
                "px-2 py-1 text-xs uppercase rounded-md",
                tf === t ? "bg-accent-cyan text-bg-base font-semibold" : "text-text-secondary hover:text-white"
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 ml-auto">
          {INDICATORS.map((i) => {
            const on = enabled.includes(i.id);
            return (
              <button
                key={i.id}
                onClick={() =>
                  setEnabled(on ? enabled.filter((x) => x !== i.id) : [...enabled, i.id])
                }
                className={cls(
                  "text-[11px] px-2 py-1 rounded-md border",
                  on
                    ? "bg-accent-cyan/15 border-accent-cyan/40 text-accent-cyan"
                    : "border-line/60 text-text-secondary hover:text-white"
                )}
              >
                {i.label}
              </button>
            );
          })}
        </div>
      </div>

      <CandlestickChart candles={candles} height={360} />

      {closeTrace && overlayLines.length > 0 && (
        <div className="mt-3">
          <Plot
            data={[closeTrace, ...overlayLines]}
            layout={{
              margin: { t: 10, l: 40, r: 20, b: 30 },
              paper_bgcolor: "transparent",
              plot_bgcolor: "transparent",
              font: { color: "#e6edf7", size: 11 },
              legend: { orientation: "h", y: -0.18 },
              xaxis: { gridcolor: "rgba(31,42,64,0.5)" },
              yaxis: { gridcolor: "rgba(31,42,64,0.5)" },
              height: 240,
              autosize: true,
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: "100%", height: "240px" }}
            useResizeHandler
          />
        </div>
      )}

      {oscillators && (oscillators.rsi || oscillators.macd || oscillators.atr || oscillators.vol) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
          {oscillators.rsi && (
            <Plot
              data={[
                {
                  type: "scatter", mode: "lines",
                  x: oscillators.times, y: oscillators.rsi.values,
                  line: { color: "#facc15", width: 1.6 }, name: "RSI(14)",
                },
                { type: "scatter", mode: "lines", x: oscillators.times, y: oscillators.times.map(() => 70),
                  line: { color: "rgba(234,57,67,0.5)", width: 1, dash: "dot" }, showlegend: false },
                { type: "scatter", mode: "lines", x: oscillators.times, y: oscillators.times.map(() => 30),
                  line: { color: "rgba(22,199,132,0.5)", width: 1, dash: "dot" }, showlegend: false },
              ]}
              layout={subLayout("RSI 14")}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: "100%", height: "180px" }}
              useResizeHandler
            />
          )}
          {oscillators.macd && (
            <Plot
              data={[
                { type: "bar", x: oscillators.times, y: oscillators.macdHist?.values ?? [],
                  marker: { color: (oscillators.macdHist?.values ?? []).map(v => (v ?? 0) >= 0 ? "rgba(22,199,132,0.7)" : "rgba(234,57,67,0.7)") },
                  name: "Hist" },
                { type: "scatter", mode: "lines", x: oscillators.times, y: oscillators.macd.values,
                  line: { color: "#22d3ee", width: 1.6 }, name: "MACD" },
                { type: "scatter", mode: "lines", x: oscillators.times, y: oscillators.macdSignal?.values ?? [],
                  line: { color: "#a855f7", width: 1.6 }, name: "Signal" },
              ]}
              layout={subLayout("MACD")}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: "100%", height: "180px" }}
              useResizeHandler
            />
          )}
          {oscillators.atr && (
            <Plot
              data={[{
                type: "scatter", mode: "lines", x: oscillators.times, y: oscillators.atr.values,
                line: { color: "#3b82f6", width: 1.6 }, name: "ATR(14)",
              }]}
              layout={subLayout("ATR 14")}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: "100%", height: "180px" }}
              useResizeHandler
            />
          )}
          {oscillators.vol && (
            <Plot
              data={[{
                type: "scatter", mode: "lines", x: oscillators.times, y: oscillators.vol.values,
                line: { color: "#16c784", width: 1.6 }, name: "Volatility %", fill: "tozeroy",
                fillcolor: "rgba(22,199,132,0.15)",
              }]}
              layout={subLayout("Volatility (rolling)")}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: "100%", height: "180px" }}
              useResizeHandler
            />
          )}
        </div>
      )}
    </Card>
  );
}

function subLayout(title: string): any {
  return {
    title: { text: title, font: { size: 12, color: "#9aa6bd" }, x: 0.02 },
    margin: { t: 30, l: 40, r: 10, b: 25 },
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    font: { color: "#e6edf7", size: 10 },
    xaxis: { gridcolor: "rgba(31,42,64,0.5)" },
    yaxis: { gridcolor: "rgba(31,42,64,0.5)" },
    autosize: true,
    showlegend: false,
  };
}

// =============================================================
function CorrelationBlock() {
  const [data, setData] = useState<CorrelationResponse | null>(null);
  const [tf, setTf] = useState("1d");

  const pairs = useMemo(
    () => [
      "crypto:BTC/USDT", "crypto:ETH/USDT", "crypto:SOL/USDT",
      "index:^GSPC", "index:^IXIC",
      "gold:GC=F", "silver:SI=F",
      "forex:EURUSD=X",
    ],
    []
  );

  useEffect(() => {
    api.correlation(pairs, tf, 90).then(setData).catch(() => {});
  }, [pairs, tf]);

  return (
    <Card
      title="Correlation Matrix"
      action={
        <div className="flex items-center gap-1 bg-bg-elev border border-line/60 rounded-lg p-1">
          {["1h", "1d"].map((t) => (
            <button
              key={t}
              onClick={() => setTf(t)}
              className={cls(
                "px-2 py-1 text-xs uppercase rounded-md",
                tf === t ? "bg-accent-cyan text-bg-base font-semibold" : "text-text-secondary hover:text-white"
              )}
            >{t}</button>
          ))}
        </div>
      }
    >
      {data && data.symbols.length > 0 ? (
        <Plot
          data={[{
            type: "heatmap",
            z: data.matrix,
            x: data.symbols,
            y: data.symbols,
            zmin: -1, zmax: 1, zmid: 0,
            colorscale: [
              [0, "#ea3943"],
              [0.5, "#1a2438"],
              [1, "#16c784"],
            ],
            hovertemplate: "%{y} ↔ %{x}<br>ρ = %{z:.3f}<extra></extra>",
            colorbar: { title: "ρ", thickness: 12, tickfont: { color: "#9aa6bd" } },
          }]}
          layout={{
            margin: { t: 10, l: 110, r: 10, b: 90 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: { color: "#e6edf7", size: 11 },
            xaxis: { tickangle: -35 },
            height: 480,
            autosize: true,
          }}
          config={{ displayModeBar: false, responsive: true }}
          style={{ width: "100%", height: "480px" }}
          useResizeHandler
        />
      ) : (
        <div className="text-sm text-text-muted h-72 flex items-center justify-center">Computing correlation…</div>
      )}
      <div className="mt-2 text-[11px] text-text-muted">
        Pearson correlation of percentage-returns over {tf === "1d" ? "90 days" : "90 hours"}.
      </div>
    </Card>
  );
}

// =============================================================
function IntradayBlock() {
  const [asset, setAsset] = useState(ASSETS[0]);
  const [data, setData] = useState<IntradayResponse | null>(null);

  useEffect(() => {
    api.intraday(asset.asset_class, asset.symbol).then(setData).catch(() => {});
  }, [asset]);

  const traces = useMemo(() => {
    if (!data || data.points.length === 0) return null;
    const x = data.points.map((p) => new Date(p.time * 1000));
    const price = data.points.map((p) => p.price);
    const pumps = data.points.filter((p) => p.event === "pump");
    const dumps = data.points.filter((p) => p.event === "dump");

    return [
      {
        type: "scatter" as const, mode: "lines" as const, name: "Price",
        x, y: price, line: { color: "#22d3ee", width: 1.6 },
      },
      {
        type: "scatter" as const, mode: "markers" as const, name: "Pump",
        x: pumps.map((p) => new Date(p.time * 1000)),
        y: pumps.map((p) => p.price),
        marker: { color: "#16c784", size: 9, symbol: "triangle-up" },
      },
      {
        type: "scatter" as const, mode: "markers" as const, name: "Dump",
        x: dumps.map((p) => new Date(p.time * 1000)),
        y: dumps.map((p) => p.price),
        marker: { color: "#ea3943", size: 9, symbol: "triangle-down" },
      },
    ];
  }, [data]);

  const summary = useMemo(() => {
    if (!data) return { pumps: 0, dumps: 0 };
    return {
      pumps: data.points.filter((p) => p.event === "pump").length,
      dumps: data.points.filter((p) => p.event === "dump").length,
    };
  }, [data]);

  return (
    <Card
      title="Intraday Timeline"
      action={
        <div className="flex items-center gap-3">
          <select
            value={`${asset.asset_class}:${asset.symbol}`}
            onChange={(e) => {
              const [ac, sym] = e.target.value.split(":");
              const f = ASSETS.find((a) => a.asset_class === ac && a.symbol === sym);
              if (f) setAsset(f);
            }}
            className="bg-bg-elev border border-line/60 rounded-lg px-2 py-1.5 text-sm"
          >
            {ASSETS.map((a) => (
              <option key={`${a.asset_class}:${a.symbol}`} value={`${a.asset_class}:${a.symbol}`}>{a.label}</option>
            ))}
          </select>
          <span className="text-xs text-accent-green num-tabular">{summary.pumps} pumps</span>
          <span className="text-xs text-accent-red num-tabular">{summary.dumps} dumps</span>
        </div>
      }
    >
      {traces ? (
        <Plot
          data={traces}
          layout={{
            margin: { t: 10, l: 40, r: 20, b: 30 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: { color: "#e6edf7", size: 11 },
            xaxis: { gridcolor: "rgba(31,42,64,0.5)" },
            yaxis: { gridcolor: "rgba(31,42,64,0.5)" },
            legend: { orientation: "h", y: -0.18 },
            height: 360,
            autosize: true,
          }}
          config={{ displayModeBar: false, responsive: true }}
          style={{ width: "100%", height: "360px" }}
          useResizeHandler
        />
      ) : (
        <div className="text-sm text-text-muted h-[360px] flex items-center justify-center">Loading intraday…</div>
      )}
    </Card>
  );
}
