"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import type { GainerLoser } from "@/lib/types";
import { fmtPct, fmtPrice, colorByChange } from "@/lib/utils";
import { TrendingDown, TrendingUp } from "lucide-react";

export function GainersLosers() {
  const [g, setG] = useState<GainerLoser[]>([]);
  const [l, setL] = useState<GainerLoser[]>([]);

  useEffect(() => {
    const load = () =>
      api
        .gainersLosers(5)
        .then((d) => {
          setG(d.gainers);
          setL(d.losers);
        })
        .catch(() => {});
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card title="Top Gainers" action={<TrendingUp className="w-4 h-4 text-accent-green" />} centerTitle>
        <List items={g} type="gainers" />
      </Card>
      <Card title="Top Losers" action={<TrendingDown className="w-4 h-4 text-accent-red" />} centerTitle>
        <List items={l} type="losers" />
      </Card>
    </div>
  );
}

function List({ items, type }: { items: GainerLoser[]; type: "gainers" | "losers" }) {
  if (!items.length) {
    return <div className="text-sm text-text-muted">Loading…</div>;
  }
  const topAsset = items[0];
  const description = type === "gainers" ? (
    <>
      <span className="font-bold text-text-primary">{topAsset.symbol}</span> exhibits strong bullish momentum, leading the market with a <span className="font-bold text-accent-green">+{fmtPct(topAsset.change_pct)}</span> appreciation.
    </>
  ) : (
    <>
      <span className="font-bold text-text-primary">{topAsset.symbol}</span> reflects the sharpest session contraction, declining by <span className="font-bold text-accent-red">{fmtPct(topAsset.change_pct)}</span> relative to opening levels.
    </>
  );

  return (
    <>
      <ul className="divide-y divide-line/40">
        {items.map((x, i) => (
          <li key={x.symbol + i} className="grid grid-cols-[32px_1fr_120px] items-center py-3 gap-4">
            <span className="text-xs text-text-muted font-bold">{i + 1}</span>
            <div className="min-w-0">
              <div className="text-[15px] font-extrabold text-text-primary tracking-tight">
                {x.symbol}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-text-muted mt-0.5">
                {x.asset_class}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-text-primary num-tabular">
                {fmtPrice(x.price)}
              </div>
              <div className={`text-xs font-black num-tabular ${colorByChange(x.change_pct)}`}>
                {x.change_pct > 0 ? "+" : ""}{fmtPct(x.change_pct)}
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 p-2 bg-bg-card/50 border border-line/40 rounded text-xs text-text-secondary min-h-[70px] flex flex-col justify-center">
        <p className="text-[10px] uppercase text-text-muted mb-1">Insights</p>
        <p className="leading-relaxed">{description}</p>
      </div>
    </>
  );
}
