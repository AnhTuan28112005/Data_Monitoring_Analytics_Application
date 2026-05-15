// Shared TypeScript types mirroring backend schemas.
export type AssetClass = "crypto" | "stock" | "index" | "gold" | "silver" | "forex";

export interface PriceTick {
  symbol: string;
  asset_class: AssetClass;
  price: number;
  change_24h_pct: number;
  change_24h_abs: number;
  volume_24h: number;
  market_cap?: number | null;
  high_24h?: number | null;
  low_24h?: number | null;
  timestamp: string;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OHLCVResponse {
  symbol: string;
  asset_class: AssetClass;
  timeframe: string;
  candles: Candle[];
}

export interface GainerLoser {
  symbol: string;
  asset_class: AssetClass;
  price: number;
  change_pct: number;
  volume: number;
}

export interface MarketOverview {
  total_market_cap: number;
  btc_dominance: number;
  eth_dominance: number;
  total_volume_24h: number;
  fear_greed?: number | null;
  timestamp: string;
}

export interface SectorCell {
  sector: string;
  symbol: string;
  change_pct: number;
  market_cap?: number | null;
  price: number;
}

export interface HeatmapResponse {
  cells: SectorCell[];
  timestamp: string;
}

export interface Alert {
  id: string;
  type: "price_spike" | "price_drop" | "whale" | "fomo" | "divergence" | "news";
  severity: "info" | "warning" | "critical";
  symbol?: string | null;
  asset_class?: AssetClass | null;
  message: string;
  detail: Record<string, any>;
  timestamp: string;
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  published_at: string;
  summary?: string | null;
  category?: string | null;
}

export interface PortfolioHolding {
  symbol: string;
  asset_class: AssetClass;
  quantity: number;
  cost_basis: number;
}

export interface PortfolioPnL {
  symbol: string;
  asset_class: AssetClass;
  quantity: number;
  price: number;
  market_value: number;
  cost_basis: number;
  pnl_abs: number;
  pnl_pct: number;
}

export interface PortfolioResponse {
  total_value: number;
  total_cost: number;
  total_pnl_abs: number;
  total_pnl_pct: number;
  holdings: PortfolioPnL[];
  timestamp: string;
}

export interface IndicatorSeries {
  name: string;
  values: (number | null)[];
}

export interface IndicatorResponse {
  symbol: string;
  timeframe: string;
  times: number[];
  series: IndicatorSeries[];
}

export interface CorrelationResponse {
  symbols: string[];
  matrix: number[][];
  timestamp: string;
}

export interface IntradayPoint {
  time: number;
  price: number;
  volume: number;
  event?: "pump" | "dump" | null;
}

export interface IntradayResponse {
  symbol: string;
  points: IntradayPoint[];
}

export interface TimezoneSession {
  session: "asia" | "europe" | "us";
  avg_volume: number;
  avg_volatility_pct: number;
  net_change_pct: number;
}

export interface DailyInsight {
  date: string;
  market_state: "bullish" | "bearish" | "sideway";
  summary: string;
  anomalies: Array<Record<string, any>>;
  sessions: TimezoneSession[];
  insights: string[];
  top_gainers: GainerLoser[];
  top_losers: GainerLoser[];
  timestamp: string;
}

// ─── Forecast ────────────────────────────────────────────────────────────────

export interface ForecastPoint {
  datetime: string;
  time_timestamp: number;    // Unix seconds
  predicted_close: number;
  lower_bound: number;
  upper_bound: number;
}

export interface ForecastResponse {
  success: boolean;
  symbol: string;
  timeframe: string;
  data: ForecastPoint[];
}
