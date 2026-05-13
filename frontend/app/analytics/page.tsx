"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";
import type {
  AssetClass,
  Candle,
  IndicatorResponse,
} from "@/lib/types";
import { cls } from "@/lib/utils";

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
      <div className="flex flex-wrap items-center gap-4 mb-4 pb-4 border-b border-line/20">
        <div className="flex flex-col gap-1">
          <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Target Asset</p>
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
          <p className="text-[9px] text-text-muted italic">Select instrument for technical study.</p>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Resolution</p>
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
          <p className="text-[9px] text-text-muted italic">Time interval per data point.</p>
        </div>

        <div className="flex flex-col gap-1 flex-1 min-w-[300px]">
          <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Analysis Engine</p>
          <div className="flex flex-col gap-4 w-full">
            {/* Group 1: Overlays */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[9px] font-bold uppercase tracking-tighter text-accent-cyan">Price Overlays (USD)</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {INDICATORS.slice(0, 3).map((i) => {
                  const on = enabled.includes(i.id);
                  return (
                    <button
                      key={i.id}
                      onClick={() => setEnabled(on ? enabled.filter((x) => x !== i.id) : [...enabled, i.id])}
                      className={cls(
                        "text-[10px] px-2 py-0.5 rounded border transition-all",
                        on ? "bg-accent-cyan/15 border-accent-cyan/40 text-accent-cyan" : "border-line/60 text-text-secondary hover:text-white"
                      )}
                    >
                      {i.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Group 2: Oscillators */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[9px] font-bold uppercase tracking-tighter text-accent-purple">Oscillators (% / Index)</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {INDICATORS.slice(3).map((i) => {
                  const on = enabled.includes(i.id);
                  return (
                    <button
                      key={i.id}
                      onClick={() => setEnabled(on ? enabled.filter((x) => x !== i.id) : [...enabled, i.id])}
                      className={cls(
                        "text-[10px] px-2 py-0.5 rounded border transition-all",
                        on ? "bg-accent-purple/15 border-accent-purple/40 text-accent-purple" : "border-line/60 text-text-secondary hover:text-white"
                      )}
                    >
                      {i.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {closeTrace && overlayLines.length > 0 && (
        <div className="mt-3">
          <Plot
            data={[closeTrace, ...overlayLines]}
            layout={{
              title: { text: `${asset.label} Price & Overlays`, font: { size: 14, color: "#e6edf7" }, x: 0.05 },
              margin: { t: 40, l: 60, r: 20, b: 50 },
              paper_bgcolor: "transparent",
              plot_bgcolor: "transparent",
              font: { color: "#e6edf7", size: 11 },
              legend: { orientation: "h", y: -0.2 },
              xaxis: { title: { text: "Timeline", font: { size: 10, color: "#9aa6bd" } }, gridcolor: "rgba(31,42,64,0.3)" },
              yaxis: { title: { text: "Price (USD)", font: { size: 10, color: "#9aa6bd" }, standoff: 15 }, gridcolor: "rgba(31,42,64,0.3)" },
              height: 400,
              autosize: true,
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: "100%", height: "400px" }}
            useResizeHandler
          />
        </div>
      )}

      {oscillators && (oscillators.rsi || oscillators.macd || oscillators.atr || oscillators.vol) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
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
              layout={subLayout("Relative Strength Index (RSI 14)", "Index (0-100)")}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: "100%", height: "220px" }}
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
              layout={subLayout("MACD Momentum", "Strength")}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: "100%", height: "220px" }}
              useResizeHandler
            />
          )}
          {oscillators.atr && (
            <Plot
              data={[{
                type: "scatter", mode: "lines", x: oscillators.times, y: oscillators.atr.values,
                line: { color: "#3b82f6", width: 1.6 }, name: "ATR(14)",
              }]}
              layout={subLayout("Average True Range (Volatility)", "ATR Value")}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: "100%", height: "220px" }}
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
              layout={subLayout("Price Volatility (%)", "Percentage (%)")}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: "100%", height: "220px" }}
              useResizeHandler
            />
          )}
        </div>
      )}

      <div className="mt-8 p-4 bg-bg-card/50 border border-line/40 rounded-xl">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-accent-cyan font-bold uppercase text-[10px] tracking-widest">Dynamic Strategy & Signals</span>
        </div>
        <div className="space-y-3">
          <ul className="list-disc list-inside space-y-2">
            {(() => {
              if (!ind || !enabled.length) return <li className="text-[13px] text-text-muted italic list-none">Select technical indicators above to generate a dynamic trading strategy.</li>;
              
              let fragments: string[] = [];
              const named = (n: string) => ind.series.find((s) => s.name === n);
              const last = (s: any) => s?.values[s.values.length - 1];

              if (enabled.includes("sma20")) {
                const sma = last(named("SMA20"));
                const price = candles[candles.length - 1]?.close;
                fragments.push(price > sma 
                  ? `Bullish Momentum: Price is above SMA 20 ($${sma?.toFixed(2)}). ➜ Strategy: Maintain long positions but monitor for mean reversion.` 
                  : `Minor Correction: Price has dipped below SMA 20 ($${sma?.toFixed(2)}). ➜ Strategy: Wait for a recovery above SMA or look for support at lower levels.`);
              }

              if (enabled.includes("ema50")) {
                const ema = last(named("EMA50"));
                const bullish = candles[candles.length - 1]?.close > ema;
                fragments.push(`Trend Analysis: EMA 50 is acting as dynamic ${bullish ? "support" : "resistance"} at $${ema?.toFixed(2)}. ➜ Strategy: ${bullish ? "Look for buying opportunities near this line." : "Be cautious as the mid-term trend is currently bearish."}`);
              }

              if (enabled.includes("bbands")) {
                fragments.push("Volatility Check: Price is interacting with Bollinger Bands. ➜ Strategy: Watch for 'band walking' in strong trends or reversals if price touches the outer bands.");
              }

              if (enabled.includes("rsi")) {
                const val = last(named("RSI14"));
                if (val > 70) fragments.push(`RSI Alert (${val?.toFixed(1)}): Market is in Overbought territory. ➜ Strategy: Consider partial profit-taking or avoid new long entries.`);
                else if (val < 30) fragments.push(`RSI Alert (${val?.toFixed(1)}): Market is in Oversold territory. ➜ Strategy: Look for signs of bullish reversal for potential recovery entries.`);
                else fragments.push(`RSI Neutral: Current strength (${val?.toFixed(1)}) is balanced. ➜ Strategy: Wait for RSI to break 50 or reach extreme levels for better signal conviction.`);
              }

              if (enabled.includes("macd")) {
                const macd = last(named("MACD"));
                const signal = last(named("MACD_SIGNAL"));
                fragments.push(macd > signal 
                  ? "MACD Signal: Bullish crossover confirmed with positive momentum. ➜ Strategy: Ride the trend until the histogram begins to fade." 
                  : "MACD Signal: Bearish momentum or weakening trend detected. ➜ Strategy: Reduce exposure or wait for a fresh bullish crossover.");
              }

              if (enabled.includes("volatility")) {
                const v = last(named("VOLATILITY"));
                fragments.push(`Risk Level: Volatility is at ${v?.toFixed(2)}% (${v > 2 ? "High Instability" : "Stable"}). ➜ Strategy: ${v > 2 ? "Tighten stop-losses and reduce position sizing." : "Normal position sizing can be maintained."}`);
              }

              return fragments.map((f, i) => (
                <li key={i} className="text-[13px] text-text-primary leading-relaxed marker:text-accent-cyan">
                  {f}
                </li>
              ));
            })()}
          </ul>
        </div>
      </div>
    </Card>
  );
}

function subLayout(title: string, ytitle: string): any {
  return {
    title: { text: title, font: { size: 12, color: "#e6edf7" }, x: 0.02 },
    margin: { t: 35, l: 50, r: 10, b: 40 },
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    font: { color: "#e6edf7", size: 10 },
    xaxis: { title: { text: "Timeline", font: { size: 9, color: "#9aa6bd" } }, gridcolor: "rgba(31,42,64,0.3)" },
    yaxis: { title: { text: ytitle, font: { size: 9, color: "#9aa6bd" }, standoff: 10 }, gridcolor: "rgba(31,42,64,0.3)" },
    autosize: true,
    showlegend: false,
  };
}
