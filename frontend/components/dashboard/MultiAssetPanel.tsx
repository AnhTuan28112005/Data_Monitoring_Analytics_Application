"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { useDateRangeStore } from "@/lib/stores/dateRangeStore";
import { Card } from "@/components/ui/Card";
import { Sparkline } from "@/components/ui/Sparkline";
import { fmtPct, fmtPrice, colorByChange } from "@/lib/utils";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import type { AssetClass } from "@/lib/types";

interface Item {
  asset_class: AssetClass;
  symbol: string;
  price: number;
  change_pct: number;
  spark: number[];
}

const LABELS: Record<string, string> = {
  "BTC/USDT": "BTC",
  "^GSPC": "S&P 500",
  "EURUSD=X": "EUR/USD",
  "GC=F": "Gold",
  "SI=F": "Silver",
};

export function MultiAssetPanel() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const dateRange = useDateRangeStore((s) => s.dateRange);

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        const startDate = format(dateRange.startDate, "yyyy-MM-dd");
        const endDate = format(dateRange.endDate, "yyyy-MM-dd");
        const symbols: [AssetClass, string][] = [
          ["crypto", "BTC/USDT"],
          ["index", "^GSPC"],
          ["forex", "EURUSD=X"],
          ["gold", "GC=F"],
          ["silver", "SI=F"],
        ];
        const results = await Promise.all(
          symbols.map(async ([ac, sym]) => {
            try {
              const ohlcv = await api.ohlcv(ac, sym, "1d", 200, startDate, endDate);
              const prices = ohlcv.candles.map((c) => c.close);
              const current = prices[prices.length - 1];
              const prev = prices[0];
              const change_pct = prev > 0 ? ((current - prev) / prev) * 100 : 0;
              return {
                asset_class: ac as AssetClass,
                symbol: sym,
                price: current,
                change_pct,
                spark: prices,
              };
            } catch {
              return null;
            }
          })
        );
        setItems(results.filter((x): x is Item => x !== null));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load multi-asset data");
        setItems([]);
      }
    };
    load();
  }, [dateRange]);

  return (
    <Card title="Multi-Asset Panel">
      {error && <ErrorMessage message={error} onRetry={() => setError(null)} title="Multi-asset loading error" />}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {items.map((it) => (
          <div key={`${it.asset_class}:${it.symbol}`} className="bg-bg-elev/60 border border-line/40 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium">{LABELS[it.symbol] ?? it.symbol}</div>
              <div className={`text-[11px] num-tabular ${colorByChange(it.change_pct)}`}>{fmtPct(it.change_pct)}</div>
            </div>
            <div className="text-base font-semibold num-tabular mt-0.5">{fmtPrice(it.price)}</div>
            <div className="mt-1">
              <Sparkline data={it.spark} positive={it.change_pct >= 0} height={36} />
            </div>
          </div>
        ))}
        {items.length === 0 && !error && (
          <div className="col-span-full text-sm text-text-muted">Loading multi-asset…</div>
        )}
      </div>
      {items.length > 0 && (
        <div className="mt-4 p-3 bg-bg-card/50 border border-line/40 rounded-lg text-sm text-text-secondary">
          <p className="text-xs uppercase tracking-widest text-text-muted mb-2">💡 Portfolio Summary</p>
          <p className="leading-relaxed">
            Monitoring {items.length} key assets in your portfolio. Current total portfolio value:{" "}
            <span className="text-text-primary font-semibold">
              {items.reduce((sum, item) => sum + item.price, 0).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            . Best performing asset:{" "}
            <span className="text-accent-green">
              {items.reduce((best, item) => (item.change_pct > best.change_pct ? item : best)).symbol} (
              {fmtPct(Math.max(...items.map((i) => i.change_pct)))})
            </span>
            .
          </p>
        </div>
      )}
    </Card>
  );
}
