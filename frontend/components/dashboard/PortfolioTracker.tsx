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

      {resp && holdings.length > 0 && (
        <div className="mt-4 p-3 bg-bg-card/50 border border-line/40 rounded-lg text-sm text-text-secondary">
          <p className="text-xs uppercase tracking-widest text-text-muted mb-2">Portfolio Summary</p>
          <p className="leading-relaxed border-b border-line/20 pb-3 mb-3">
            Your portfolio holds <span className="text-text-primary font-semibold">{holdings.length}</span> position{holdings.length !== 1 ? "s" : ""} with total value of <span className="text-text-primary font-semibold">${fmtPrice(resp.total_value)}</span>. Unrealized {resp.total_pnl_abs >= 0 ? "gain" : "loss"} is <span className={colorByChange(resp.total_pnl_abs)}>${fmtPrice(Math.abs(resp.total_pnl_abs))} ({fmtPct(resp.total_pnl_pct)})</span> against cost basis of <span className="text-text-primary font-semibold">${fmtPrice(resp.total_cost)}</span>.
          </p>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-accent-cyan font-bold uppercase text-[10px] tracking-widest">Strategy & Intelligence</span>
            </div>
            <p className="text-[13px] text-text-primary leading-relaxed">
              {(() => {
                if (!resp.holdings || resp.holdings.length === 0) return "No data available for analysis.";

                const items = resp.holdings
                  .map((h, i) => ({ ...h, symbol: holdings[i]?.symbol || "Unknown", class: holdings[i]?.asset_class || "unknown" }))
                  .sort((a, b) => b.pnl_pct - a.pnl_pct);
                
                const best = items[0];
                const worst = items[items.length - 1];
                
                const classTotals: Record<string, number> = {};
                items.forEach(it => {
                  if (it.class) {
                    classTotals[it.class] = (classTotals[it.class] || 0) + it.market_value;
                  }
                });

                const sortedClasses = Object.entries(classTotals).sort((a, b) => b[1] - a[1]);
                const topClass = sortedClasses[0];
                const concentration = resp.total_value > 0 && topClass ? (topClass[1] / resp.total_value) * 100 : 0;

                let insight = "";
                if (concentration > 60 && topClass) {
                  insight += `High ${topClass[0].toUpperCase()} concentration detected (${concentration.toFixed(1)}%). Consider diversifying to reduce systemic risk. `;
                }

                if (best && best.pnl_pct > 10) {
                  insight += `${best.symbol} is current performance leader (+${best.pnl_pct.toFixed(1)}%). Protect gains as the trend matures. `;
                }

                if (worst && worst.pnl_pct < -15) {
                  insight += `${worst.symbol} is significantly lagging (${worst.pnl_pct.toFixed(1)}% loss). Evaluate if the thesis remains intact. `;
                }

                if (resp.total_pnl_pct < -5) {
                  insight += "Defensive stance recommended. Focus on capital preservation and avoid increasing exposure to losing trends.";
                } else if (resp.total_pnl_pct > 5) {
                  insight += "Overall portfolio health is strong. Maintain disciplined position sizing while riding the positive momentum.";
                } else {
                  insight += "Portfolio is in a neutral consolidation phase. Monitor for the next major trend breakout to adjust exposure.";
                }

                return insight;
              })()}
            </p>
          </div>
        </div>
      )}
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
