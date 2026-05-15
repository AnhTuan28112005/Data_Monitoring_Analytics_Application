"use client";

import { TrendingUp, TrendingDown, Minus, BarChart2, Clock, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cls } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ForecastNarrative {
  what_happened: string;
  why: string;
  so_what: string;
  what_next: string;
}

interface ForecastItem {
  symbol: string;
  asset_class: string;
  available: boolean;
  reason?: string;
  current_price?: number;
  predicted_price?: number;
  lower_bound?: number;
  upper_bound?: number;
  pct_change?: number;
  pct_change_midpoint?: number;
  uncertainty_pct?: number;
  horizon_hours?: number;
  direction?: "upward" | "downward" | "sideways";
  confidence?: "high" | "medium" | "low";
  narrative?: ForecastNarrative;
}

interface AssetContext {
  label: string;
  current_price: number;
  period_high: number;
  period_low: number;
  position_pct: number;
  proximity: string;
  proximity_implication: string;
  pct_1d: number;
  pct_7d: number;
  vol_regime: string;
  vol_change_vs_prior_pct: number;
  recent_volatility_pct: number;
}

interface HistoricalContext {
  observation_window: string;
  summary: string;
  assets: AssetContext[];
}

interface Props {
  forecasts: ForecastItem[] | null | undefined;
  historicalContext: HistoricalContext | null | undefined;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DIRECTION_CONFIG = {
  upward:    { icon: TrendingUp,   color: "text-accent-green",  bg: "bg-accent-green/10 border-accent-green/30",  label: "UPWARD FORECAST" },
  downward:  { icon: TrendingDown, color: "text-accent-red",    bg: "bg-accent-red/10 border-accent-red/30",      label: "DOWNWARD FORECAST" },
  sideways:  { icon: Minus,        color: "text-accent-yellow", bg: "bg-accent-yellow/10 border-accent-yellow/30", label: "SIDEWAYS FORECAST" },
};

const CONFIDENCE_COLOR: Record<string, string> = {
  high:   "text-accent-green",
  medium: "text-accent-yellow",
  low:    "text-accent-red",
};

function NarrativeBlock({ label, text, accent }: { label: string; text: string; accent: string }) {
  return (
    <div className="space-y-1">
      <p className={cls("text-[10px] font-bold uppercase tracking-widest", accent)}>{label}</p>
      <p className="text-sm text-text-secondary leading-relaxed">{text}</p>
    </div>
  );
}

function PositionBar({ pct, label }: { pct: number; label: string }) {
  const color =
    pct >= 80 ? "bg-accent-red" :
    pct <= 20 ? "bg-accent-green" :
    "bg-accent-cyan";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] text-text-muted">
        <span>Period Low</span>
        <span className="font-medium text-text-secondary">{label} — {pct.toFixed(0)}%</span>
        <span>Period High</span>
      </div>
      <div className="relative h-2 rounded-full bg-bg-surface overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: "rgb(var(--line))" }}
        />
        <div
          className={cls("absolute top-0 h-full w-1.5 rounded-full -translate-x-1/2 transition-all duration-700", color)}
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Forecast Card (one per symbol) ──────────────────────────────────────────

function ForecastCard({ fc }: { fc: ForecastItem }) {
  if (!fc.available) {
    return (
      <div className="rounded-xl border border-line/30 bg-bg-surface/40 p-4 flex items-center gap-3">
        <AlertTriangle className="w-4 h-4 text-text-muted shrink-0" />
        <div>
          <p className="text-sm font-medium text-text-primary">{fc.symbol}</p>
          <p className="text-xs text-text-muted">{fc.reason ?? "Forecast unavailable."}</p>
        </div>
      </div>
    );
  }

  const dir = fc.direction ?? "sideways";
  const cfg = DIRECTION_CONFIG[dir];
  const Icon = cfg.icon;
  const pctChange = fc.pct_change ?? 0;

  return (
    <div className={cls("rounded-xl border p-4 space-y-4", cfg.bg)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className={cls("w-5 h-5", cfg.color)} />
          <div>
            <p className="font-bold text-text-primary text-sm">{fc.symbol}</p>
            <p className={cls("text-xs uppercase tracking-wide font-semibold", cfg.color)}>{cfg.label}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={cls("text-2xl font-bold num-tabular", cfg.color)}>
            {pctChange > 0 ? "+" : ""}{pctChange.toFixed(2)}%
          </p>
          <p className="text-[10px] text-text-muted">in the next ~{fc.horizon_hours}h</p>
        </div>
      </div>

      {/* Price targets */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-bg-base/50 p-2">
          <p className="text-[10px] uppercase text-text-muted">Current Price</p>
          <p className="text-sm font-bold text-text-primary num-tabular">
            ${(fc.current_price ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className={cls("rounded-lg bg-bg-base/50 p-2 border", cfg.bg)}>
          <p className="text-[10px] uppercase text-text-muted">Forecast</p>
          <p className={cls("text-sm font-bold num-tabular", cfg.color)}>
            ${(fc.predicted_price ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-lg bg-bg-base/50 p-2">
          <p className="text-[10px] uppercase text-text-muted">Confidence</p>
          <p className={cls("text-sm font-bold capitalize", CONFIDENCE_COLOR[fc.confidence ?? "medium"])}>
            {fc.confidence}
          </p>
        </div>
      </div>

      {/* Confidence band */}
      <div className="space-y-1">
        <p className="text-[10px] uppercase text-text-muted">
          Confidence Interval (±{((fc.uncertainty_pct ?? 0) / 2).toFixed(1)}%)
        </p>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-accent-red num-tabular">
            ${(fc.lower_bound ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
          <div className="flex-1 h-1.5 rounded-full bg-bg-surface relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-accent-red/40 via-accent-cyan/40 to-accent-green/40" />
          </div>
          <span className="text-accent-green num-tabular">
            ${(fc.upper_bound ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* 4W Narrative */}
      {fc.narrative && (
        <div className="border-t border-line/20 pt-3 space-y-3">
          <NarrativeBlock label="📊 What happened" text={fc.narrative.what_happened} accent="text-accent-cyan" />
          <NarrativeBlock label="🔍 Why"           text={fc.narrative.why}           accent="text-accent-purple" />
          <NarrativeBlock label="💡 So what"        text={fc.narrative.so_what}       accent="text-accent-yellow" />
          <NarrativeBlock label="🎯 What next"      text={fc.narrative.what_next}     accent="text-accent-green" />
        </div>
      )}
    </div>
  );
}

// ─── Historical Context Card ──────────────────────────────────────────────────

function HistoricalContextCard({ ctx }: { ctx: HistoricalContext }) {
  return (
    <div className="space-y-4">
      {/* Overall summary */}
      <div className="rounded-xl border border-accent-cyan/20 bg-accent-cyan/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <BarChart2 className="w-4 h-4 text-accent-cyan" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-accent-cyan">
            Market Positioning Summary
          </p>
        </div>
        <p className="text-sm text-text-secondary leading-relaxed">{ctx.summary}</p>
        <p className="text-[10px] text-text-muted mt-2 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Observation window: {ctx.observation_window}
        </p>
      </div>

      {/* Per-asset context */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {ctx.assets.map((asset) => {
          const volColor =
            asset.vol_regime.includes("expanding") ? "text-accent-red" :
            asset.vol_regime.includes("contracting") ? "text-accent-yellow" :
            "text-accent-green";

          return (
            <div key={asset.label} className="rounded-xl border border-line/30 bg-bg-surface/40 p-4 space-y-3">
              {/* Asset header */}
              <div className="flex justify-between items-start">
                <p className="font-bold text-text-primary text-sm">{asset.label}</p>
                <div className="text-right">
                  <p className={cls("text-xs font-semibold num-tabular", asset.pct_1d >= 0 ? "text-accent-green" : "text-accent-red")}>
                    {asset.pct_1d >= 0 ? "+" : ""}{asset.pct_1d.toFixed(2)}% (1d)
                  </p>
                  <p className={cls("text-[10px] num-tabular text-text-muted")}>
                    {asset.pct_7d >= 0 ? "+" : ""}{asset.pct_7d.toFixed(2)}% (7d)
                  </p>
                </div>
              </div>

              {/* Position bar */}
              <PositionBar pct={asset.position_pct} label={asset.label} />

              {/* Proximity note */}
              <p className="text-[11px] text-text-secondary leading-relaxed">
                <span className="font-medium text-text-primary capitalize">{asset.proximity}: </span>
                {asset.proximity_implication}
              </p>

              {/* Volatility */}
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-text-muted">Volatility regime:</span>
                <span className={cls("font-medium capitalize", volColor)}>
                  {asset.vol_regime.split(" (")[0]}
                  {asset.vol_change_vs_prior_pct !== 0 && (
                    <span className="text-text-muted ml-1">
                      ({asset.vol_change_vs_prior_pct > 0 ? "+" : ""}{asset.vol_change_vs_prior_pct.toFixed(0)}% vs prior)
                    </span>
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export function ForecastInsightCard({ forecasts, historicalContext }: Props) {
  const hasForecasts = forecasts && forecasts.length > 0;
  const hasHistory   = historicalContext && historicalContext.assets.length > 0;

  if (!hasForecasts && !hasHistory) {
    return (
      <Card title="Forecast & Market Positioning">
        <p className="text-sm text-text-muted py-6 text-center">
          Forecast data not available. Click <strong>Rebuild</strong> to generate.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* ─── Prophet Forecast ─── */}
      {hasForecasts && (
        <Card
          title="AI Price Forecast (Prophet Model)"
          action={<TrendingUp className="w-4 h-4 text-accent-cyan" />}
        >
          <p className="text-xs text-text-muted mb-4">
            Price forecast using Facebook Prophet model — analyzing seasonality and trends from historical data. 
            Results are for reference only, not investment advice.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {forecasts.map((fc) => (
              <ForecastCard key={fc.symbol} fc={fc} />
            ))}
          </div>
        </Card>
      )}

      {/* ─── Historical Context ─── */}
      {hasHistory && (
        <Card
          title="Market Positioning & Historical Context"
          action={<BarChart2 className="w-4 h-4 text-accent-purple" />}
        >
          <HistoricalContextCard ctx={historicalContext} />
        </Card>
      )}
    </div>
  );
}
