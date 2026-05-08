"""FastAPI application entrypoint for the World Monitor backend."""
from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.api import alerts as alerts_api
from app.api import analytics as analytics_api
from app.api import insights as insights_api
from app.api import market as market_api
from app.api import export as export_api # Import router xuất dữ liệu
from app.api import portfolio as portfolio_api
from app.api import websockets as ws_api
from app.core.database import init_db # Import hàm khởi tạo bảng
from app.core.config import settings
from app.core.logging import configure_logging
from app.services.background import (
    insight_loop,
    news_loop,
    pattern_loop,
    price_loop,
)


_BACKGROUND_TASKS: list[asyncio.Task] = []

init_db() # Khởi tạo bảng trong database nếu chưa tồn tại
@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    logger.info(f"Starting {settings.APP_NAME} on {settings.HOST}:{settings.PORT}")

    # Kick off background loops
    loop = asyncio.get_running_loop()
    _BACKGROUND_TASKS.extend([
        loop.create_task(price_loop()),
        loop.create_task(pattern_loop()),
        loop.create_task(news_loop()),
        loop.create_task(insight_loop()),
    ])
    try:
        yield
    finally:
        logger.info("Shutting down — cancelling background tasks.")
        for t in _BACKGROUND_TASKS:
            t.cancel()
        for t in _BACKGROUND_TASKS:
            try:
                await t
            except (asyncio.CancelledError, Exception):
                pass


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Real-time market monitoring & analytics backend.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(export_api.router) # Đăng ký endpoint /api/export
# Routers
app.include_router(market_api.router)
app.include_router(alerts_api.router)
app.include_router(insights_api.router)
app.include_router(analytics_api.router)
app.include_router(portfolio_api.router)
app.include_router(ws_api.router)


@app.get("/", tags=["meta"])
async def root():
    return {
        "name": settings.APP_NAME,
        "version": "1.0.0",
        "endpoints": {
            "rest_market": "/api/market/...",
            "rest_alerts": "/api/alerts/recent",
            "rest_news": "/api/news",
            "rest_insights": "/api/insights/daily",
            "rest_analytics": "/api/analytics/...",
            "rest_portfolio": "/api/portfolio/value",
            "ws_market": "/ws/market",
            "ws_alerts": "/ws/alerts",
            "sse_alerts": "/sse/alerts",
            "docs": "/docs",
        },
    }


@app.get("/health", tags=["meta"])
async def health():
    return {"status": "ok"}
