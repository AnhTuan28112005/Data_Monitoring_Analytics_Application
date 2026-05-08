"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Sparkline } from "@/components/ui/Sparkline";
import { fmtPct, fmtPrice, colorByChange } from "@/lib/utils";
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

  useEffect(() => {
    const load = () => api.multiAssetPanel().then(setItems).catch(() => {});
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <Card title="Multi-Asset Panel">
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
        {items.length === 0 && (
          <div className="col-span-full text-sm text-text-muted">Loading multi-asset…</div>
        )}
      </div>
    </Card>
  );
}
