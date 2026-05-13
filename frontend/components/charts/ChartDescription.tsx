"use client";

import { useMemo } from "react";
import type { Candle } from "@/lib/types";
import { fmtPrice, fmtPct, cls } from "@/lib/utils";

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
    <div className="mt-4 p-3 bg-bg-card/50 border border-line/40 rounded-lg text-[13px] text-text-primary leading-relaxed min-h-[150px] flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-3 border-b border-line/20 pb-2">
          <span className={cls("w-1.5 h-1.5 rounded-full animate-pulse", stats.change >= 0 ? "bg-accent-green" : "bg-accent-red")} />
          <p className="uppercase tracking-widest text-[10px] text-text-muted font-bold">Technical Performance Summary</p>
        </div>
        <p>
          <span className="text-text-primary font-bold">{title}</span> currently maintains a position at{" "}
          <span className="text-accent-cyan font-bold">{fmtPrice(stats.current)}</span>. Within this session, price action reflects a{" "}
          <span className={cls("font-bold", stats.change >= 0 ? "text-accent-green" : "text-accent-red")}>
            {stats.changePct.toFixed(2)}% {stats.change >= 0 ? "expansion" : "contraction"}
          </span>{" "}
          relative to the period open. Session liquidity reached <span className="text-text-primary font-bold">{(stats.volume / 1e6).toFixed(2)}M</span> units, with high/low volatility bounds established at <span className="text-text-primary font-bold">{fmtPrice(stats.high)}</span> and <span className="text-text-primary font-bold">{fmtPrice(stats.low)}</span>.
        </p>
      </div>
      <div className="mt-3 pt-3 border-t border-line/30">
        <p className="text-[13px] text-text-primary leading-relaxed">
          <span className="text-accent-cyan font-bold uppercase text-[10px] mr-2">Strategy:</span> 
          {stats.change >= 0 
            ? `Bullish momentum is expanding for ${title}. Consider tightening stop-losses to protect current gains and watch for potential resistance near the session high of ${fmtPrice(stats.high)} as the asset approaches overbought territory.` 
            : `Market contraction detected for ${title}. Strategy: Monitor for potential support near the session low of ${fmtPrice(stats.low)}. Avoid aggressive long entries until a clear reversal pattern is confirmed on shorter timeframes.`}
        </p>
      </div>
    </div>
  );
}
