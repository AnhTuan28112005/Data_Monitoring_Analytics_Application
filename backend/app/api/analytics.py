"""Analytics endpoints — indicators, correlation matrix, intraday timeline."""
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Body, Query

from app.models.schemas import (
    AssetClass,
    CorrelationResponse,
    IndicatorRequest,
    IndicatorResponse,
    IntradayResponse,
)
from app.services.analytics_service import analytics_service

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.post("/indicators", response_model=IndicatorResponse)
async def post_indicators(req: IndicatorRequest):
    return await analytics_service.indicators(
        req.asset_class, req.symbol, req.timeframe, req.indicators
    )


@router.get("/correlation", response_model=CorrelationResponse)
async def get_correlation(
    pairs: List[str] = Query(
        default=[
            "crypto:BTC/USDT",
            "crypto:ETH/USDT",
            "crypto:SOL/USDT",
            "index:^GSPC",
            "index:^IXIC",
            "gold:GC=F",
            "forex:EURUSD=X",
        ],
        description="List of '<asset_class>:<symbol>' pairs",
    ),
    timeframe: str = Query("1d"),
    limit: int = Query(90, ge=20, le=500),
):
    parsed: List[tuple[AssetClass, str]] = []
    for p in pairs:
        if ":" not in p:
            continue
        ac, sym = p.split(":", 1)
        parsed.append((ac, sym))  # type: ignore[arg-type]
    return await analytics_service.correlation(parsed, timeframe, limit)


@router.get("/intraday", response_model=IntradayResponse)
async def get_intraday(
    symbol: str = Query(...),
    asset_class: AssetClass = Query(...),
):
    return await analytics_service.intraday_timeline(asset_class, symbol)
