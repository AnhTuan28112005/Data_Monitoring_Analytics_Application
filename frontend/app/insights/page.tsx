"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import type { DailyInsight } from "@/lib/types";
import { fmtNumber, fmtPct, colorByChange, cls } from "@/lib/utils";
import dynamic from "next/dynamic";
import { Activity, RefreshCw, Sparkles, TrendingDown, TrendingUp } from "lucide-react";

const Plot = dynamic(() => import("@/components/charts/PlotlyClient"), { ssr: false });

export default function InsightsPage() {
  const [data, setData] = useState<DailyInsight | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async (force = false) => {
    setLoading(true);
    try {
      const r = force ? await api.rebuildInsight() : await api.dailyInsight();
      setData(r);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(false); }, []);

  if (!data) {
    return <div className="text-text-muted">Loading insight…</div>;
  }

  const stateColor =
    data.market_state === "bullish" ? "text-accent-green" :
    data.market_state === "bearish" ? "text-accent-red" : "text-accent-yellow";

  return (
    <div className="space-y-4">
      <Card
        title="Daily Insight Report"
        action={
          <button
            onClick={() => load(true)}
            disabled={loading}
            className="text-xs px-2 py-1 rounded-md bg-accent-cyan/15 text-accent-cyan hover:bg-accent-cyan/25 flex items-center gap-1 disabled:opacity-60"
          >
            <RefreshCw className={cls("w-3.5 h-3.5", loading && "animate-spin")} /> Rebuild
          </button>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className={`text-2xl font-bold uppercase tracking-wide ${stateColor}`}>
            {data.market_state}
          </div>
          <div className="text-text-secondary text-sm">{data.summary}</div>
        </div>
        <div className="text-[11px] text-text-muted mt-2">
          Generated at {new Date(data.timestamp).toLocaleString()} · Date: {data.date}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Macro & Anomalies" action={<Activity className="w-4 h-4 text-accent-yellow" />}>
          {data.anomalies.length === 0 && (
            <div className="text-sm text-text-muted">No anomalies detected.</div>
          )}
          <ul className="divide-y divide-line/40">
            {data.anomalies.map((a, i) => (
              <li key={i} className="py-2 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">
                    {a.symbol} <span className="text-[10px] uppercase text-text-muted">{a.asset_class}</span>
                  </div>
                  <div className="text-xs text-text-muted">{a.note}</div>
                </div>
                <div className="text-right">
                  <div className={`num-tabular ${colorByChange(a.change_24h_pct)}`}>{fmtPct(a.change_24h_pct)}</div>
                  <div className="text-[11px] text-text-muted">vol ×{a.volume_ratio}</div>
                </div>
              </li>
            ))}
          </ul>
          {data.anomalies.length > 0 && (
            <div className="mt-3 p-2 bg-bg-card/50 border border-line/40 rounded text-xs text-text-secondary">
              <p className="text-[10px] uppercase text-text-muted mb-1">📊 Summary</p>
              <p>{data.anomalies.length} anomalies with unusual volume movements detected.</p>
            </div>
          )}
        </Card>

        <Card title="Data-driven Insights" action={<Sparkles className="w-4 h-4 text-accent-purple" />}>
          <ul className="space-y-2">
            {data.insights.map((s, i) => (
              <li key={i} className="text-sm leading-relaxed text-text-primary">
                <span className="text-accent-cyan mr-2">›</span>{s}
              </li>
            ))}
          </ul>
          {data.insights.length > 0 && (
            <div className="mt-3 p-2 bg-bg-card/50 border border-line/40 rounded text-xs text-text-secondary">
              <p className="text-[10px] uppercase text-text-muted mb-1">📊 Summary</p>
              <p>{data.insights.length} key insights from market analysis.</p>
            </div>
          )}
        </Card>
      </div>

      <TimezoneAnalysisCard data={data} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Top Gainers (24h)" action={<TrendingUp className="w-4 h-4 text-accent-green" />}>
          <MoverList items={data.top_gainers} />
        </Card>
        <Card title="Top Losers (24h)" action={<TrendingDown className="w-4 h-4 text-accent-red" />}>
          <MoverList items={data.top_losers} />
        </Card>
      </div>
    </div>
  );
}

function MoverList({ items }: { items: DailyInsight["top_gainers"] }) {
  return (
    <ul className="divide-y divide-line/40">
      {items.map((m, i) => (
        <li key={i} className="py-2 flex items-center justify-between text-sm">
          <div>
            <div className="font-medium">{m.symbol}</div>
            <div className="text-[10px] uppercase text-text-muted">{m.asset_class}</div>
          </div>
          <div className={`num-tabular ${colorByChange(m.change_pct)}`}>
            {fmtPct(m.change_pct)}
            <span className="text-text-muted ml-2 text-xs">vol {fmtNumber(m.volume)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function TimezoneAnalysisCard({ data }: { data: DailyInsight }) {
  if (!data.sessions || data.sessions.length === 0) {
    return null;
  }
  const labels = data.sessions.map((s) => s.session.toUpperCase());
  return (
    <Card title="Timezone Analysis (Asia · Europe · US)">
      <Plot
        data={[
          {
            type: "bar",
            name: "Avg Volume",
            x: labels,
            y: data.sessions.map((s) => s.avg_volume),
            yaxis: "y",
            marker: { color: "#3b82f6" },
          },
          {
            type: "scatter",
            mode: "lines+markers",
            name: "Avg Volatility %",
            x: labels,
            y: data.sessions.map((s) => s.avg_volatility_pct),
            yaxis: "y2",
            line: { color: "#facc15", width: 3 },
            marker: { size: 9 },
          },
          {
            type: "scatter",
            mode: "lines+markers",
            name: "Net Change %",
            x: labels,
            y: data.sessions.map((s) => s.net_change_pct),
            yaxis: "y2",
            line: { color: "#a855f7", width: 3, dash: "dot" },
            marker: { size: 9 },
          },
        ]}
        layout={{
          margin: { t: 10, l: 50, r: 50, b: 30 },
          paper_bgcolor: "transparent",
          plot_bgcolor: "transparent",
          font: { color: "#e6edf7", size: 11 },
          height: 320,
          autosize: true,
          legend: { orientation: "h", y: -0.15 },
          yaxis: { title: "Volume", gridcolor: "rgba(31,42,64,0.5)" },
          yaxis2: { title: "%", overlaying: "y", side: "right", gridcolor: "rgba(31,42,64,0.5)" },
          xaxis: { gridcolor: "rgba(31,42,64,0.5)" },
        }}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: "100%", height: "320px" }}
        useResizeHandler
      />
      <div className="mt-3 p-2 bg-bg-card/50 border border-line/40 rounded text-xs text-text-secondary">
        <p className="text-[10px] uppercase text-text-muted mb-1">📊 Session Summary</p>
        <p>Trading activity across Asia, Europe, and US sessions. Each session shows distinct volume and volatility patterns.</p>
      </div>
    </Card>
  );
}
