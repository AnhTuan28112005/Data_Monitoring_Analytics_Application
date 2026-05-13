"""
WORLD MONITOR — Historical Data Backfill
=========================================
Downloads historical OHLCV data from Yahoo Finance and loads it into
the PostgreSQL ``ohlcv_candles`` table.

Uses ON CONFLICT to safely skip duplicates — can be re-run at any time.
"""
from __future__ import annotations

import os
import sys
from datetime import datetime

import pandas as pd
import yfinance as yf
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ DATABASE_URL not set in .env — aborting.")
    sys.exit(1)

engine = create_engine(DATABASE_URL)

# All assets to backfill
ASSETS = [
    # Crypto
    {"symbol": "BTC/USDT",   "ticker": "BTC-USD",    "period": "6mo", "interval": "1h"},
    {"symbol": "ETH/USDT",   "ticker": "ETH-USD",    "period": "6mo", "interval": "1h"},
    {"symbol": "SOL/USDT",   "ticker": "SOL-USD",    "period": "6mo", "interval": "1h"},
    {"symbol": "BNB/USDT",   "ticker": "BNB-USD",    "period": "6mo", "interval": "1h"},
    {"symbol": "XRP/USDT",   "ticker": "XRP-USD",    "period": "6mo", "interval": "1h"},
    {"symbol": "ADA/USDT",   "ticker": "ADA-USD",    "period": "6mo", "interval": "1h"},
    # Stocks
    {"symbol": "AAPL",       "ticker": "AAPL",       "period": "1y",  "interval": "1d"},
    {"symbol": "MSFT",       "ticker": "MSFT",       "period": "1y",  "interval": "1d"},
    {"symbol": "NVDA",       "ticker": "NVDA",       "period": "1y",  "interval": "1d"},
    # Indices
    {"symbol": "^GSPC",      "ticker": "^GSPC",      "period": "1y",  "interval": "1d"},
    {"symbol": "^IXIC",      "ticker": "^IXIC",      "period": "1y",  "interval": "1d"},
    # Gold & Silver
    {"symbol": "GC=F",       "ticker": "GC=F",       "period": "1y",  "interval": "1d"},
    {"symbol": "SI=F",       "ticker": "SI=F",       "period": "1y",  "interval": "1d"},
    # Forex
    {"symbol": "EURUSD=X",   "ticker": "EURUSD=X",   "period": "6mo", "interval": "1d"},
    {"symbol": "GBPUSD=X",   "ticker": "GBPUSD=X",   "period": "6mo", "interval": "1d"},
    {"symbol": "USDJPY=X",   "ticker": "USDJPY=X",   "period": "6mo", "interval": "1d"},
]


def load_historical_data(symbol: str, yf_ticker: str,
                         period: str = "6mo", interval: str = "1h") -> int:
    """Download historical data from Yahoo Finance and insert into DB.

    Returns the number of rows inserted.
    """
    print(f"\n{'─'*60}")
    print(f"🚀 {symbol} ({yf_ticker})  period={period}  interval={interval}")

    try:
        data = yf.download(yf_ticker, period=period, interval=interval, progress=False)

        if data.empty:
            print(f"   ⚠️ No data returned for {yf_ticker}")
            return 0

        data = data.reset_index()

        # Flatten multi-level columns that yfinance sometimes returns
        def flatten(series):
            return series.values.flatten()

        # Convert index datetime to unix seconds
        dt_col = data.columns[0]  # 'Date' or 'Datetime'
        unix_ts = pd.to_datetime(data[dt_col]).values.astype("datetime64[s]").astype("int64")

        df = pd.DataFrame({
            "symbol": symbol,
            "timeframe": interval,
            "open": flatten(data["Open"]),
            "high": flatten(data["High"]),
            "low": flatten(data["Low"]),
            "close": flatten(data["Close"]),
            "volume": flatten(data["Volume"]),
            "time_timestamp": unix_ts,
        })

        # Drop rows where close is NaN or 0
        df = df.dropna(subset=["close"])
        df = df[df["close"] > 0]

        if df.empty:
            print(f"   ⚠️ All rows filtered out for {symbol}")
            return 0

        # Insert with ON CONFLICT DO NOTHING (safe re-run)
        inserted = 0
        query = text("""
            INSERT INTO ohlcv_candles
                (symbol, timeframe, open, high, low, close, volume, time_timestamp)
            VALUES
                (:symbol, :timeframe, :open, :high, :low, :close, :volume, :time_timestamp)
            ON CONFLICT (symbol, timeframe, time_timestamp) DO NOTHING
        """)

        with engine.connect() as conn:
            for _, row in df.iterrows():
                result = conn.execute(query, {
                    "symbol": row["symbol"],
                    "timeframe": row["timeframe"],
                    "open": float(row["open"]),
                    "high": float(row["high"]),
                    "low": float(row["low"]),
                    "close": float(row["close"]),
                    "volume": float(row["volume"]),
                    "time_timestamp": int(row["time_timestamp"]),
                })
                inserted += result.rowcount
            conn.commit()

        print(f"   ✅ {inserted} new rows inserted (total fetched: {len(df)})")
        return inserted

    except Exception as exc:
        print(f"   ❌ Error: {exc}")
        return 0


if __name__ == "__main__":
    start = datetime.now()
    print(f"🕒 Backfill started at {start.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"📊 Assets to process: {len(ASSETS)}")

    total = 0
    for asset in ASSETS:
        total += load_historical_data(
            asset["symbol"],
            asset["ticker"],
            asset.get("period", "6mo"),
            asset.get("interval", "1h"),
        )

    elapsed = (datetime.now() - start).total_seconds()
    print(f"\n{'═'*60}")
    print(f"🎉 Backfill complete: {total} total rows inserted in {elapsed:.1f}s")