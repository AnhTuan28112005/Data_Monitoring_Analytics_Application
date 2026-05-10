"use client";

import { useMemo } from "react";
import type { Candle } from "@/lib/types";
import { fmtPrice, fmtPct } from "@/lib/utils";

interface ChartDescriptionProps {
  title: string;
  candles: Candle[];
  symbol: string;
  timeframe: string;
}

export function ChartDescription({ title, candles, symbol, timeframe }: ChartDescriptionProps) {
  const stats = useMemo(() => {
    if (!candles || candles.length === 0) {
      return {
        current: 0,
        high: 0,
        low: 0,
        change: 0,
        changePct: 0,
        volume: 0,
      };
    }

    const current = candles[candles.length - 1].close;
    const prev = candles[0].close;
    const high = Math.max(...candles.map((c) => c.high));
    const low = Math.min(...candles.map((c) => c.low));
    const change = current - prev;
    const changePct = prev > 0 ? (change / prev) * 100 : 0;
    const volume = candles.reduce((sum, c) => sum + c.volume, 0);

    return { current, high, low, change, changePct, volume };
  }, [candles]);

  return (
    <div className="mt-4 p-3 bg-bg-card/50 border border-line/40 rounded-lg text-sm text-text-secondary">
      <p className="text-xs uppercase tracking-widest text-text-muted mb-2">💡 Chart Summary</p>
      <p className="leading-relaxed">
        <strong>{title}</strong> ({symbol.toUpperCase()}) is currently trading at{" "}
        <span className="text-text-primary font-semibold">{fmtPrice(stats.current)}</span> on a {timeframe}{" "}
        timeframe. The price has{" "}
        <span className={stats.change >= 0 ? "text-accent-green" : "text-accent-red"}>
          {stats.change >= 0 ? "increased" : "decreased"} by {fmtPrice(Math.abs(stats.change))} (
          {fmtPct(stats.changePct)})
        </span>{" "}
        from the opening level. Trading range: <span className="text-text-primary">{fmtPrice(stats.high)}</span> (high)
        to <span className="text-text-primary">{fmtPrice(stats.low)}</span> (low). Total trading volume:{" "}
        <span className="text-text-primary">{(stats.volume / 1e6).toFixed(2)}M</span>.
      </p>
    </div>
  );
}
