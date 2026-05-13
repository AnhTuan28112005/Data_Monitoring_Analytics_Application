"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { useDateRangeStore } from "@/lib/stores/dateRangeStore";
import type { AssetClass } from "@/lib/types";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { SkeletonChart } from "@/components/ui/Skeleton";
import { cls } from "@/lib/utils";

const Plot = dynamic(() => import("@/components/charts/PlotlyClient"), { ssr: false }) as any;

const PLOT_LAYOUT_BASE = {
  paper_bgcolor: "transparent",
  plot_bgcolor: "transparent",
  font: { color: "#e6edf7", size: 11 },
  margin: { t: 20, l: 80, r: 20, b: 35 }, // Increased left margin from 40 to 80
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
          const r = await api.ohlcv(a.asset_class, a.symbol, timeframe, 1000, startDate, endDate);
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
  
  const analysis = useMemo(() => {
    if (series.length === 0) return null;
    const items = series.map(s => ({
      name: s.name,
      last: s.y[s.y.length - 1],
      first: s.y[0]
    })).sort((a, b) => b.last - a.last);
    
    const top = items[0];
    const bottom = items[items.length - 1];
    const spread = top.last - bottom.last;
    
    let strategy = "";
    if (spread > 15) {
      strategy = `High market fragmentation detected (${spread.toFixed(1)}% spread). Current rotation strongly favors ${top.name}. Opportunity: Look for 'catch-up' trades in high-quality assets like ${bottom.name} if they show signs of bottoming, or ride the momentum of the leader.`;
    } else if (spread < 5) {
      strategy = "High market correlation observed. Assets are moving in lockstep, suggesting a macro-driven environment. Strategy: Focus on position sizing and risk management rather than asset selection, as the entire basket is following the same trend.";
    } else {
      strategy = `${top.name} is showing relative strength in the current window. Strategy: Maintain exposure to the leader while monitoring for potential exhaustion. The moderate divergence suggests a healthy market structure with clear sector preferences.`;
    }
    
    return { top, bottom, spread, strategy };
  }, [series]);

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
          yaxis: { 
            ...PLOT_LAYOUT_BASE.yaxis, 
            title: { text: "Normalized Index (base=100)", standoff: 60 } // Increased standoff to 60
          },
          xaxis: { ...PLOT_LAYOUT_BASE.xaxis, title: "Date" },
        }}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: "100%", height: "500px" }}
        useResizeHandler
      />
      <div className="mt-4 p-3 bg-bg-card/50 border border-line/40 rounded-lg text-[13px] text-text-primary leading-relaxed min-h-[150px] flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-3 border-b border-line/20 pb-2">
            <p className="uppercase tracking-widest text-[10px] text-text-muted font-bold">Multi-Asset Performance Report</p>
          </div>
          <p className="leading-relaxed">
            Comparing performance of <span className="text-text-primary font-bold">{series.length} assets</span> on a normalized basis (base=100). <span className="text-accent-cyan font-bold">{analysis?.top.name}</span> is currently <span className="text-accent-green font-bold">outperforming</span> the basket, while <span className="text-accent-red font-bold">{analysis?.bottom.name}</span> is showing relative weakness.
          </p>
        </div>
        <div className="mt-3 pt-3 border-t border-line/30">
          <p className="text-[13px] text-text-primary leading-relaxed">
            <span className="text-accent-cyan font-bold uppercase text-[10px] mr-2">Strategy:</span> 
            {analysis?.strategy}
          </p>
        </div>
      </div>
    </>
  );
}
