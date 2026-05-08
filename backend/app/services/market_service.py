"""Unified market service that knows how to route a (symbol, asset_class)
to the correct data backend (ccxt vs yfinance).

Also produces sector heatmap data and multi-asset comparison panels.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Dict, List, Tuple

import pandas as pd

from app.core.cache import ohlcv_cache, prices_cache
from app.core.config import settings
from app.models.schemas import (
    AssetClass,
    Candle,
    GainerLoser,
    HeatmapResponse,
    PriceTick,
    SectorCell,
)
from app.services.crypto_service import crypto_service
from app.services.yfinance_service import yfinance_service


class MarketService:
    # ------------------------------------------------------------------
    async def fetch_all_prices(self) -> List[PriceTick]:
        crypto_task = crypto_service.fetch_tickers(settings.CRYPTO_SYMBOLS)
        stock_task = yfinance_service.fetch_quotes(settings.STOCK_TICKERS)
        gold_task = yfinance_service.fetch_quotes(settings.GOLD_SILVER_TICKERS)
        fx_task = yfinance_service.fetch_quotes(settings.FOREX_TICKERS)

        crypto, stock, gold, fx = await asyncio.gather(
            crypto_task, stock_task, gold_task, fx_task, return_exceptions=True
        )

        ticks: List[PriceTick] = []
        for grp in (crypto, stock, gold, fx):
            if isinstance(grp, list):
                ticks.extend(grp)
        # Update price cache for fast REST + websocket diffs
        for t in ticks:
            prices_cache.set(f"{t.asset_class}:{t.symbol}", t.model_dump())
        return ticks

    # ------------------------------------------------------------------
    async def get_ohlcv(self, asset_class: AssetClass, symbol: str,
                        timeframe: str = "1h", limit: int = 200) -> List[Candle]:
        cache_key = f"{asset_class}:{symbol}:{timeframe}"
        cached = ohlcv_cache.get(cache_key)
        if cached:
            return [Candle(**c) for c in cached]

        if asset_class == "crypto":
            candles = await crypto_service.fetch_ohlcv(symbol, timeframe, limit)
        else:
            candles = await yfinance_service.fetch_ohlcv(symbol, timeframe, limit)

        ohlcv_cache.set(cache_key, [c.model_dump() for c in candles], ttl=30)
        return candles

    async def get_ohlcv_df(self, asset_class: AssetClass, symbol: str,
                           timeframe: str = "1h", limit: int = 200) -> pd.DataFrame:
        if asset_class == "crypto":
            return await crypto_service.ohlcv_dataframe(symbol, timeframe, limit)
        return await yfinance_service.ohlcv_dataframe(symbol, timeframe, limit)

    # ------------------------------------------------------------------
    async def gainers_losers(self, n: int = 5) -> Tuple[List[GainerLoser], List[GainerLoser]]:
        ticks = await self.fetch_all_prices()
        ranked = sorted(ticks, key=lambda x: x.change_24h_pct, reverse=True)
        gainers = [
            GainerLoser(symbol=t.symbol, asset_class=t.asset_class, price=t.price,
                        change_pct=t.change_24h_pct, volume=t.volume_24h)
            for t in ranked[:n]
        ]
        losers = [
            GainerLoser(symbol=t.symbol, asset_class=t.asset_class, price=t.price,
                        change_pct=t.change_24h_pct, volume=t.volume_24h)
            for t in reversed(ranked[-n:])
        ]
        return gainers, losers

    # ------------------------------------------------------------------
    async def sector_heatmap(self) -> HeatmapResponse:
        ticks = await self.fetch_all_prices()
        index: Dict[str, PriceTick] = {f"{t.asset_class}:{t.symbol}": t for t in ticks}

        cells: List[SectorCell] = []

        for sector, syms in settings.CRYPTO_SECTORS.items():
            for s in syms:
                t = index.get(f"crypto:{s}")
                if not t:
                    continue
                cells.append(SectorCell(
                    sector=f"Crypto · {sector}",
                    symbol=s,
                    change_pct=t.change_24h_pct,
                    market_cap=t.market_cap,
                    price=t.price,
                ))

        for sector, syms in settings.STOCK_SECTORS.items():
            for s in syms:
                t = index.get(f"stock:{s}") or index.get(f"index:{s}")
                if not t:
                    continue
                cells.append(SectorCell(
                    sector=f"Stocks · {sector}",
                    symbol=s,
                    change_pct=t.change_24h_pct,
                    market_cap=None,
                    price=t.price,
                ))

        # Add a synthetic 'Metals' / 'Forex' sector for variety
        for s in settings.GOLD_SILVER_TICKERS:
            t = index.get(f"gold:{s}") or index.get(f"silver:{s}")
            if not t:
                continue
            cells.append(SectorCell(
                sector="Metals", symbol=s,
                change_pct=t.change_24h_pct,
                market_cap=None, price=t.price,
            ))
        for s in settings.FOREX_TICKERS:
            t = index.get(f"forex:{s}")
            if not t:
                continue
            cells.append(SectorCell(
                sector="Forex", symbol=s,
                change_pct=t.change_24h_pct,
                market_cap=None, price=t.price,
            ))

        return HeatmapResponse(cells=cells, timestamp=datetime.now(timezone.utc))

    # ------------------------------------------------------------------
    async def multi_asset_panel(self) -> List[Dict]:
        """Mini comparison panel: BTC, S&P500, XAU/USD, EUR/USD."""
        symbols = [
            ("crypto", "BTC/USDT"),
            ("index", "^GSPC"),
            ("forex", "EURUSD=X"),
            ("gold", "GC=F"),
            ("silver", "SI=F"),
        ]
        out = []
        for asset_class, sym in symbols:
            cached = prices_cache.get(f"{asset_class}:{sym}")
            candles = await self.get_ohlcv(asset_class, sym, "1h", 60)
            out.append({
                "asset_class": asset_class,
                "symbol": sym,
                "price": cached.get("price") if cached else (candles[-1].close if candles else 0.0),
                "change_pct": cached.get("change_24h_pct", 0.0) if cached else 0.0,
                "spark": [c.close for c in candles[-30:]] if candles else [],
            })
        return out


market_service = MarketService()
