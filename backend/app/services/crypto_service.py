"""Crypto data service backed by ccxt + pycoingecko.

ccxt provides exchange-grade OHLCV (1m/5m/1h/1d).  CoinGecko is used for
global market overview (total market cap, BTC dominance) and Fear & Greed
proxy data when the exchange does not expose it.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Dict, List, Optional

import ccxt
import httpx
import pandas as pd
from loguru import logger
from pycoingecko import CoinGeckoAPI

from app.core.config import settings
from app.models.schemas import Candle, GainerLoser, MarketOverview, PriceTick


_TF_MAP = {"1m": "1m", "5m": "5m", "15m": "15m", "1h": "1h", "4h": "4h", "1d": "1d"}


class CryptoService:
    """Async wrapper around the synchronous ccxt + pycoingecko clients."""

    def __init__(self) -> None:
        exchange_cls = getattr(ccxt, settings.CRYPTO_EXCHANGE, ccxt.binance)
        self._exchange = exchange_cls({"enableRateLimit": True, "timeout": 15000})
        self._cg = CoinGeckoAPI()
        self._symbol_to_cg: Dict[str, str] = {
            "BTC/USDT": "bitcoin",
            "ETH/USDT": "ethereum",
            "SOL/USDT": "solana",
            "BNB/USDT": "binancecoin",
            "XRP/USDT": "ripple",
            "ADA/USDT": "cardano",
            "DOGE/USDT": "dogecoin",
            "AVAX/USDT": "avalanche-2",
            "LINK/USDT": "chainlink",
            "MATIC/USDT": "matic-network",
            "UNI/USDT": "uniswap",
            "AAVE/USDT": "aave",
            "SHIB/USDT": "shiba-inu",
            "ARB/USDT": "arbitrum",
            "OP/USDT": "optimism",
            "FET/USDT": "fetch-ai",
            "AGIX/USDT": "singularitynet",
            "RNDR/USDT": "render-token",
        }

    # ------------------------------------------------------------------
    async def fetch_tickers(self, symbols: Optional[List[str]] = None) -> List[PriceTick]:
        symbols = symbols or settings.CRYPTO_SYMBOLS
        try:
            tickers = await asyncio.to_thread(self._exchange.fetch_tickers, symbols)
        except Exception as exc:
            logger.warning(f"ccxt fetch_tickers failed ({exc}); fallback to CoinGecko.")
            return await self._fallback_cg_tickers(symbols)

        out: List[PriceTick] = []
        for sym, t in tickers.items():
            try:
                last = float(t.get("last") or t.get("close") or 0.0)
                pct = float(t.get("percentage") or 0.0)
                base_vol = float(t.get("baseVolume") or 0.0)
                quote_vol = float(t.get("quoteVolume") or last * base_vol)
                ts = t.get("timestamp")
                ts_dt = (
                    datetime.fromtimestamp(ts / 1000, tz=timezone.utc)
                    if ts else datetime.now(timezone.utc)
                )
                out.append(
                    PriceTick(
                        symbol=sym,
                        asset_class="crypto",
                        price=last,
                        change_24h_pct=pct,
                        change_24h_abs=float(t.get("change") or 0.0),
                        volume_24h=quote_vol,
                        high_24h=float(t.get("high") or last),
                        low_24h=float(t.get("low") or last),
                        timestamp=ts_dt,
                    )
                )
            except Exception:
                continue
        
        # Enrich with market cap from CoinGecko (with simple cache)
        now = datetime.now(timezone.utc)
        if not hasattr(self, "_mcap_cache") or (now - self._mcap_last_update).total_seconds() > 300:
            try:
                cg_data = await self._fallback_cg_tickers(symbols)
                self._mcap_cache = {t.symbol: t.market_cap for t in cg_data if t.market_cap}
                self._mcap_last_update = now
            except Exception as exc:
                logger.warning(f"Failed to enrich tickers with market cap: {exc}")
        
        if hasattr(self, "_mcap_cache"):
            for t in out:
                if t.symbol in self._mcap_cache:
                    t.market_cap = self._mcap_cache[t.symbol]

        return out

    async def fetch_fear_greed(self) -> Optional[int]:
        """Fetch current crypto Fear & Greed index from alternative.me."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get("https://api.alternative.me/fng/?limit=1")
                if resp.status_code == 200:
                    data = resp.json()
                    return int(data["data"][0]["value"])
        except Exception as exc:
            logger.warning(f"Failed to fetch Fear & Greed index: {exc}")
        return None

    async def _fallback_cg_tickers(self, symbols: List[str]) -> List[PriceTick]:
        ids = [self._symbol_to_cg.get(s) for s in symbols if self._symbol_to_cg.get(s)]
        if not ids:
            return []
        try:
            data = await asyncio.to_thread(
                self._cg.get_price,
                ids=",".join(ids),
                vs_currencies="usd",
                include_24hr_change="true",
                include_24hr_vol="true",
                include_market_cap="true",
            )
        except Exception as exc:
            logger.error(f"CoinGecko fallback failed: {exc}")
            return []
        out: List[PriceTick] = []
        for sym in symbols:
            cg = self._symbol_to_cg.get(sym)
            if not cg or cg not in data:
                continue
            d = data[cg]
            out.append(
                PriceTick(
                    symbol=sym,
                    asset_class="crypto",
                    price=float(d.get("usd", 0.0)),
                    change_24h_pct=float(d.get("usd_24h_change", 0.0) or 0.0),
                    change_24h_abs=0.0,
                    volume_24h=float(d.get("usd_24h_vol", 0.0) or 0.0),
                    market_cap=float(d.get("usd_market_cap", 0.0) or 0.0),
                    timestamp=datetime.now(timezone.utc),
                )
            )
        return out

    # ------------------------------------------------------------------
    async def fetch_ohlcv(self, symbol: str, timeframe: str = "1h", limit: int = 200) -> List[Candle]:
        tf = _TF_MAP.get(timeframe, "1h")
        try:
            raw = await asyncio.to_thread(self._exchange.fetch_ohlcv, symbol, tf, None, limit)
        except Exception as exc:
            logger.warning(f"ccxt fetch_ohlcv failed for {symbol}/{tf}: {exc}")
            return []
        candles = [
            Candle(
                time=int(r[0] / 1000),
                open=float(r[1]),
                high=float(r[2]),
                low=float(r[3]),
                close=float(r[4]),
                volume=float(r[5]),
            )
            for r in raw
        ]
        return candles

    async def ohlcv_dataframe(self, symbol: str, timeframe: str = "1h", limit: int = 200) -> pd.DataFrame:
        candles = await self.fetch_ohlcv(symbol, timeframe, limit)
        if not candles:
            return pd.DataFrame(columns=["open", "high", "low", "close", "volume"])
        df = pd.DataFrame([c.model_dump() for c in candles])
        df["dt"] = pd.to_datetime(df["time"], unit="s", utc=True)
        df.set_index("dt", inplace=True)
        return df[["open", "high", "low", "close", "volume"]]

    # ------------------------------------------------------------------
    async def market_overview(self) -> MarketOverview:
        now = datetime.now(timezone.utc)
        
        # 1. Try to get cached global data (5 min TTL)
        if not hasattr(self, "_global_cache") or (now - self._global_last_update).total_seconds() > 300:
            try:
                global_data = await asyncio.to_thread(self._cg.get_global)
                d = global_data["data"] if "data" in global_data else global_data
                self._global_cache = {
                    "total_mcap": float(d["total_market_cap"]["usd"]),
                    "total_vol": float(d["total_volume"]["usd"]),
                    "btc_dom": float(d["market_cap_percentage"].get("btc", 52.0)),
                    "eth_dom": float(d["market_cap_percentage"].get("eth", 17.0)),
                }
                self._global_last_update = now
                logger.info("✅ CoinGecko global data refreshed.")
            except Exception as exc:
                logger.warning(f"CoinGecko global failed: {exc}. Using last known or defaults.")
                if not hasattr(self, "_global_cache"):
                    # Hard fallback for first-run failure
                    self._global_cache = {
                        "total_mcap": 2.5e12,
                        "total_vol": 8.5e10,
                        "btc_dom": 52.5,
                        "eth_dom": 16.8,
                    }
                    self._global_last_update = now

        cache = self._global_cache
        total_mcap = cache["total_mcap"]
        total_vol = cache["total_vol"]
        btc_dom = cache["btc_dom"]
        eth_dom = cache["eth_dom"]

        # 2. Fear & Greed cache (30 min TTL)
        if not hasattr(self, "_fng_cache") or (now - self._fng_last_update).total_seconds() > 1800:
            fng = await self.fetch_fear_greed()
            if fng is not None:
                self._fng_cache = fng
                self._fng_last_update = now
            elif not hasattr(self, "_fng_cache"):
                self._fng_cache = 50 # Default neutral
                self._fng_last_update = now
        
        return MarketOverview(
            total_market_cap=total_mcap,
            btc_dominance=btc_dom,
            eth_dominance=eth_dom,
            total_volume_24h=total_vol,
            fear_greed=self._fng_cache,
            timestamp=now,
        )

    # ------------------------------------------------------------------
    async def gainers_losers(self, ticks: List[PriceTick], n: int = 5):
        ranked = sorted(ticks, key=lambda x: x.change_24h_pct, reverse=True)
        gainers = [
            GainerLoser(
                symbol=t.symbol, asset_class=t.asset_class, price=t.price,
                change_pct=t.change_24h_pct, volume=t.volume_24h
            ) for t in ranked[:n]
        ]
        losers = [
            GainerLoser(
                symbol=t.symbol, asset_class=t.asset_class, price=t.price,
                change_pct=t.change_24h_pct, volume=t.volume_24h
            ) for t in ranked[-n:][::-1]
        ]
        return gainers, losers


crypto_service = CryptoService()
