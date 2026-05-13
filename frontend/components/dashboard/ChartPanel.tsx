"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { format } from "date-fns";
import { Card } from "@/components/ui/Card";
import { CandlestickChart } from "@/components/charts/CandlestickChart";
import { ChartDescription } from "@/components/charts/ChartDescription";
import { api } from "@/lib/api";
import type { AssetClass, Candle } from "@/lib/types";
import { useMarketStore } from "@/lib/stores/marketStore";
import { useDateRangeStore } from "@/lib/stores/dateRangeStore";
import { FlashNumber } from "@/components/ui/FlashNumber";
import { fmtPct, colorByChange, cls } from "@/lib/utils";
import { useAlertStore } from "@/lib/stores/alertStore";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { SkeletonChart } from "@/components/ui/Skeleton";

interface AssetOption {
  label: string;
  symbol: string;
  asset_class: AssetClass;
}

const ASSETS: AssetOption[] = [
  { label: "BTC/USDT", symbol: "BTC/USDT", asset_class: "crypto" },
  { label: "ETH/USDT", symbol: "ETH/USDT", asset_class: "crypto" },
  { label: "SOL/USDT", symbol: "SOL/USDT", asset_class: "crypto" },
  { label: "S&P 500", symbol: "^GSPC", asset_class: "index" },
  { label: "NASDAQ", symbol: "^IXIC", asset_class: "index" },
  { label: "Gold", symbol: "GC=F", asset_class: "gold" },
  { label: "Silver", symbol: "SI=F", asset_class: "silver" },
  { label: "EUR/USD", symbol: "EURUSD=X", asset_class: "forex" },
];

const TIMEFRAMES = ["5m", "15m", "1h", "4h", "1d"];

export function ChartPanel() {
  const [asset, setAsset] = useState<AssetOption>(ASSETS[0]);
  const [tf, setTf] = useState("1h");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateRange = useDateRangeStore((s) => s.dateRange);

  const tick = useMarketStore((s) => s.ticks[`${asset.asset_class}:${asset.symbol}`]);
  const dir = useMarketStore((s) => s.lastDir[`${asset.asset_class}:${asset.symbol}`]);

  const allAlerts = useAlertStore((s) => s.items);
  const patternMarkers = useMemo(() => {
    return allAlerts
      .filter(
        (a) =>
          a.symbol === asset.symbol &&
          ["fomo", "whale", "divergence", "price_spike", "price_drop"].includes(a.type)
      )
      .map((a) => ({
        time: Math.floor(new Date(a.timestamp).getTime() / 1000),
        type: a.type,
        message: a.message,
      }))
      .slice(0, 12);
  }, [allAlerts, asset.symbol]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    const startDate = dateRange ? format(dateRange.startDate, "yyyy-MM-dd") : undefined;
    const endDate = dateRange ? format(dateRange.endDate, "yyyy-MM-dd") : undefined;
    api
      .ohlcv(asset.asset_class, asset.symbol, tf, 200, startDate, endDate)
      .then((r) => {
        if (alive) {
          setCandles(r.candles);
          setError(null);
        }
      })
      .catch((err) => {
        if (alive) {
          setCandles([]);
          setError(err.message || "Failed to load chart data");
        }
      })
      .finally(() => alive && setLoading(false));
    const id = setInterval(() => {
      api
        .ohlcv(asset.asset_class, asset.symbol, tf, 200, startDate, endDate)
        .then((r) => alive && setCandles(r.candles))
        .catch(() => {});
    }, 20_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [asset, tf, dateRange]);

  return (
    <Card
      title="Advanced Market Dynamics"
      centerTitle
      action={
        <div className="flex items-center gap-3">
          {tick && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-accent-cyan bg-accent-cyan/10 px-2 py-0.5 rounded">
                {asset.label} · {tf.toUpperCase()}
              </span>
              <FlashNumber
                value={tick.price}
                className="text-base font-semibold text-text-primary ml-1"
              />
              <span className={cls("text-xs num-tabular", colorByChange(tick.change_24h_pct))}>
                {fmtPct(tick.change_24h_pct)}
              </span>
              {dir && (
                <span
                  className={cls(
                    "w-2 h-2 rounded-full",
                    dir === "up" ? "bg-accent-green" : "bg-accent-red",
                    "animate-pulse_dot"
                  )}
                />
              )}
            </div>
          )}
        </div>
      }
    >
      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-3">
        <select
          value={`${asset.asset_class}:${asset.symbol}`}
          onChange={(e) => {
            const [ac, sym] = e.target.value.split(":");
            const found = ASSETS.find((a) => a.asset_class === ac && a.symbol === sym);
            if (found) setAsset(found);
          }}
          className="bg-bg-elev border border-line/60 rounded-lg px-2 py-1.5 text-sm w-full md:w-auto"
        >
          {ASSETS.map((a) => (
            <option key={`${a.asset_class}:${a.symbol}`} value={`${a.asset_class}:${a.symbol}`}>
              {a.label}
            </option>
          ))}
        </select>
        <div className="flex flex-col gap-1">
          <p className="text-[10px] text-text-muted font-medium uppercase tracking-tighter">Candle Resolution</p>
          <div className="flex items-center gap-1 bg-bg-elev border border-line/60 rounded-lg p-1 flex-wrap">
            {TIMEFRAMES.map((t) => (
              <button
                key={t}
                onClick={() => setTf(t)}
                className={cls(
                  "px-1.5 md:px-2 py-1 text-xs rounded-md uppercase transition-colors flex-1 md:flex-none min-w-0",
                  tf === t ? "bg-accent-cyan text-bg-base font-semibold" : "text-text-secondary hover:text-white"
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <p className="text-[9px] text-text-muted italic">Displays the last 200 candles for the selected interval.</p>
        </div>
        {loading && <span className="text-xs text-text-muted">loading…</span>}
      </div>
      {error && <ErrorMessage message={error} onRetry={() => setError(null)} />}
      <div className="mb-8 pr-10">
        {loading && !candles.length ? <SkeletonChart /> : <CandlestickChart candles={candles} patterns={patternMarkers} height={420} />}
      </div>
      <ChartDescription title={asset.label} candles={candles} symbol={asset.symbol} timeframe={tf} />
      <PatternBadges asset={asset} />
    </Card>
  );
}

function PatternBadges({ asset }: { asset: AssetOption }) {
  const alerts = useAlertStore((s) => s.items).filter(
    (a) =>
      a.symbol === asset.symbol &&
      ["fomo", "divergence", "whale"].includes(a.type)
  ).slice(0, 5);
  if (alerts.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {alerts.map((a) => (
        <span
          key={a.id}
          className={cls(
            "text-[11px] px-2 py-1 rounded-md border",
            a.type === "fomo" && "bg-accent-yellow/10 text-accent-yellow border-accent-yellow/30",
            a.type === "whale" && "bg-accent-purple/10 text-accent-purple border-accent-purple/30",
            a.type === "divergence" && "bg-accent-cyan/10 text-accent-cyan border-accent-cyan/30"
          )}
          title={a.message}
        >
          {a.type.toUpperCase()} · {a.message.length > 60 ? a.message.slice(0, 60) + "…" : a.message}
        </span>
      ))}
    </div>
  );
}
