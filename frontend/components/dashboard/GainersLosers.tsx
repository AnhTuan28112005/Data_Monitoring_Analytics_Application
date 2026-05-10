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
      <Card title="Top Gainers" action={<TrendingUp className="w-4 h-4 text-accent-green" />}>
        <List items={g} type="gainers" />
      </Card>
      <Card title="Top Losers" action={<TrendingDown className="w-4 h-4 text-accent-red" />}>
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
  const description = type === "gainers"
    ? `Top performer ${topAsset.symbol} leads the market with +${fmtPct(topAsset.change_pct)} gain today.`
    : `${topAsset.symbol} is the biggest loser today with ${fmtPct(topAsset.change_pct)} decline.`;

  return (
    <>
      <ul className="divide-y divide-line/40">
        {items.map((x, i) => (
          <li key={x.symbol + i} className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs text-text-muted w-5 text-right">{i + 1}</span>
              <div className="truncate">
                <div className="text-sm font-medium truncate">{x.symbol}</div>
                <div className="text-[10px] uppercase tracking-wider text-text-muted">{x.asset_class}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm num-tabular">{fmtPrice(x.price)}</div>
              <div className={`text-xs num-tabular ${colorByChange(x.change_pct)}`}>{fmtPct(x.change_pct)}</div>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 p-2 bg-bg-card/50 border border-line/40 rounded text-xs text-text-secondary">
        <p className="text-[10px] uppercase text-text-muted mb-1">📊 Summary</p>
        <p>{description}</p>
      </div>
    </>
  );
}
