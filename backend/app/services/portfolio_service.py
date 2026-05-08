"""Portfolio tracking service.

Stateless: holdings are passed in by the client (browser), the backend just
prices them in real time. This avoids the need for user accounts.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List

from app.core.cache import prices_cache
from app.models.schemas import (
    PortfolioHolding,
    PortfolioPnL,
    PortfolioResponse,
)


class PortfolioService:
    async def value(self, holdings: List[PortfolioHolding]) -> PortfolioResponse:
        rows: List[PortfolioPnL] = []
        total_value = 0.0
        total_cost = 0.0

        for h in holdings:
            cached = prices_cache.get(f"{h.asset_class}:{h.symbol}")
            price = float(cached["price"]) if cached else 0.0
            mv = price * h.quantity
            cb = h.cost_basis * h.quantity if h.cost_basis else 0.0
            pnl_abs = mv - cb if cb else 0.0
            pnl_pct = (pnl_abs / cb * 100.0) if cb else 0.0
            total_value += mv
            total_cost += cb
            rows.append(PortfolioPnL(
                symbol=h.symbol, asset_class=h.asset_class, quantity=h.quantity,
                price=price, market_value=mv, cost_basis=cb,
                pnl_abs=pnl_abs, pnl_pct=pnl_pct,
            ))

        total_pnl = total_value - total_cost
        total_pnl_pct = (total_pnl / total_cost * 100.0) if total_cost else 0.0
        return PortfolioResponse(
            total_value=total_value,
            total_cost=total_cost,
            total_pnl_abs=total_pnl,
            total_pnl_pct=total_pnl_pct,
            holdings=rows,
            timestamp=datetime.now(timezone.utc),
        )


portfolio_service = PortfolioService()
