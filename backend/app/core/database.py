"""Database module — PostgreSQL via SQLAlchemy.

Gracefully degrades: if DATABASE_URL is not set or PostgreSQL is
unreachable the rest of the application continues to work (realtime
only, no persistence).
"""
from __future__ import annotations

import os
from typing import Optional

from dotenv import load_dotenv
from loguru import logger
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session

load_dotenv()

DATABASE_URL: Optional[str] = os.getenv("DATABASE_URL")

# ---------------------------------------------------------------------------
# Engine / session — only created when DATABASE_URL is configured.
# ---------------------------------------------------------------------------
engine = None
SessionLocal = None
Base = declarative_base()

if DATABASE_URL:
    try:
        engine = create_engine(
            DATABASE_URL,
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,  # auto-reconnect stale connections
        )
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        logger.info(f"Database engine created: {DATABASE_URL.split('@')[-1]}")
    except Exception as exc:
        logger.warning(f"Could not create DB engine: {exc}. Running without persistence.")
        engine = None
        SessionLocal = None
else:
    logger.info("DATABASE_URL not set — running without persistence (in-memory only).")


def db_available() -> bool:
    """Check whether the database is configured and reachable."""
    return engine is not None and SessionLocal is not None


def get_db():
    """FastAPI dependency that yields a DB session."""
    if not db_available():
        yield None
        return
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_session() -> Optional[Session]:
    """Get a standalone session (for background tasks). Returns None if DB unavailable."""
    if not db_available():
        return None
    return SessionLocal()


# ---------------------------------------------------------------------------
# Schema initialisation
# ---------------------------------------------------------------------------
_DDL = """
-- 1. OHLCV candles (historical + realtime)
CREATE TABLE IF NOT EXISTS ohlcv_candles (
    id              SERIAL PRIMARY KEY,
    symbol          VARCHAR(20)        NOT NULL,
    timeframe       VARCHAR(10)        NOT NULL,
    open            DOUBLE PRECISION,
    high            DOUBLE PRECISION,
    low             DOUBLE PRECISION,
    close           DOUBLE PRECISION,
    volume          DOUBLE PRECISION,
    time_timestamp  BIGINT             NOT NULL,
    UNIQUE (symbol, timeframe, time_timestamp)
);

CREATE INDEX IF NOT EXISTS idx_ohlcv_symbol_tf
    ON ohlcv_candles (symbol, timeframe, time_timestamp DESC);

-- 2. Price snapshots (latest tick per poll)
CREATE TABLE IF NOT EXISTS prices (
    id              SERIAL PRIMARY KEY,
    symbol          VARCHAR(20)        NOT NULL,
    asset_class     VARCHAR(20)        NOT NULL,
    price           DOUBLE PRECISION,
    change_24h_pct  DOUBLE PRECISION,
    volume_24h      DOUBLE PRECISION,
    timestamp       TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prices_symbol
    ON prices (symbol, timestamp DESC);

-- 3. Alerts
CREATE TABLE IF NOT EXISTS alerts (
    id              SERIAL PRIMARY KEY,
    alert_id        VARCHAR(64),
    alert_type      VARCHAR(50)        NOT NULL,
    severity        VARCHAR(20),
    symbol          VARCHAR(20),
    asset_class     VARCHAR(20),
    message         TEXT,
    detail          JSONB,
    timestamp       TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

-- 4. News
CREATE TABLE IF NOT EXISTS news (
    news_id         VARCHAR(255) PRIMARY KEY,
    title           TEXT,
    source          VARCHAR(100),
    url             TEXT,
    published_at    TIMESTAMPTZ,
    summary         TEXT,
    category        VARCHAR(50),
    created_at      TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

-- 5. Daily insight reports
CREATE TABLE IF NOT EXISTS daily_insights (
    id                  SERIAL PRIMARY KEY,
    report_date         DATE               NOT NULL,
    market_state        VARCHAR(20),
    summary             TEXT,
    content_json        JSONB,
    created_at          TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
    UNIQUE (report_date)
);
"""


def init_db() -> None:
    """Create all tables if they do not exist. Safe to call multiple times."""
    if not db_available():
        logger.info("Skipping DB init — no database configured.")
        return
    try:
        with engine.connect() as conn:
            for statement in _DDL.split(";"):
                stmt = statement.strip()
                if stmt:
                    conn.execute(text(stmt))
            conn.commit()
        logger.info("[Database] All tables initialised successfully.")
    except Exception as exc:
        logger.error(f"[Database] Error during init: {exc}")