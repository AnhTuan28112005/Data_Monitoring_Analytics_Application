import { ChartPanel } from "@/components/dashboard/ChartPanel";
import { GainersLosers } from "@/components/dashboard/GainersLosers";
import { MarketOverviewWidget } from "@/components/dashboard/MarketOverviewWidget";
import { MultiAssetPanel } from "@/components/dashboard/MultiAssetPanel";
import { PortfolioTracker } from "@/components/dashboard/PortfolioTracker";
import { SectorHeatmap } from "@/components/dashboard/SectorHeatmap";
import { DateRangePickerWrapper } from "@/components/dashboard/DateRangePickerWrapper";
import {
  CorrelationHeatmap,
  DominanceDonut,
  FearGreedGauge,
  PerformanceComparison,
  ReturnsDistribution,
  TopMarketCap,
  VolatilityRadar,
  VolumeByAssetClass,
} from "@/components/dashboard/ExtraCharts";

export default function DashboardPage() {
  return (
    <div className="space-y-4">
      {/* Date Range Picker */}
      <DateRangePickerWrapper />

      {/* Multi-asset sparkline cards */}
      <MultiAssetPanel />

      {/* 4 headline mini-charts (Market Sentiment · Allocation · Liquidity · Volatility) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FearGreedGauge />
        <DominanceDonut />
        <VolumeByAssetClass />
        <ReturnsDistribution />
      </div>

      {/* Main candlestick chart (Full Width) */}
      <ChartPanel />

      {/* Gainers / Losers (Full Width below chart) */}
      <GainersLosers />

      {/* Volatility Radar (Full Width) */}
      <VolatilityRadar />

      {/* Top-10 market cap + Correlation heatmap */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <TopMarketCap />
        <CorrelationHeatmap />
      </div>

    </div>
  );
}
