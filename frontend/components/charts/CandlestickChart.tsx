"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ColorType,
  CrosshairMode,
  CustomData,
  IChartApi,
  ICustomSeriesPaneRenderer,
  ICustomSeriesPaneView,
  ISeriesApi,
  LineStyle,
  PaneRendererCustomData,
  PriceToCoordinateConverter,
  Time,
  createChart,
} from "lightweight-charts";
import type { Candle, ForecastPoint } from "@/lib/types";

interface Props {
  candles: Candle[];
  forecast?: ForecastPoint[];
  patterns?: Array<{ time: number; type: string; message: string }>;
  height?: number;
}

// ─── Custom Forecast Band Series ─────────────────────────────────────────────

interface ForecastBandPoint extends CustomData<Time> {
  value: number;
  lower_bound: number;
  upper_bound: number;
}

class ForecastBandRenderer implements ICustomSeriesPaneRenderer {
  private data: PaneRendererCustomData<Time, ForecastBandPoint> | null = null;

  public update(data: PaneRendererCustomData<Time, ForecastBandPoint>): void {
    this.data = data;
  }

  public draw(target: any, priceConverter: PriceToCoordinateConverter): void {
    const data = this.data;
    if (!data || data.bars.length < 2) return;

    target.useMediaCoordinateSpace(({ context, mediaSize }: any) => {
      const upperPath: Array<[number, number]> = [];
      const lowerPath: Array<[number, number]> = [];

      for (const bar of data.bars) {
        const row = bar.originalData;
        const upperY = priceConverter(row.upper_bound);
        const lowerY = priceConverter(row.lower_bound);
        if (upperY === null || lowerY === null) continue;
        upperPath.push([bar.x, upperY]);
        lowerPath.push([bar.x, lowerY]);
      }

      if (upperPath.length < 2 || lowerPath.length < 2) return;

      const gradient = context.createLinearGradient(0, 0, 0, mediaSize.height);
      gradient.addColorStop(0, "rgba(255, 183, 77, 0.30)");
      gradient.addColorStop(1, "rgba(255, 183, 77, 0.06)");

      context.save();
      context.beginPath();
      context.moveTo(upperPath[0][0], upperPath[0][1]);
      for (const [x, y] of upperPath.slice(1)) {
        context.lineTo(x, y);
      }
      for (const [x, y] of lowerPath.slice().reverse()) {
        context.lineTo(x, y);
      }
      context.closePath();
      context.fillStyle = gradient;
      context.strokeStyle = "rgba(255, 183, 77, 0.50)";
      context.lineWidth = 1;
      context.fill();
      context.stroke();
      context.restore();
    });
  }
}

class ForecastBandPaneView implements ICustomSeriesPaneView<Time, ForecastBandPoint> {
  private rendererInstance = new ForecastBandRenderer();

  public renderer(): ICustomSeriesPaneRenderer {
    return this.rendererInstance;
  }

  public update(data: PaneRendererCustomData<Time, ForecastBandPoint>): void {
    this.rendererInstance.update(data);
  }

  public priceValueBuilder(plotRow: ForecastBandPoint): number[] {
    return [plotRow.lower_bound, plotRow.upper_bound, plotRow.value];
  }

  public isWhitespace(data: ForecastBandPoint): data is any {
    return (
      !Number.isFinite(data.lower_bound) ||
      !Number.isFinite(data.upper_bound) ||
      !Number.isFinite(data.value)
    );
  }

  public defaultOptions(): any {
    return {};
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * High-performance candlestick chart powered by TradingView Lightweight Charts.
 * Volume is rendered as a histogram in a sub-pane. Pattern markers are shown
 * above the price. When forecast data is provided, a dashed amber forecast line
 * and confidence band are overlaid on the same price axis.
 */
export function CandlestickChart({
  candles,
  forecast = [],
  patterns = [],
  height = 420,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const forecastLineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const forecastBandRef = useRef<ISeriesApi<"Custom"> | null>(null);

  // Keep a ref to the latest sorted forecast for use inside the crosshair callback
  const sortedForecastRef = useRef<ForecastPoint[]>([]);

  const [tooltipState, setTooltipState] = useState<{
    visible: boolean;
    x: number;
    y: number;
    yhat: number;
    upper: number;
    lower: number;
  }>({ visible: false, x: 0, y: 0, yhat: 0, upper: 0, lower: 0 });

  const sortedForecast = useMemo(
    () => [...forecast].sort((a, b) => a.time_timestamp - b.time_timestamp),
    [forecast]
  );

  useEffect(() => {
    sortedForecastRef.current = sortedForecast;
  }, [sortedForecast]);

  // ── Init chart (once) ──────────────────────────────────────────────────────
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

    // Candle series
    candleSeriesRef.current = chart.addCandlestickSeries({
      upColor: "#16c784",
      downColor: "#ea3943",
      borderVisible: false,
      wickUpColor: "#16c784",
      wickDownColor: "#ea3943",
    });

    // Volume series
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

    // Forecast dashed line
    forecastLineRef.current = chart.addLineSeries({
      color: "#ffb74d",
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    // Forecast confidence band (custom series)
    const forecastBandView = new ForecastBandPaneView();
    forecastBandRef.current = chart.addCustomSeries(forecastBandView, {
      lastValueVisible: false,
      priceLineVisible: false,
    } as any);

    // Crosshair → tooltip
    chart.subscribeCrosshairMove((param) => {
      const latestForecast = sortedForecastRef.current;

      if (!param.point || param.time === undefined || !latestForecast.length) {
        setTooltipState((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        return;
      }

      const hoveredTime = Number(param.time as Time);
      const firstForecastTime = latestForecast[0].time_timestamp;
      const lastForecastTime = latestForecast[latestForecast.length - 1].time_timestamp;

      if (hoveredTime < firstForecastTime || hoveredTime > lastForecastTime) {
        setTooltipState((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        return;
      }

      const nearest = latestForecast.reduce((best, current) => {
        return Math.abs(current.time_timestamp - hoveredTime) <
          Math.abs(best.time_timestamp - hoveredTime)
          ? current
          : best;
      }, latestForecast[0]);

      setTooltipState({
        visible: true,
        x: param.point.x + 14,
        y: param.point.y + 14,
        yhat: nearest.predicted_close,
        upper: nearest.upper_bound,
        lower: nearest.lower_bound,
      });
    });

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
      setTooltipState((prev) => ({ ...prev, visible: false }));
    };
  }, [height]);

  // ── Update candles & patterns ──────────────────────────────────────────────
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;
    if (!candles || candles.length === 0) return;

    const sorted = [...candles].sort((a, b) => a.time - b.time);

    candleSeriesRef.current.setData(
      sorted.map((c) => ({
        time: c.time as Time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );

    volumeSeriesRef.current.setData(
      sorted.map((c) => ({
        time: c.time as Time,
        value: c.volume,
        color: c.close >= c.open ? "rgba(22,199,132,0.5)" : "rgba(234,57,67,0.5)",
      }))
    );

    // Pattern markers
    const markers = patterns
      .map((p) => ({
        time: p.time as Time,
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

    candleSeriesRef.current.setMarkers(markers);
    chartRef.current?.timeScale().fitContent();
  }, [candles, patterns]);

  // ── Update forecast overlay ────────────────────────────────────────────────
  useEffect(() => {
    if (!forecastLineRef.current || !forecastBandRef.current) return;

    if (!sortedForecast.length) {
      forecastLineRef.current.setData([]);
      forecastBandRef.current.setData([] as any);
      return;
    }

    const mid = sortedForecast.map((p) => ({
      time: p.time_timestamp as Time,
      value: p.predicted_close,
    }));

    const band = sortedForecast.map((p) => ({
      time: p.time_timestamp as Time,
      value: p.predicted_close,
      lower_bound: p.lower_bound,
      upper_bound: p.upper_bound,
    }));

    forecastLineRef.current.setData(mid);
    forecastBandRef.current.setData(band as any);
  }, [sortedForecast]);

  // ── Render ─────────────────────────────────────────────────────────────────
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

      {/* Chart canvas */}
      <div ref={containerRef} className="w-full" style={{ height }} />

      {/* Forecast hover tooltip */}
      {tooltipState.visible && (
        <div
          className="pointer-events-none absolute z-20 rounded-lg border border-white/10 bg-bg-base/95 px-3 py-2 text-xs shadow-xl backdrop-blur-md"
          style={{
            left: Math.max(
              8,
              Math.min(tooltipState.x, (containerRef.current?.clientWidth ?? 0) - 230)
            ),
            top: Math.max(8, Math.min(tooltipState.y, height - 115)),
            minWidth: 215,
          }}
        >
          <p className="mb-1 text-[10px] uppercase tracking-widest text-text-muted font-semibold">
            Forecast
          </p>
          <p className="text-accent-yellow font-medium">
            Predicted:&nbsp;{tooltipState.yhat.toFixed(2)}
          </p>
          <p className="text-accent-green">
            Upper bound (TP):&nbsp;{tooltipState.upper.toFixed(2)}
          </p>
          <p className="text-accent-red">
            Lower bound (SL):&nbsp;{tooltipState.lower.toFixed(2)}
          </p>
        </div>
      )}
    </div>
  );
}
