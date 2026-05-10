"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { ComparisonChart } from "@/components/charts/ComparisonChart";
import { DateRangePickerWrapper } from "@/components/dashboard/DateRangePickerWrapper";
import type { AssetClass } from "@/lib/types";

interface Asset {
  symbol: string;
  asset_class: AssetClass;
  label: string;
  color: string;
}

const AVAILABLE_ASSETS: Asset[] = [
  { symbol: "BTC/USDT", asset_class: "crypto", label: "Bitcoin (BTC)", color: "#f7931a" },
  { symbol: "ETH/USDT", asset_class: "crypto", label: "Ethereum (ETH)", color: "#627eea" },
  { symbol: "SOL/USDT", asset_class: "crypto", label: "Solana (SOL)", color: "#14f195" },
  { symbol: "BNB/USDT", asset_class: "crypto", label: "Binance (BNB)", color: "#f3ba2f" },
  { symbol: "XRP/USDT", asset_class: "crypto", label: "Ripple (XRP)", color: "#23292f" },
  { symbol: "^GSPC", asset_class: "index", label: "S&P 500", color: "#22d3ee" },
  { symbol: "^IXIC", asset_class: "index", label: "NASDAQ", color: "#10b981" },
  { symbol: "^DJI", asset_class: "index", label: "Dow Jones", color: "#8b5cf6" },
  { symbol: "GC=F", asset_class: "gold", label: "Gold", color: "#facc15" },
  { symbol: "SI=F", asset_class: "silver", label: "Silver", color: "#d1d5db" },
  { symbol: "EURUSD=X", asset_class: "forex", label: "EUR/USD", color: "#a855f7" },
  { symbol: "GBPUSD=X", asset_class: "forex", label: "GBP/USD", color: "#ec4899" },
];

export default function ComparisonPage() {
  const [selected, setSelected] = useState<Asset[]>([]);
  const [tf, setTf] = useState("1d");

  const toggleAsset = (asset: Asset) => {
    setSelected((prev) => {
      const exists = prev.some((a) => a.symbol === asset.symbol);
      if (exists) {
        return prev.filter((a) => a.symbol !== asset.symbol);
      } else if (prev.length < 5) {
        return [...prev, asset];
      }
      return prev;
    });
  };

  return (
    <div className="space-y-4">
      {/* Date Range Picker */}
      <DateRangePickerWrapper />

      {/* Asset Selector */}
      <Card title="Select Assets to Compare (2-5)">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5 md:gap-2 mb-4">
          {AVAILABLE_ASSETS.map((asset) => (
            <button
              key={`${asset.asset_class}:${asset.symbol}`}
              onClick={() => toggleAsset(asset)}
              className={`px-2 md:px-3 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
                selected.some((a) => a.symbol === asset.symbol)
                  ? "bg-accent-cyan text-bg-base"
                  : "bg-bg-elev border border-line/40 text-text-primary hover:border-line/60"
              } ${selected.length >= 5 && !selected.some((a) => a.symbol === asset.symbol) ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={selected.length >= 5 && !selected.some((a) => a.symbol === asset.symbol)}
            >
              {asset.label}
            </button>
          ))}
        </div>

        {/* Selected Assets */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-line/40">
            {selected.map((asset) => (
              <div
                key={`${asset.asset_class}:${asset.symbol}`}
                className="flex items-center gap-2 bg-bg-elev border border-line/60 rounded-lg px-3 py-1.5"
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: asset.color }}
                />
                <span className="text-sm">{asset.label}</span>
                <button
                  onClick={() =>
                    setSelected((prev) =>
                      prev.filter((a) => a.symbol !== asset.symbol)
                    )
                  }
                  className="text-text-secondary hover:text-text-primary ml-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Chart */}
      <Card title={`Performance Comparison${selected.length > 0 ? ` (${selected.length} assets)` : ""}`}>
        <div className="mb-3 flex items-center gap-1 md:gap-2">
          {["1h", "4h", "1d", "1w"].map((t) => (
            <button
              key={t}
              onClick={() => setTf(t)}
              className={`px-2 md:px-3 py-1 text-xs rounded-md uppercase transition-colors flex-1 md:flex-none ${
                tf === t
                  ? "bg-accent-cyan text-bg-base font-semibold"
                  : "bg-bg-elev border border-line/60 text-text-secondary hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <ComparisonChart assets={selected} timeframe={tf} />
      </Card>

      {/* Info */}
      <Card>
        <div className="text-sm text-text-secondary space-y-2">
          <p>
            <strong>How it works:</strong> Select 2-5 assets above, then view their normalized performance
            on the same chart. All prices are indexed to 100 at the start of the selected date range.
          </p>
          <p>
            <strong>Tips:</strong> Compare different asset classes (crypto, stocks, gold, forex) to identify
            correlations or divergences.
          </p>
        </div>
      </Card>
    </div>
  );
}
