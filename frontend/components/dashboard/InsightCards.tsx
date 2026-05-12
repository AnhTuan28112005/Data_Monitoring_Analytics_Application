"use client";

import { cls, colorByChange, fmtPct } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  BarChart2,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  Globe,
  HelpCircle,
  Lightbulb,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useState } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StoryBlock {
  what_happened: string;
  why: string;
  so_what: string;
  what_next: string;
  confidence: "high" | "medium" | "low";
  tags: string[];
}

export interface CrossAssetInsight {
  title: string;
  description: string;
  signal_strength: number;
  assets_involved: string[];
  regime: "risk-on" | "risk-off" | "rotation" | "divergence" | "neutral";
}

export interface AnomalyInterpretation {
  symbol: string;
  asset_class: string;
  what_happened: string;
  possible_causes: string[];
  market_impact: string;
  suggested_action: string;
  severity: "critical" | "notable" | "watch";
}

export interface WeeklySummary {
  period: string;
  headline: string;
  narrative: string;
  key_events: string[];
  winners: string[];
  losers: string[];
  outlook: string;
}

// ─── Regime badge ────────────────────────────────────────────────────────────

const REGIME_STYLES: Record<string, string> = {
  "risk-on":   "bg-accent-green/15  text-accent-green  border-accent-green/30",
  "risk-off":  "bg-accent-red/15    text-accent-red    border-accent-red/30",
  rotation:    "bg-accent-yellow/15 text-accent-yellow border-accent-yellow/30",
  divergence:  "bg-accent-purple/15 text-accent-purple border-accent-purple/30",
  neutral:     "bg-accent-cyan/10   text-accent-cyan   border-accent-cyan/20",
};

export function RegimeBadge({ regime }: { regime: string }) {
  return (
    <span
      className={cls(
        "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border",
        REGIME_STYLES[regime] ?? REGIME_STYLES.neutral
      )}
    >
      {regime}
    </span>
  );
}

// ─── Confidence pill ──────────────────────────────────────────────────────────

const CONF_STYLES: Record<string, string> = {
  high:   "bg-accent-green/15 text-accent-green",
  medium: "bg-accent-yellow/15 text-accent-yellow",
  low:    "bg-text-muted/20 text-text-muted",
};

function ConfidencePill({ confidence }: { confidence: string }) {
  return (
    <span
      className={cls(
        "text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full",
        CONF_STYLES[confidence] ?? CONF_STYLES.medium
      )}
    >
      {confidence} confidence
    </span>
  );
}

// ─── Signal strength bar ──────────────────────────────────────────────────────

function SignalBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 70 ? "bg-accent-red" : pct >= 40 ? "bg-accent-yellow" : "bg-accent-green";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-line/40 overflow-hidden">
        <div
          className={cls("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] text-text-muted w-8 text-right">{pct}%</span>
    </div>
  );
}

// ─── Severity indicator ───────────────────────────────────────────────────────

const SEVERITY_CONFIG = {
  critical: { label: "Critical",  color: "text-accent-red",    bg: "bg-accent-red/10    border-accent-red/30",    icon: AlertTriangle },
  notable:  { label: "Notable",   color: "text-accent-yellow", bg: "bg-accent-yellow/10 border-accent-yellow/30", icon: Eye           },
  watch:    { label: "Watch",     color: "text-accent-cyan",   bg: "bg-accent-cyan/10   border-accent-cyan/20",   icon: Clock         },
};

// ─── 4W Story Card ────────────────────────────────────────────────────────────

const STORY_STEPS = [
  { key: "what_happened", label: "What Happened?", icon: BarChart2,   color: "text-accent-cyan"   },
  { key: "why",           label: "Why?",           icon: HelpCircle,  color: "text-accent-purple" },
  { key: "so_what",       label: "So What?",       icon: Lightbulb,   color: "text-accent-yellow" },
  { key: "what_next",     label: "What Next?",     icon: ArrowRight,  color: "text-accent-green"  },
] as const;

export function MarketNarrativeCard({ narrative }: { narrative: StoryBlock }) {
  const [active, setActive] = useState<string>("what_happened");

  return (
    <div className="space-y-3">
      {/* Step tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {STORY_STEPS.map(({ key, label, icon: Icon, color }) => (
          <button
            key={key}
            onClick={() => setActive(key)}
            className={cls(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 border",
              active === key
                ? "bg-bg-surface border-line text-text-primary shadow-sm"
                : "bg-transparent border-transparent text-text-muted hover:text-text-secondary hover:bg-bg-surface/50"
            )}
          >
            <Icon className={cls("w-3.5 h-3.5 shrink-0", active === key ? color : "")} />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>

      {/* Active step content */}
      {STORY_STEPS.map(({ key, label, icon: Icon, color }) =>
        active !== key ? null : (
          <div
            key={key}
            className="rounded-xl border border-line/60 bg-bg-card/70 p-4 space-y-3"
          >
            <div className="flex items-center gap-2">
              <Icon className={cls("w-4 h-4", color)} />
              <h4 className="text-sm font-semibold text-text-primary">{label}</h4>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">
              {narrative[key as keyof StoryBlock] as string}
            </p>
          </div>
        )
      )}

      {/* Footer: confidence + tags */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <ConfidencePill confidence={narrative.confidence} />
        {narrative.tags.map((t) => (
          <span
            key={t}
            className="text-[10px] px-2 py-0.5 rounded bg-line/30 text-text-muted"
          >
            #{t}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Cross-Asset Insight Card ─────────────────────────────────────────────────

export function CrossAssetInsightCard({ insight }: { insight: CrossAssetInsight }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-line/60 bg-bg-card/70 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <ArrowRightLeft className="w-4 h-4 text-accent-cyan shrink-0" />
          <h4 className="text-sm font-semibold text-text-primary leading-snug">{insight.title}</h4>
        </div>
        <RegimeBadge regime={insight.regime} />
      </div>

      {/* Signal strength */}
      <div>
        <p className="text-[10px] uppercase text-text-muted mb-1 tracking-wide">Signal Strength</p>
        <SignalBar value={insight.signal_strength} />
      </div>

      {/* Assets involved */}
      <div className="flex flex-wrap gap-1.5">
        {insight.assets_involved.map((a) => (
          <span key={a} className="text-[11px] px-2 py-0.5 rounded bg-line/30 text-text-secondary font-mono">
            {a}
          </span>
        ))}
      </div>

      {/* Expandable description */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 text-[11px] text-accent-cyan hover:text-accent-cyan/80 transition-colors"
      >
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {expanded ? "Hide analysis" : "Read full analysis"}
      </button>

      {expanded && (
        <p className="text-sm text-text-secondary leading-relaxed border-t border-line/30 pt-3">
          {insight.description}
        </p>
      )}
    </div>
  );
}

// ─── Anomaly Interpretation Card ──────────────────────────────────────────────

export function AnomalyInterpretationCard({
  interpretation,
  rawAnomaly,
}: {
  interpretation: AnomalyInterpretation;
  rawAnomaly: { change_24h_pct: number; volume_ratio: number };
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = SEVERITY_CONFIG[interpretation.severity];
  const Icon = cfg.icon;

  return (
    <div className={cls("rounded-xl border p-4 space-y-3", cfg.bg)}>
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className={cls("w-4 h-4", cfg.color)} />
          <div>
            <span className="font-semibold text-sm text-text-primary">{interpretation.symbol}</span>
            <span className="text-[10px] uppercase text-text-muted ml-2">
              {interpretation.asset_class}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className={cls("text-sm font-bold num-tabular", colorByChange(rawAnomaly.change_24h_pct))}>
            {fmtPct(rawAnomaly.change_24h_pct)}
          </div>
          <div className="text-[11px] text-text-muted">vol ×{rawAnomaly.volume_ratio}</div>
        </div>
      </div>

      {/* What happened (always visible) */}
      <p className="text-xs text-text-secondary leading-relaxed">
        {interpretation.what_happened}
      </p>

      {/* Expand/collapse */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className={cls("flex items-center gap-1 text-[11px] font-medium transition-colors", cfg.color)}
      >
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {expanded ? "Hide details" : "View causes, impact & action"}
      </button>

      {expanded && (
        <div className="space-y-4 border-t border-line/30 pt-3">
          {/* Possible causes */}
          <div>
            <p className="text-[10px] uppercase text-text-muted mb-2 tracking-wide flex items-center gap-1">
              <HelpCircle className="w-3 h-3" /> Possible Causes
            </p>
            <ul className="space-y-1">
              {interpretation.possible_causes.map((c, i) => (
                <li key={i} className="flex gap-2 text-xs text-text-secondary">
                  <span className="text-text-muted mt-0.5 shrink-0">·</span>
                  {c}
                </li>
              ))}
            </ul>
          </div>

          {/* Market impact */}
          <div>
            <p className="text-[10px] uppercase text-text-muted mb-1.5 tracking-wide flex items-center gap-1">
              <Globe className="w-3 h-3" /> Market Impact
            </p>
            <p className="text-xs text-text-secondary leading-relaxed">
              {interpretation.market_impact}
            </p>
          </div>

          {/* Suggested action */}
          <div className="rounded-lg bg-bg-surface/60 border border-line/40 p-3">
            <p className="text-[10px] uppercase text-text-muted mb-1.5 tracking-wide flex items-center gap-1">
              <Zap className="w-3 h-3 text-accent-yellow" /> Suggested Action
            </p>
            <p className="text-xs text-text-secondary leading-relaxed">
              {interpretation.suggested_action}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Session Narrative Card ────────────────────────────────────────────────────

export function SessionNarrativeCard({ narratives }: { narratives: string[] }) {
  if (!narratives.length) return null;

  return (
    <div className="space-y-3">
      {narratives.map((text, i) => {
        // Bold the prefix (text before the first colon)
        const colonIdx = text.indexOf(":**");
        const hasBold   = text.startsWith("**") && colonIdx > -1;
        const boldPart  = hasBold ? text.slice(2, colonIdx)    : null;
        const restPart  = hasBold ? text.slice(colonIdx + 3)   : text;

        return (
          <div key={i} className="flex gap-3 text-sm text-text-secondary leading-relaxed">
            <span className="text-accent-cyan mt-0.5 shrink-0 text-xs">›</span>
            <span>
              {boldPart && (
                <span className="font-semibold text-text-primary">{boldPart}: </span>
              )}
              {restPart}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Weekly Summary Card ──────────────────────────────────────────────────────

export function WeeklySummaryCard({ summary }: { summary: WeeklySummary }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-line/60 bg-bg-card/70 p-4 space-y-4">
      {/* Period + headline */}
      <div>
        <p className="text-[10px] uppercase text-text-muted tracking-wide mb-1">
          {summary.period}
        </p>
        <h4 className="text-sm font-bold text-text-primary leading-snug">{summary.headline}</h4>
      </div>

      {/* Narrative paragraph */}
      <p className="text-xs text-text-secondary leading-relaxed">{summary.narrative}</p>

      {/* Key events */}
      {summary.key_events.length > 0 && (
        <div>
          <p className="text-[10px] uppercase text-text-muted mb-2 tracking-wide">Key Events</p>
          <ul className="space-y-1">
            {summary.key_events.map((e, i) => (
              <li key={i} className="flex gap-2 text-xs text-text-secondary">
                <span className="text-accent-yellow shrink-0">›</span> {e}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Winners / Losers */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] uppercase text-text-muted mb-1.5 tracking-wide flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-accent-green" /> Winners
          </p>
          {summary.winners.map((w, i) => (
            <div key={i} className="text-xs text-accent-green font-mono">{w}</div>
          ))}
        </div>
        <div>
          <p className="text-[10px] uppercase text-text-muted mb-1.5 tracking-wide flex items-center gap-1">
            <TrendingDown className="w-3 h-3 text-accent-red" /> Losers
          </p>
          {summary.losers.map((l, i) => (
            <div key={i} className="text-xs text-accent-red font-mono">{l}</div>
          ))}
        </div>
      </div>

      {/* Outlook toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 text-[11px] text-accent-cyan hover:text-accent-cyan/80 transition-colors"
      >
        <BookOpen className="w-3 h-3" />
        {expanded ? "Hide outlook" : "Read week-ahead outlook"}
      </button>

      {expanded && (
        <div className="rounded-lg bg-bg-surface/60 border border-line/40 p-3">
          <p className="text-[10px] uppercase text-text-muted mb-1.5 tracking-wide">
            Week-Ahead Outlook
          </p>
          <p className="text-xs text-text-secondary leading-relaxed">{summary.outlook}</p>
        </div>
      )}
    </div>
  );
}
