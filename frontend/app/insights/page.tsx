"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

import { api } from "@/lib/api";
import type { DailyInsight } from "@/lib/types";

import { Card } from "@/components/ui/Card";

import {
  fmtNumber,
  fmtPct,
  colorByChange,
  cls,
} from "@/lib/utils";

import {
  Activity,
  ArrowRightLeft,
  BookOpen,
  Calendar,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import {
  AnomalyInterpretationCard,
  CrossAssetInsightCard,
  MarketNarrativeCard,
  SessionNarrativeCard,
  WeeklySummaryCard,
  type AnomalyInterpretation,
  type CrossAssetInsight,
  type StoryBlock,
  type WeeklySummary,
} from "@/components/dashboard/InsightCards";

const Plot = dynamic(
  () => import("@/components/charts/PlotlyClient"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[280px] flex items-center justify-center text-xs text-text-muted">
        Loading chart...
      </div>
    ),
  }
);

// ─────────────────────────────────────────────────────────────
// Extended type
// ─────────────────────────────────────────────────────────────

interface EnhancedDailyInsight extends DailyInsight {
  market_narrative?: StoryBlock;
  cross_asset_insights?: CrossAssetInsight[];
  anomaly_interpretations?: AnomalyInterpretation[];
  session_narratives?: string[];
  weekly_summary?: WeeklySummary;
}

// ─────────────────────────────────────────────────────────────
// Tabs
// ─────────────────────────────────────────────────────────────

const TABS = [
  {
    id: "overview",
    label: "Overview",
    icon: Activity,
  },
  {
    id: "narrative",
    label: "Narrative",
    icon: BookOpen,
  },
  {
    id: "cross",
    label: "Cross-Asset",
    icon: ArrowRightLeft,
  },
  {
    id: "anomalies",
    label: "Anomalies",
    icon: Sparkles,
  },
  {
    id: "sessions",
    label: "Sessions",
    icon: Calendar,
  },
  {
    id: "weekly",
    label: "Weekly",
    icon: TrendingUp,
  },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─────────────────────────────────────────────────────────────
// State styles
// ─────────────────────────────────────────────────────────────

const STATE_CONFIG: Record<
  string,
  {
    color: string;
    bg: string;
    pulse: string;
  }
> = {
  bullish: {
    color: "text-accent-green",
    bg: "bg-accent-green/10 border-accent-green/30",
    pulse: "bg-accent-green",
  },

  bearish: {
    color: "text-accent-red",
    bg: "bg-accent-red/10 border-accent-red/30",
    pulse: "bg-accent-red",
  },

  sideway: {
    color: "text-accent-yellow",
    bg: "bg-accent-yellow/10 border-accent-yellow/30",
    pulse: "bg-accent-yellow",
  },
};

// ─────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const [data, setData] =
    useState<EnhancedDailyInsight | null>(null);

  const [loading, setLoading] = useState(false);

  const [rebuilding, setRebuilding] =
    useState(false);

  const [activeTab, setTab] =
    useState<TabId>("overview");

  const load = async (force = false) => {
    try {
      if (!data) {
        setLoading(true);
      }

      if (force) {
        setRebuilding(true);
      }

      let r: EnhancedDailyInsight;

      try {
        r = force
          ? await api.rebuildInsight()
          : await (
              (api as any).enhancedInsight?.() ??
              api.dailyInsight()
            );
      } catch {
        r = force
          ? await api.rebuildInsight()
          : await api.dailyInsight();
      }

      setData(r);
    } catch (err) {
      console.error(err);
    } finally {
      if (!data) {
        setLoading(false);
      }

      setRebuilding(false);
    }
  };

  useEffect(() => {
    load(false);
  }, []);

  if (!data && loading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-muted text-sm">
        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
        Building market intelligence...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-text-muted text-sm">
        No insight data available.
      </div>
    );
  }

  const stateCfg =
    STATE_CONFIG[data.market_state] ??
    STATE_CONFIG.sideway;

  return (
    <div className="space-y-4">
      {/* Header */}

      <Card
        title="Daily Insight Report"
        action={
          <button
            onClick={() => load(true)}
            disabled={rebuilding}
            className="text-xs px-2 py-1 rounded-md bg-accent-cyan/15 text-accent-cyan hover:bg-accent-cyan/25 flex items-center gap-1 disabled:opacity-60 transition-colors"
          >
            <RefreshCw
              className={cls(
                "w-3.5 h-3.5",
                rebuilding && "animate-spin"
              )}
            />

            {rebuilding
              ? "Rebuilding..."
              : "Rebuild"}
          </button>
        }
      >
        <div
          className={cls(
            "rounded-xl border p-4 space-y-3",
            stateCfg.bg
          )}
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span
                  className={cls(
                    "animate-ping absolute inline-flex h-full w-full rounded-full opacity-60",
                    stateCfg.pulse
                  )}
                />

                <span
                  className={cls(
                    "relative inline-flex rounded-full h-2.5 w-2.5",
                    stateCfg.pulse
                  )}
                />
              </span>

              <span
                className={cls(
                  "text-2xl font-bold uppercase tracking-wide",
                  stateCfg.color
                )}
              >
                {data.market_state}
              </span>
            </div>

            <p className="text-text-secondary text-sm flex-1 min-w-0">
              {data.summary}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <StatPill
              label="Anomalies"
              value={String(
                data.anomalies?.length ?? 0
              )}
              color="text-accent-yellow"
            />

            <StatPill
              label="Cross-Asset"
              value={String(
                data.cross_asset_insights?.length ??
                  0
              )}
              color="text-accent-cyan"
            />

            <StatPill
              label="Gainers"
              value={String(
                data.top_gainers?.length ?? 0
              )}
              color="text-accent-green"
            />

            <StatPill
              label="Losers"
              value={String(
                data.top_losers?.length ?? 0
              )}
              color="text-accent-red"
            />
          </div>
        </div>

        <p className="text-[11px] text-text-muted mt-2">
          Generated{" "}
          {new Date(
            data.timestamp
          ).toLocaleString()}
          {" · "}
          {data.date}
        </p>
      </Card>

      {/* Tabs */}

      <div className="flex gap-1 flex-wrap">
        {TABS.map(
          ({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cls(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150",
                activeTab === id
                  ? "bg-accent-cyan/15 border-accent-cyan/40 text-accent-cyan"
                  : "bg-transparent border-transparent text-text-muted hover:text-text-secondary hover:bg-bg-surface/50"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          )
        )}
      </div>

      {/* OVERVIEW */}

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card
            title="Data-Driven Insights"
            action={
              <Sparkles className="w-4 h-4 text-accent-purple" />
            }
          >
            <ul className="space-y-2.5">
              {(data.insights ?? []).map(
                (s, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-sm leading-relaxed text-text-secondary"
                  >
                    <span className="text-accent-cyan shrink-0 mt-0.5">
                      ›
                    </span>

                    {s}
                  </li>
                )
              )}
            </ul>
          </Card>

          <div className="space-y-4">
            <Card
              title="Top Gainers (24h)"
              action={
                <TrendingUp className="w-4 h-4 text-accent-green" />
              }
            >
              <MoverList
                items={data.top_gainers ?? []}
              />
            </Card>

            <Card
              title="Top Losers (24h)"
              action={
                <TrendingDown className="w-4 h-4 text-accent-red" />
              }
            >
              <MoverList
                items={data.top_losers ?? []}
              />
            </Card>
          </div>
        </div>
      )}

      {/* NARRATIVE */}

      {activeTab === "narrative" && (
        <Card
          title="Market Narrative — 4W Framework"
          action={
            <BookOpen className="w-4 h-4 text-accent-purple" />
          }
        >
          {data.market_narrative ? (
            <MarketNarrativeCard
              narrative={
                data.market_narrative
              }
            />
          ) : (
            <FallbackText text="Narrative unavailable — rebuild to generate." />
          )}
        </Card>
      )}

      {/* CROSS */}

      {activeTab === "cross" && (
        <Card
          title="Cross-Asset Signals"
          action={
            <ArrowRightLeft className="w-4 h-4 text-accent-cyan" />
          }
        >
          <p className="text-xs text-text-muted mb-4">
            Relationships between Crypto,
            Gold, Equities, and Forex.
          </p>

          {(data.cross_asset_insights ?? [])
            .length === 0 ? (
            <FallbackText text="No cross-asset signals detected." />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {(
                data.cross_asset_insights ??
                []
              ).map((c, i) => (
                <CrossAssetInsightCard
                  key={i}
                  insight={c}
                />
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ANOMALIES */}

      {activeTab === "anomalies" && (
        <Card
          title="Anomaly Analysis"
          action={
            <Activity className="w-4 h-4 text-accent-yellow" />
          }
        >
          {(data.anomaly_interpretations ??
            []).length === 0 ? (
            <FallbackText text="No anomaly interpretations available." />
          ) : (
            <div className="space-y-3">
              {(
                data.anomaly_interpretations ??
                []
              ).map((interp, i) => {
                const raw =
                  (
                    data.anomalies ?? []
                  )[i] ?? {
                    change_24h_pct: 0,
                    volume_ratio: 1,
                  };

                return (
                  <AnomalyInterpretationCard
                    key={i}
                    interpretation={interp}
                    rawAnomaly={raw as any}
                  />
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* SESSIONS */}

      {activeTab === "sessions" && (
        <div className="space-y-4">
          {(data.sessions ?? []).length >
            0 && (
            <TimezoneChartCard data={data} />
          )}

          <Card
            title="Session Pattern Interpretation"
            action={
              <Calendar className="w-4 h-4 text-accent-cyan" />
            }
          >
            {(data.session_narratives ??
              []).length === 0 ? (
              <FallbackText text="Session narratives unavailable." />
            ) : (
              <SessionNarrativeCard
                narratives={
                  data.session_narratives ??
                  []
                }
              />
            )}
          </Card>
        </div>
      )}

      {/* WEEKLY */}

      {activeTab === "weekly" && (
        <Card
          title="Weekly Market Summary"
          action={
            <Calendar className="w-4 h-4 text-accent-purple" />
          }
        >
          {data.weekly_summary ? (
            <WeeklySummaryCard
              summary={data.weekly_summary}
            />
          ) : (
            <FallbackText text="Weekly summary unavailable." />
          )}
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub components
// ─────────────────────────────────────────────────────────────

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-lg bg-bg-surface/60 border border-line/40 px-3 py-2">
      <p className="text-[10px] uppercase text-text-muted tracking-wide">
        {label}
      </p>

      <p
        className={cls(
          "text-lg font-bold num-tabular",
          color
        )}
      >
        {value}
      </p>
    </div>
  );
}

function MoverList({
  items,
}: {
  items: DailyInsight["top_gainers"];
}) {
  return (
    <ul className="divide-y divide-line/40">
      {items.map((m, i) => (
        <li
          key={i}
          className="py-2 flex items-center justify-between text-sm"
        >
          <div>
            <div className="font-medium text-text-primary">
              {m.symbol}
            </div>

            <div className="text-[10px] uppercase text-text-muted">
              {m.asset_class}
            </div>
          </div>

          <div
            className={cls(
              "num-tabular text-right",
              colorByChange(m.change_pct)
            )}
          >
            {fmtPct(m.change_pct)}

            <span className="text-text-muted ml-2 text-xs block">
              vol {fmtNumber(m.volume)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function FallbackText({
  text,
}: {
  text: string;
}) {
  return (
    <p className="text-sm text-text-muted py-4 text-center">
      {text}
    </p>
  );
}

function TimezoneChartCard({
  data,
}: {
  data: EnhancedDailyInsight;
}) {
  const [mounted, setMounted] =
    useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sessions = data.sessions ?? [];

  const labels = sessions.map((s) =>
    s.session.toUpperCase()
  );

  if (!mounted) {
    return (
      <Card title="Timezone Analysis">
        <div className="h-[280px] flex items-center justify-center text-xs text-text-muted">
          Initializing chart...
        </div>
      </Card>
    );
  }

  return (
    <Card title="Timezone Analysis (Asia · Europe · US)">
      <div className="w-full overflow-hidden">
        <Plot
          key={`timezone-chart-${labels.join(
            "-"
          )}`}
          data={[
            {
              type: "bar",
              name: "Avg Volume",
              x: labels,
              y: sessions.map(
                (s) => s.avg_volume
              ),
              yaxis: "y",
              marker: {
                color: "#3b82f6",
              },
            },
            {
              type: "scatter",
              mode: "lines+markers",
              name: "Avg Volatility %",
              x: labels,
              y: sessions.map(
                (s) =>
                  s.avg_volatility_pct
              ),
              yaxis: "y2",
              line: {
                color: "#facc15",
                width: 3,
              },
              marker: {
                size: 8,
              },
            },
            {
              type: "scatter",
              mode: "lines+markers",
              name: "Net Change %",
              x: labels,
              y: sessions.map(
                (s) =>
                  s.net_change_pct
              ),
              yaxis: "y2",
              line: {
                color: "#a855f7",
                width: 3,
                dash: "dot",
              },
              marker: {
                size: 8,
              },
            },
          ]}
          layout={{
            margin: {
              t: 10,
              l: 50,
              r: 50,
              b: 40,
            },

            height: 280,

            autosize: true,

            paper_bgcolor: "transparent",

            plot_bgcolor: "transparent",

            font: {
              color: "#e6edf7",
              size: 11,
            },

            legend: {
              orientation: "h",
              y: -0.25,
            },

            xaxis: {
              gridcolor:
                "rgba(31,42,64,0.5)",
            },

            yaxis: {
              title: "Volume",
              gridcolor:
                "rgba(31,42,64,0.5)",
            },

            yaxis2: {
              title: "%",
              overlaying: "y",
              side: "right",
              gridcolor:
                "rgba(31,42,64,0.5)",
            },
          }}
          config={{
            responsive: true,
            displayModeBar: false,
          }}
          style={{
            width: "100%",
            height: "280px",
          }}
          useResizeHandler={true}
        />
      </div>
    </Card>
  );
}