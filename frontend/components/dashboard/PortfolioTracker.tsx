"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { useMarketStore } from "@/lib/stores/marketStore";
import { usePortfolioStore } from "@/lib/stores/portfolioStore";
import type { AssetClass, PortfolioResponse } from "@/lib/types";
import { fmtPct, fmtPrice, colorByChange } from "@/lib/utils";
import { Plus, RotateCcw, Trash2 } from "lucide-react";

const ASSET_CLASSES: AssetClass[] = ["crypto", "stock", "index", "gold", "silver", "forex"];

export function PortfolioTracker() {
  const { holdings, add, update, remove, reset } = usePortfolioStore();
  const ticks = useMarketStore((s) => s.ticks);
  const [resp, setResp] = useState<PortfolioResponse | null>(null);

  // Recompute PnL whenever holdings or live prices change.
  useEffect(() => {
    let alive = true;
    api
      .portfolioValue(holdings)
      .then((r) => alive && setResp(r))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [holdings, ticks]);

  return (
    <Card
      title="Portfolio Tracking"
      action={
        <div className="flex items-center gap-2">
          <button
            onClick={() => add({ symbol: "BTC/USDT", asset_class: "crypto", quantity: 0, cost_basis: 0 })}
            className="text-xs px-2 py-1 rounded-md bg-accent-cyan/15 text-accent-cyan hover:bg-accent-cyan/25 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
          <button
            onClick={reset}
            className="text-xs px-2 py-1 rounded-md text-text-muted hover:text-white flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>
      }
    >
      {resp && (
        <div className="grid grid-cols-3 gap-3 mb-3">
          <Box label="Total Value" value={"$" + fmtPrice(resp.total_value)} />
          <Box label="Total Cost" value={"$" + fmtPrice(resp.total_cost)} />
          <Box
            label="Unrealized PnL"
            value={`$${fmtPrice(resp.total_pnl_abs)} (${fmtPct(resp.total_pnl_pct)})`}
            accent={colorByChange(resp.total_pnl_abs)}
          />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-text-muted">
              <th className="text-left py-1 pr-2">Symbol</th>
              <th className="text-left py-1 pr-2">Class</th>
              <th className="text-right py-1 pr-2">Qty</th>
              <th className="text-right py-1 pr-2">Cost Basis</th>
              <th className="text-right py-1 pr-2">Price</th>
              <th className="text-right py-1 pr-2">PnL</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((h, i) => {
              const row = resp?.holdings[i];
              return (
                <tr key={i} className="border-t border-line/40">
                  <td className="py-1 pr-2">
                    <input
                      value={h.symbol}
                      onChange={(e) => update(i, { symbol: e.target.value.toUpperCase() })}
                      className="bg-bg-elev/60 border border-line/40 rounded px-1.5 py-1 w-28 text-sm"
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <select
                      value={h.asset_class}
                      onChange={(e) => update(i, { asset_class: e.target.value as AssetClass })}
                      className="bg-bg-elev/60 border border-line/40 rounded px-1.5 py-1 text-sm"
                    >
                      {ASSET_CLASSES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1 pr-2 text-right">
                    <input
                      type="number"
                      step="any"
                      value={h.quantity}
                      onChange={(e) => update(i, { quantity: Number(e.target.value) })}
                      className="bg-bg-elev/60 border border-line/40 rounded px-1.5 py-1 w-20 text-sm text-right"
                    />
                  </td>
                  <td className="py-1 pr-2 text-right">
                    <input
                      type="number"
                      step="any"
                      value={h.cost_basis}
                      onChange={(e) => update(i, { cost_basis: Number(e.target.value) })}
                      className="bg-bg-elev/60 border border-line/40 rounded px-1.5 py-1 w-24 text-sm text-right"
                    />
                  </td>
                  <td className="py-1 pr-2 text-right num-tabular">
                    {row ? fmtPrice(row.price) : "—"}
                  </td>
                  <td className={`py-1 pr-2 text-right num-tabular ${colorByChange(row?.pnl_abs ?? 0)}`}>
                    {row ? `${fmtPrice(row.pnl_abs)} (${fmtPct(row.pnl_pct)})` : "—"}
                  </td>
                  <td className="py-1 text-right">
                    <button
                      onClick={() => remove(i)}
                      className="text-text-muted hover:text-accent-red p-1"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Box({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="bg-bg-elev/60 border border-line/40 rounded-xl p-3">
      <div className="text-[10px] uppercase tracking-widest text-text-muted">{label}</div>
      <div className={`mt-0.5 text-base font-semibold num-tabular ${accent || "text-text-primary"}`}>{value}</div>
    </div>
  );
}
