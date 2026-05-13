"use client";

import { useEffect, useRef } from "react";
import {
  ColorType,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  createChart,
} from "lightweight-charts";
import type { Candle } from "@/lib/types";

interface Props {
  candles: Candle[];
  patterns?: Array<{ time: number; type: string; message: string }>;
  height?: number;
}

/**
 * High-performance candlestick chart powered by TradingView Lightweight Charts.
 * Volume is rendered as a histogram in a sub-pane, and any patterns supplied
 * are pinned as text markers above the price.
 */
export function CandlestickChart({ candles, patterns = [], height = 420 }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9aa6bd",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(31,42,64,0.45)" },
        horzLines: { color: "rgba(31,42,64,0.45)" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "#1f2a40" },
      timeScale: { borderColor: "#1f2a40", timeVisible: true, secondsVisible: false },
    });
    chartRef.current = chart;

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#16c784",
      downColor: "#ea3943",
      borderVisible: false,
      wickUpColor: "#16c784",
      wickDownColor: "#ea3943",
    });
    candleSeriesRef.current = candleSeries;

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
      color: "#3b82f6",
    });
    chart.priceScale("vol").applyOptions({
      scaleMargins: { top: 0.78, bottom: 0 },
      borderColor: "#1f2a40",
    });
    volumeSeriesRef.current = volumeSeries;

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [height]);

  // Update data whenever candles change
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;
    if (!candles || candles.length === 0) return;

    const sorted = [...candles].sort((a, b) => a.time - b.time);
    candleSeriesRef.current.setData(
      sorted.map((c) => ({
        time: c.time as any,
        open: c.open, high: c.high, low: c.low, close: c.close,
      }))
    );
    volumeSeriesRef.current.setData(
      sorted.map((c) => ({
        time: c.time as any,
        value: c.volume,
        color: c.close >= c.open ? "rgba(22,199,132,0.5)" : "rgba(234,57,67,0.5)",
      }))
    );

    // Pattern markers
    const markers = patterns
      .map((p) => ({
        time: p.time as any,
        position: "aboveBar" as const,
        color:
          p.type === "fomo" ? "#facc15" :
          p.type === "whale" ? "#a855f7" :
          p.type === "price_spike" ? "#ec4899" :
          p.type === "price_drop" ? "#ef4444" :
          "#22d3ee",
        shape: "arrowDown" as const,
        text: p.type.toUpperCase(),
      }))
      .sort((a, b) => (a.time as number) - (b.time as number));
    if (markers.length) {
      candleSeriesRef.current.setMarkers(markers);
    } else {
      candleSeriesRef.current.setMarkers([]);
    }

    chartRef.current?.timeScale().fitContent();
  }, [candles, patterns]);

  return (
    <div className="relative" style={{ height }}>
      {/* Y-axis label */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full [writing-mode:vertical-lr] text-[11px] font-bold uppercase tracking-tighter text-text-secondary pl-2 select-none pointer-events-none">
        Price (USD)
      </div>
      
      {/* X-axis label */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full text-[11px] font-bold uppercase tracking-widest text-text-secondary pt-2 select-none pointer-events-none">
        Timeline
      </div>

      <div ref={containerRef} className="w-full" style={{ height }} />
    </div>
  );
}
