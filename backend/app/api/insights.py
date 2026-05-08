"""Daily insight endpoints."""
from __future__ import annotations

from fastapi import APIRouter

from app.models.schemas import DailyInsight
from app.services.insight_service import insight_service

router = APIRouter(prefix="/api/insights", tags=["insights"])


@router.get("/daily", response_model=DailyInsight)
async def get_daily_insight():
    """Return the latest cached daily insight, building it on demand."""
    cached = insight_service.latest()
    if cached is not None:
        return cached
    return await insight_service.build()


@router.post("/daily/rebuild", response_model=DailyInsight)
async def rebuild_daily_insight():
    """Force-rebuild the daily insight (used by ops or scheduled jobs)."""
    return await insight_service.build()
