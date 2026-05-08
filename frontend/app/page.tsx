import { ChartPanel } from "@/components/dashboard/ChartPanel";
import { GainersLosers } from "@/components/dashboard/GainersLosers";
import { MarketOverviewWidget } from "@/components/dashboard/MarketOverviewWidget";
import { MultiAssetPanel } from "@/components/dashboard/MultiAssetPanel";
import { PortfolioTracker } from "@/components/dashboard/PortfolioTracker";
import { SectorHeatmap } from "@/components/dashboard/SectorHeatmap";
import {
  BtcActivityHeatmap,
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
      {/* KPI strip */}
      <MarketOverviewWidget />

      {/* Multi-asset sparkline cards */}
      <MultiAssetPanel />

      {/* 4 headline mini-charts (Fear&Greed · Dominance · Volume · Returns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <FearGreedGauge />
        <DominanceDonut />
        <VolumeByAssetClass />
        <ReturnsDistribution />
      </div>

      {/* Main candlestick + gainers / losers */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <ChartPanel />
        </div>
        <div>
          <GainersLosers />
        </div>
      </div>

      {/* Cross-asset performance + volatility radar */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <PerformanceComparison />
        </div>
        <div>
          <VolatilityRadar />
        </div>
      </div>

      {/* Top-10 market cap + BTC hourly heatmap */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <TopMarketCap />
        <BtcActivityHeatmap />
      </div>

      {/* Sector treemap full-width */}
      <SectorHeatmap />

      {/* Portfolio */}
      <PortfolioTracker />
    </div>
  );
}
