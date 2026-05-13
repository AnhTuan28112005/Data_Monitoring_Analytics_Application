"""
WORLD MONITOR — Data Cleaning Script
======================================
Removes duplicate rows and invalid data from the PostgreSQL tables.
Safe to run multiple times.
"""
from __future__ import annotations

import os
import sys

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ DATABASE_URL not set in .env — aborting.")
    sys.exit(1)

engine = create_engine(DATABASE_URL)


def clean_database():
    print("🧹 Starting data cleaning...\n")

    with engine.connect() as conn:
        # ------------------------------------------------------------------
        # 1. Remove duplicates in ohlcv_candles (keep the row with the
        #    *lowest* id — i.e. the earliest inserted)
        # ------------------------------------------------------------------
        res = conn.execute(text("""
            DELETE FROM ohlcv_candles a
            USING ohlcv_candles b
            WHERE a.id > b.id
              AND a.symbol = b.symbol
              AND a.timeframe = b.timeframe
              AND a.time_timestamp = b.time_timestamp;
        """))
        print(f"   🔹 ohlcv_candles: {res.rowcount} duplicate rows removed")

        # ------------------------------------------------------------------
        # 2. Remove candles with invalid prices
        # ------------------------------------------------------------------
        res = conn.execute(text("""
            DELETE FROM ohlcv_candles
            WHERE close IS NULL
               OR close = 0
               OR open IS NULL
               OR high IS NULL
               OR low IS NULL;
        """))
        print(f"   🔹 ohlcv_candles: {res.rowcount} invalid-price rows removed")

        # ------------------------------------------------------------------
        # 3. Remove candles where high < low (data corruption)
        # ------------------------------------------------------------------
        res = conn.execute(text("""
            DELETE FROM ohlcv_candles WHERE high < low;
        """))
        print(f"   🔹 ohlcv_candles: {res.rowcount} corrupted (high<low) rows removed")

        # ------------------------------------------------------------------
        # 4. Remove price snapshots with zero price
        # ------------------------------------------------------------------
        res = conn.execute(text("""
            DELETE FROM prices WHERE price IS NULL OR price = 0;
        """))
        print(f"   🔹 prices: {res.rowcount} zero/null-price rows removed")

        # ------------------------------------------------------------------
        # 5. Remove news with empty title
        # ------------------------------------------------------------------
        res = conn.execute(text("""
            DELETE FROM news WHERE title IS NULL OR TRIM(title) = '';
        """))
        print(f"   🔹 news: {res.rowcount} empty-title rows removed")

        conn.commit()

    print("\n✅ Data cleaning complete.")


if __name__ == "__main__":
    clean_database()