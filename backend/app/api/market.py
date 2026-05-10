"""Market REST endpoints — prices, OHLCV, gainers/losers, overview, heatmap."""
from __future__ import annotations

from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import (
    AssetClass,
    GainerLoser,
    HeatmapResponse,
    MarketOverview,
    OHLCVResponse,
    PriceTick,
)
from app.services.crypto_service import crypto_service
from app.services.market_service import market_service

router = APIRouter(prefix="/api/market", tags=["market"])


@router.get("/prices", response_model=List[PriceTick])
async def get_prices():
    """Return latest snapshot of every tracked asset across all classes."""
    return await market_service.fetch_all_prices()


@router.get("/ohlcv", response_model=OHLCVResponse)
async def get_ohlcv(
    symbol: str = Query(..., description="e.g. BTC/USDT or AAPL"),
    asset_class: AssetClass = Query(..., description="crypto|stock|index|gold|silver|forex"),
    timeframe: str = Query("1h"),
    limit: int = Query(200, ge=20, le=1000),
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD format"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD format"),
):
    candles = await market_service.get_ohlcv(asset_class, symbol, timeframe, limit, start_date, end_date)
    if not candles:
        raise HTTPException(404, f"No candles for {symbol} ({asset_class}/{timeframe})")
    return OHLCVResponse(
        symbol=symbol, asset_class=asset_class, timeframe=timeframe, candles=candles
    )


@router.get("/gainers-losers")
async def get_gainers_losers(n: int = Query(5, ge=1, le=20)):
    g, l = await market_service.gainers_losers(n)
    return {"gainers": g, "losers": l}


@router.get("/overview", response_model=MarketOverview)
async def get_overview():
    return await crypto_service.market_overview()


@router.get("/heatmap", response_model=HeatmapResponse)
async def get_heatmap():
    return await market_service.sector_heatmap()


@router.get("/multi-asset-panel")
async def get_multi_asset_panel():
    return await market_service.multi_asset_panel()
