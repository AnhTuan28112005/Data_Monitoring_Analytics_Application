"""Application configuration loaded from environment variables."""
from __future__ import annotations

import os
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "World Monitor"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    LOG_LEVEL: str = "INFO"

    # Data sources
    CRYPTO_EXCHANGE: str = "binance"

    # Polling intervals (seconds)
    PRICE_POLL_INTERVAL: int = 5
    OHLCV_POLL_INTERVAL: int = 15
    NEWS_POLL_INTERVAL: int = 300
    INSIGHT_REBUILD_INTERVAL: int = 600

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Universe of tracked symbols.  Crypto symbols use ccxt notation (BASE/QUOTE).
    CRYPTO_SYMBOLS: List[str] = [
        "BTC/USDT",
        "ETH/USDT",
        "SOL/USDT",
        "BNB/USDT",
        "XRP/USDT",
        "ADA/USDT",
        "DOGE/USDT",
        "AVAX/USDT",
        "LINK/USDT",
        "MATIC/USDT",
    ]

    # yfinance tickers grouped by asset class
    STOCK_TICKERS: List[str] = ["^GSPC", "^IXIC", "^DJI", "AAPL", "MSFT", "NVDA", "TSLA", "GOOGL", "AMZN", "META"]
    GOLD_SILVER_TICKERS: List[str] = ["GC=F", "SI=F", "XAUUSD=X", "XAGUSD=X"]
    FOREX_TICKERS: List[str] = ["EURUSD=X", "GBPUSD=X", "USDJPY=X", "USDCHF=X", "AUDUSD=X", "USDCAD=X"]

    # Sector classification used for the heatmap.
    CRYPTO_SECTORS: dict = {
        "Layer 1": ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "ADA/USDT", "AVAX/USDT"],
        "DeFi": ["LINK/USDT", "UNI/USDT", "AAVE/USDT"],
        "Memes": ["DOGE/USDT", "SHIB/USDT"],
        "Layer 2": ["MATIC/USDT", "ARB/USDT", "OP/USDT"],
        "AI": ["FET/USDT", "AGIX/USDT", "RNDR/USDT"],
    }
    STOCK_SECTORS: dict = {
        "Tech": ["AAPL", "MSFT", "NVDA", "GOOGL", "META", "AMZN"],
        "Index": ["^GSPC", "^IXIC", "^DJI"],
        "Auto": ["TSLA"],
    }

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
