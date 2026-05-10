"""Data export API — CSV download from PostgreSQL."""
from __future__ import annotations

import io

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import db_available, engine, get_db

router = APIRouter(prefix="/api/export", tags=["Data Export"])


@router.get("/csv/{symbol:path}")
async def export_candles_csv(
    symbol: str,
    timeframe: str = Query("1h", description="Filter by timeframe"),
    db: Session = Depends(get_db),
):
    """Download OHLCV candle data as CSV for a given symbol."""
    if not db_available() or db is None:
        raise HTTPException(503, "Database not configured. CSV export unavailable.")

    query = text("""
        SELECT symbol, timeframe, time_timestamp, open, high, low, close, volume
        FROM ohlcv_candles
        WHERE symbol = :s AND timeframe = :tf
        ORDER BY time_timestamp ASC
    """)

    # Use engine directly (read-only query)
    df = pd.read_sql(query, engine, params={"s": symbol, "tf": timeframe})

    if df.empty:
        raise HTTPException(404, f"No data found for {symbol} ({timeframe})")

    # Convert unix timestamp to datetime for readability
    df["datetime"] = pd.to_datetime(df["time_timestamp"], unit="s", utc=True)

    stream = io.StringIO()
    df.to_csv(stream, index=False)

    safe_name = symbol.replace("/", "_").replace("^", "")
    return StreamingResponse(
        iter([stream.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={safe_name}_{timeframe}.csv"},
    )


@router.get("/tables")
async def list_tables(db: Session = Depends(get_db)):
    """List all tables and their row counts."""
    if not db_available() or db is None:
        raise HTTPException(503, "Database not configured.")

    tables = ["ohlcv_candles", "prices", "alerts", "news", "daily_insights"]
    result = {}
    for t in tables:
        try:
            row = db.execute(text(f"SELECT COUNT(*) FROM {t}")).fetchone()
            result[t] = row[0] if row else 0
        except Exception:
            result[t] = "error"
    return result