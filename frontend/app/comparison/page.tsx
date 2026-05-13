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
  { symbol: "BTC/USDT", asset_class: "crypto", label: "Bitcoin (BTC)", color: "#f59e0b" },  // Amber/Orange
  { symbol: "ETH/USDT", asset_class: "crypto", label: "Ethereum (ETH)", color: "#3b82f6" },  // Deep Blue
  { symbol: "SOL/USDT", asset_class: "crypto", label: "Solana (SOL)", color: "#14f195" },   // Neon Green
  { symbol: "BNB/USDT", asset_class: "crypto", label: "Binance (BNB)", color: "#facc15" },   // Bright Yellow
  { symbol: "XRP/USDT", asset_class: "crypto", label: "Ripple (XRP)", color: "#a855f7" },    // Electric Purple
  { symbol: "^GSPC", asset_class: "index", label: "S&P 500", color: "#22d3ee" },            // Cyan
  { symbol: "^IXIC", asset_class: "index", label: "NASDAQ", color: "#ec4899" },             // Hot Pink
  { symbol: "^DJI", asset_class: "index", label: "Dow Jones", color: "#f43f5e" },           // Rose Red
  { symbol: "GC=F", asset_class: "gold", label: "Gold", color: "#d97706" },                // Deep Gold
  { symbol: "SI=F", asset_class: "silver", label: "Silver", color: "#ffffff" },              // Pure White
  { symbol: "EURUSD=X", asset_class: "forex", label: "EUR/USD", color: "#2dd4bf" },         // Teal
  { symbol: "GBPUSD=X", asset_class: "forex", label: "GBP/USD", color: "#fb923c" },         // Peach
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
      <DateRangePickerWrapper hideCustom={true} />

      {/* Asset Selector */}
      <Card title="Select Assets to Compare (2-5)" centerTitle>
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
      <Card title="Multi-Asset Comparative Performance Index" centerTitle>
        <ComparisonChart assets={selected} timeframe={tf} />
      </Card>

      {/* Info */}
      <Card title="User Guide & Methodology" centerTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[13px] leading-relaxed">
          <div className="space-y-2">
            <p className="text-text-primary font-bold uppercase text-[10px] tracking-widest text-accent-cyan">How to use Date Range</p>
            <p className="text-text-secondary">
              Use the global <strong>Date Range</strong> picker at the top to control the observation window. 
              Selecting <strong>1M</strong> shows the last 30 days of performance, while <strong>1Y</strong> 
              provides a full year of historical context. All assets are automatically aligned to start at the 
              same timestamp within your selected range.
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-text-primary font-bold uppercase text-[10px] tracking-widest text-accent-cyan">Understanding Base = 100</p>
            <p className="text-text-secondary">
              To compare assets with vastly different prices (e.g., Bitcoin at $60k vs S&P 500 at $5k), 
              we use <strong>Normalization</strong>. All assets are set to a value of <strong>100</strong> at the start of the chart. 
              If an asset's line is at 110, it means it has gained <strong>10%</strong> since the start of your selected period.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
