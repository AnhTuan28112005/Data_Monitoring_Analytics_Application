"""Pydantic schemas for API responses."""
from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


AssetClass = Literal["crypto", "stock", "gold", "silver", "forex", "index"]


class PriceTick(BaseModel):
    symbol: str
    asset_class: AssetClass
    price: float
    change_24h_pct: float = 0.0
    change_24h_abs: float = 0.0
    volume_24h: float = 0.0
    market_cap: Optional[float] = None
    high_24h: Optional[float] = None
    low_24h: Optional[float] = None
    timestamp: datetime


class Candle(BaseModel):
    time: int            # unix seconds, used by lightweight-charts
    open: float
    high: float
    low: float
    close: float
    volume: float


class OHLCVResponse(BaseModel):
    symbol: str
    asset_class: AssetClass
    timeframe: str
    candles: List[Candle]


class GainerLoser(BaseModel):
    symbol: str
    asset_class: AssetClass
    price: float
    change_pct: float
    volume: float


class MarketOverview(BaseModel):
    total_market_cap: float
    btc_dominance: float
    eth_dominance: float
    total_volume_24h: float
    fear_greed: Optional[int] = None
    timestamp: datetime


class SectorCell(BaseModel):
    sector: str
    symbol: str
    change_pct: float
    market_cap: Optional[float] = None
    price: float


class HeatmapResponse(BaseModel):
    cells: List[SectorCell]
    timestamp: datetime


class Alert(BaseModel):
    id: str
    type: Literal["price_spike", "price_drop", "whale", "fomo", "divergence", "news"]
    severity: Literal["info", "warning", "critical"]
    symbol: Optional[str] = None
    asset_class: Optional[AssetClass] = None
    message: str
    detail: dict = Field(default_factory=dict)
    timestamp: datetime


class NewsItem(BaseModel):
    id: str
    title: str
    source: str
    url: str
    published_at: datetime
    summary: Optional[str] = None
    category: Optional[str] = None


class PortfolioHolding(BaseModel):
    symbol: str
    asset_class: AssetClass
    quantity: float
    cost_basis: float = 0.0


class PortfolioPnL(BaseModel):
    symbol: str
    asset_class: AssetClass
    quantity: float
    price: float
    market_value: float
    cost_basis: float
    pnl_abs: float
    pnl_pct: float


class PortfolioResponse(BaseModel):
    total_value: float
    total_cost: float
    total_pnl_abs: float
    total_pnl_pct: float
    holdings: List[PortfolioPnL]
    timestamp: datetime


class IndicatorRequest(BaseModel):
    symbol: str
    asset_class: AssetClass
    timeframe: str = "1h"
    indicators: List[str] = Field(default_factory=lambda: ["sma20", "ema50", "rsi", "bbands"])


class IndicatorSeries(BaseModel):
    name: str
    values: List[Optional[float]]


class IndicatorResponse(BaseModel):
    symbol: str
    timeframe: str
    times: List[int]
    series: List[IndicatorSeries]


class CorrelationResponse(BaseModel):
    symbols: List[str]
    matrix: List[List[float]]
    timestamp: datetime


class IntradayPoint(BaseModel):
    time: int
    price: float
    volume: float
    event: Optional[str] = None  # "pump", "dump", or None


class IntradayResponse(BaseModel):
    symbol: str
    points: List[IntradayPoint]


class TimezoneSession(BaseModel):
    session: Literal["asia", "europe", "us"]
    avg_volume: float
    avg_volatility_pct: float
    net_change_pct: float


class DailyInsight(BaseModel):
    date: str
    market_state: Literal["bullish", "bearish", "sideway"]
    summary: str
    anomalies: List[dict]
    sessions: List[TimezoneSession]
    insights: List[str]
    top_gainers: List[GainerLoser]
    top_losers: List[GainerLoser]
    timestamp: datetime


class EnhancedDailyInsight(DailyInsight):
    market_narrative: Optional[dict] = None
    cross_asset_insights: List[dict] = []
    anomaly_interpretations: List[dict] = []
    session_narratives: List[str] = []
    weekly_summary: Optional[dict] = None
    forecast_summary: Optional[List[dict]] = None   # List of forecast items per asset
    historical_context: Optional[dict] = None       # Long-term context analysis


