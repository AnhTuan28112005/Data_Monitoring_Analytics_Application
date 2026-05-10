"""
WORLD MONITOR — Data Quality Report
=====================================
Checks completeness, freshness, and integrity of data in PostgreSQL.
"""
from __future__ import annotations

import os
import sys
from datetime import datetime, timezone

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ DATABASE_URL not set in .env — aborting.")
    sys.exit(1)

engine = create_engine(DATABASE_URL)


def check_quality():
    print("=" * 60)
    print("📊 DATA QUALITY REPORT")
    print(f"   Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    with engine.connect() as conn:
        # ------------------------------------------------------------------
        # 1. Row counts per table
        # ------------------------------------------------------------------
        tables = ["ohlcv_candles", "prices", "alerts", "news", "daily_insights"]
        print("\n📋 TABLE ROW COUNTS:")
        for t in tables:
            try:
                row = conn.execute(text(f"SELECT COUNT(*) FROM {t}")).fetchone()
                print(f"   {t:25s} → {row[0]:>10,} rows")
            except Exception as e:
                print(f"   {t:25s} → ERROR: {e}")

        # ------------------------------------------------------------------
        # 2. OHLCV breakdown by symbol & timeframe
        # ------------------------------------------------------------------
        print("\n📈 OHLCV CANDLES BREAKDOWN:")
        rows = conn.execute(text("""
            SELECT symbol, timeframe, COUNT(*) as cnt,
                   MIN(time_timestamp) as earliest,
                   MAX(time_timestamp) as latest
            FROM ohlcv_candles
            GROUP BY symbol, timeframe
            ORDER BY symbol, timeframe
        """)).fetchall()

        if not rows:
            print("   (empty)")
        for r in rows:
            earliest = datetime.fromtimestamp(r[3], tz=timezone.utc).strftime("%Y-%m-%d")
            latest = datetime.fromtimestamp(r[4], tz=timezone.utc).strftime("%Y-%m-%d %H:%M")
            print(f"   {r[0]:15s} [{r[1]:4s}] → {r[2]:>8,} candles  "
                  f"({earliest} → {latest})")

        # ------------------------------------------------------------------
        # 3. Data freshness
        # ------------------------------------------------------------------
        print("\n🕒 DATA FRESHNESS:")
        for table, col in [("ohlcv_candles", "time_timestamp"),
                           ("prices", "EXTRACT(EPOCH FROM timestamp)::bigint")]:
            try:
                row = conn.execute(text(f"SELECT MAX({col}) FROM {table}")).fetchone()
                if row and row[0]:
                    dt = datetime.fromtimestamp(row[0], tz=timezone.utc)
                    age_min = (datetime.now(timezone.utc) - dt).total_seconds() / 60
                    status = "✅ Fresh" if age_min < 30 else "⚠️ Stale" if age_min < 1440 else "🔴 Old"
                    print(f"   {table:25s} → {dt.strftime('%Y-%m-%d %H:%M UTC')} "
                          f"({age_min:.0f} min ago) {status}")
                else:
                    print(f"   {table:25s} → (empty)")
            except Exception as e:
                print(f"   {table:25s} → ERROR: {e}")

        # ------------------------------------------------------------------
        # 4. Duplicate check
        # ------------------------------------------------------------------
        print("\n🔍 DUPLICATE CHECK (ohlcv_candles):")
        row = conn.execute(text("""
            SELECT COUNT(*) FROM (
                SELECT symbol, timeframe, time_timestamp
                FROM ohlcv_candles
                GROUP BY symbol, timeframe, time_timestamp
                HAVING COUNT(*) > 1
            ) dupes
        """)).fetchone()
        dupes = row[0] if row else 0
        if dupes == 0:
            print("   ✅ No duplicates found")
        else:
            print(f"   ⚠️ {dupes} duplicate (symbol, timeframe, timestamp) groups found")

        # ------------------------------------------------------------------
        # 5. NULL / zero check
        # ------------------------------------------------------------------
        print("\n🔍 NULL/ZERO CHECK (ohlcv_candles):")
        for col in ["open", "high", "low", "close", "volume"]:
            row = conn.execute(text(
                f"SELECT COUNT(*) FROM ohlcv_candles WHERE {col} IS NULL OR {col} = 0"
            )).fetchone()
            cnt = row[0] if row else 0
            status = "✅" if cnt == 0 else "⚠️"
            print(f"   {col:10s} → {cnt:>8,} null/zero  {status}")

    print("\n" + "=" * 60)


if __name__ == "__main__":
    check_quality()