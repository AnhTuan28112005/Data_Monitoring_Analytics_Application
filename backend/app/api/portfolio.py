"""Portfolio endpoint — accepts holdings and returns valued PnL."""
from __future__ import annotations

from typing import List

from fastapi import APIRouter

from app.models.schemas import PortfolioHolding, PortfolioResponse
from app.services.portfolio_service import portfolio_service

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


@router.post("/value", response_model=PortfolioResponse)
async def value_portfolio(holdings: List[PortfolioHolding]):
    return await portfolio_service.value(holdings)
