"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { MarketOverview } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { fmtNumber, fmtPct, colorByChange } from "@/lib/utils";
import { DollarSign, Globe, Layers } from "lucide-react";

export function MarketOverviewWidget() {
  const [data, setData] = useState<MarketOverview | null>(null);

  useEffect(() => {
    const load = () => api.overview().then(setData).catch(() => {});
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <Card title="Market Overview">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat
          label="Total Market Cap"
          value={data ? "$" + fmtNumber(data.total_market_cap) : "—"}
          icon={<Globe className="w-4 h-4" />}
        />
        <Stat
          label="24h Volume"
          value={data ? "$" + fmtNumber(data.total_volume_24h) : "—"}
          icon={<DollarSign className="w-4 h-4" />}
        />
        <Stat
          label="BTC Dominance"
          value={data ? fmtPct(data.btc_dominance, 1) : "—"}
          accent={colorByChange(data?.btc_dominance ?? 0)}
          icon={<Layers className="w-4 h-4" />}
        />
        <Stat
          label="ETH Dominance"
          value={data ? fmtPct(data.eth_dominance, 1) : "—"}
          accent={colorByChange(data?.eth_dominance ?? 0)}
          icon={<Layers className="w-4 h-4" />}
        />
      </div>
      {data && (
        <div className="mt-4 p-3 bg-bg-card/50 border border-line/40 rounded-lg text-sm text-text-secondary">
          <p className="text-xs uppercase tracking-widest text-text-muted mb-2">Market Summary</p>
          <p className="leading-relaxed">
            Total cryptocurrency market cap stands at <span className="text-text-primary font-semibold">${fmtNumber(data.total_market_cap)}</span> with <span className="text-text-primary font-semibold">${fmtNumber(data.total_volume_24h)}</span> in 24h trading volume. Bitcoin and Ethereum dominance at {fmtPct(data.btc_dominance, 1)} and {fmtPct(data.eth_dominance, 1)} respectively indicate {(data.btc_dominance > 50 ? "strong" : "weak")} Bitcoin leadership.
          </p>
        </div>
      )}
    </Card>
  );
}

function Stat({
  label, value, accent, icon,
}: { label: string; value: string; accent?: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-bg-elev/60 border border-line/40 rounded-xl p-3">
      <div className="flex items-center gap-2 text-text-secondary text-xs">
        {icon} {label}
      </div>
      <div className={`mt-1 text-lg font-semibold num-tabular ${accent || "text-text-primary"}`}>
        {value}
      </div>
    </div>
  );
}
