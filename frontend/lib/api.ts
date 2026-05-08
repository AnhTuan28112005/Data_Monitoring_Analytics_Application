import axios from "axios";
import type {
  Alert,
  AssetClass,
  CorrelationResponse,
  DailyInsight,
  HeatmapResponse,
  IndicatorResponse,
  IntradayResponse,
  MarketOverview,
  NewsItem,
  OHLCVResponse,
  PortfolioHolding,
  PortfolioResponse,
  PriceTick,
  GainerLoser,
} from "./types";

// Use Next.js rewrites so the browser hits same-origin /api and avoids CORS.
const http = axios.create({
  baseURL: "",
  timeout: 30000,
});

export const api = {
  // ---------- Market ----------
  prices: () => http.get<PriceTick[]>("/api/market/prices").then((r) => r.data),
  ohlcv: (asset_class: AssetClass, symbol: string, timeframe = "1h", limit = 200) =>
    http
      .get<OHLCVResponse>("/api/market/ohlcv", {
        params: { asset_class, symbol, timeframe, limit },
      })
      .then((r) => r.data),
  gainersLosers: (n = 5) =>
    http
      .get<{ gainers: GainerLoser[]; losers: GainerLoser[] }>(
        "/api/market/gainers-losers",
        { params: { n } }
      )
      .then((r) => r.data),
  overview: () => http.get<MarketOverview>("/api/market/overview").then((r) => r.data),
  heatmap: () => http.get<HeatmapResponse>("/api/market/heatmap").then((r) => r.data),
  multiAssetPanel: () =>
    http
      .get<
        Array<{
          asset_class: AssetClass;
          symbol: string;
          price: number;
          change_pct: number;
          spark: number[];
        }>
      >("/api/market/multi-asset-panel")
      .then((r) => r.data),

  // ---------- Alerts / News ----------
  recentAlerts: (n = 50) =>
    http.get<Alert[]>("/api/alerts/recent", { params: { n } }).then((r) => r.data),
  news: (limit = 30) =>
    http.get<NewsItem[]>("/api/news", { params: { limit } }).then((r) => r.data),

  // ---------- Insights ----------
  dailyInsight: () => http.get<DailyInsight>("/api/insights/daily").then((r) => r.data),
  rebuildInsight: () =>
    http.post<DailyInsight>("/api/insights/daily/rebuild").then((r) => r.data),

  // ---------- Analytics ----------
  indicators: (
    asset_class: AssetClass,
    symbol: string,
    timeframe: string,
    indicators: string[]
  ) =>
    http
      .post<IndicatorResponse>("/api/analytics/indicators", {
        asset_class,
        symbol,
        timeframe,
        indicators,
      })
      .then((r) => r.data),
  correlation: (pairs: string[], timeframe = "1d", limit = 90) =>
    http
      .get<CorrelationResponse>("/api/analytics/correlation", {
        params: { pairs, timeframe, limit },
        paramsSerializer: { indexes: null }, // pairs=a&pairs=b
      })
      .then((r) => r.data),
  intraday: (asset_class: AssetClass, symbol: string) =>
    http
      .get<IntradayResponse>("/api/analytics/intraday", {
        params: { asset_class, symbol },
      })
      .then((r) => r.data),

  // ---------- Portfolio ----------
  portfolioValue: (holdings: PortfolioHolding[]) =>
    http.post<PortfolioResponse>("/api/portfolio/value", holdings).then((r) => r.data),
};
