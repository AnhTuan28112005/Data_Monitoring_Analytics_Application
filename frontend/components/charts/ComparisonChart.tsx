"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { useDateRangeStore } from "@/lib/stores/dateRangeStore";
import type { AssetClass } from "@/lib/types";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { SkeletonChart } from "@/components/ui/Skeleton";

const Plot = dynamic(() => import("@/components/charts/PlotlyClient"), { ssr: false }) as any;

const PLOT_LAYOUT_BASE = {
  paper_bgcolor: "transparent",
  plot_bgcolor: "transparent",
  font: { color: "#e6edf7", size: 11 },
  margin: { t: 20, l: 40, r: 20, b: 35 },
  xaxis: { gridcolor: "rgba(31,42,64,0.5)" },
  yaxis: { gridcolor: "rgba(31,42,64,0.5)" },
  autosize: true,
};

interface Asset {
  symbol: string;
  asset_class: AssetClass;
  label: string;
  color: string;
}

interface ComparisonChartProps {
  assets: Asset[];
  timeframe?: string;
}

export function ComparisonChart({ assets, timeframe = "1d" }: ComparisonChartProps) {
  const [series, setSeries] = useState<{ name: string; color: string; x: Date[]; y: number[] }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dateRange = useDateRangeStore((s) => s.dateRange);

  useEffect(() => {
    if (assets.length === 0) {
      setSeries([]);
      return;
    }

    let alive = true;
    setLoading(true);
    setError(null);

    const startDate = format(dateRange.startDate, "yyyy-MM-dd");
    const endDate = format(dateRange.endDate, "yyyy-MM-dd");

    Promise.all(
      assets.map(async (a) => {
        try {
          const r = await api.ohlcv(a.asset_class, a.symbol, timeframe, 200, startDate, endDate);
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
      if (alive) {
        const validSeries = rs.filter((x): x is NonNullable<typeof x> => x !== null);
        setSeries(validSeries);
        if (validSeries.length === 0 && assets.length > 0) {
          setError("No data available for selected assets");
        } else {
          setError(null);
        }
        setLoading(false);
      }
    }).catch((err) => {
      if (alive) {
        setError(err.message || "Failed to load comparison data");
        setSeries([]);
        setLoading(false);
      }
    });

    return () => { alive = false; };
  }, [assets, timeframe, dateRange]);

  if (assets.length === 0) {
    return (
      <div className="w-full h-96 flex items-center justify-center text-text-muted">
        Select assets to compare
      </div>
    );
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={() => setError(null)} />;
  }

  if (loading) {
    return <SkeletonChart height={500} />;
  }

  if (series.length === 0) {
    return (
      <div className="w-full h-96 flex items-center justify-center text-text-muted">
        No data available for selected assets
      </div>
    );
  }

  return (
    <>
      <Plot
        data={series.map((s) => ({
          type: "scatter",
          mode: "lines",
          name: s.name,
          x: s.x,
          y: s.y,
          line: { color: s.color, width: 2.5 },
          hovertemplate: `${s.name}: %{y:.2f}<extra></extra>`,
        }))}
        layout={{
          ...PLOT_LAYOUT_BASE,
          height: 500,
          legend: { orientation: "h", y: -0.15 },
          yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: "Normalized Index (base=100)" },
          xaxis: { ...PLOT_LAYOUT_BASE.xaxis, title: "Date" },
        }}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: "100%", height: "500px" }}
        useResizeHandler
      />
      <div className="mt-4 p-3 bg-bg-card/50 border border-line/40 rounded-lg text-sm text-text-secondary">
        <p className="text-xs uppercase tracking-widest text-text-muted mb-2">💡 Comparison Analysis</p>
        <p className="leading-relaxed">
          Comparing performance of {series.length} assets on a normalized basis (base=100). Asset{" "}
          <span className="text-text-primary font-semibold">
            {series.length > 0 ? series[series.length - 1].name : "—"}
          </span>{" "}
          is currently{" "}
          <span className={series.length > 0 && series[series.length - 1].y[series[series.length - 1].y.length - 1] > 100 ? "text-accent-green" : "text-accent-red"}>
            {series.length > 0 && series[series.length - 1].y[series[series.length - 1].y.length - 1] > 100 ? "outperforming" : "underperforming"}
          </span>{" "}
          relative to other assets over the selected time period.
        </p>
      </div>
    </>
  );
}
