import logging
import pandas as pd
from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.ml.forecast import generate_prophet_forecast, TIMEFRAME_CONFIG

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/forecast", tags=["forecast"])


def _load(db: Session, symbol: str, limit: int = 1000):
    query = text("""
        SELECT time_timestamp, close
        FROM (
            SELECT time_timestamp, close
            FROM ohlcv_candles
            WHERE symbol = :symbol
            ORDER BY time_timestamp DESC
            LIMIT :limit
        ) t
        ORDER BY time_timestamp ASC
    """)

    return pd.read_sql(query, db.connection(), params={
        "symbol": symbol,
        "limit": limit
    })


def _get_lookback(timeframe: str) -> int:
    return TIMEFRAME_CONFIG.get(timeframe, TIMEFRAME_CONFIG["1h"])["lookback"]


@router.get("/{symbol:path}")
def get_forecast(
    symbol: str,
    timeframe: str = Query("1h"),
    db: Session = Depends(get_db),
):

    try:
        df = _load(db, symbol, limit=_get_lookback(timeframe))

        if df.empty:
            return {
                "success": True,
                "symbol": symbol,
                "timeframe": timeframe,
                "data": []
            }

        forecast = generate_prophet_forecast(df, timeframe)

        logger.info(
            "Forecast result symbol=%s timeframe=%s points=%s",
            symbol,
            timeframe,
            len(forecast)
        )

        return {
            "success": True,
            "symbol": symbol,
            "timeframe": timeframe,
            "data": forecast
        }

    except Exception:
        logger.exception("Forecast API failed")
        return {
            "success": True,
            "symbol": symbol,
            "timeframe": timeframe,
            "data": []
        }