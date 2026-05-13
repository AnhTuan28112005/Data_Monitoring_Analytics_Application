from fastapi import APIRouter

from app.models.schemas import EnhancedDailyInsight
from app.services.insight_service import insight_service

router = APIRouter(
    prefix="/api/insights",
    tags=["insights"],
)


@router.get(
    "/daily",
    response_model=EnhancedDailyInsight,
)
async def get_daily_insight():

    data = await insight_service.latest_enhanced()

    return data


@router.post(
    "/daily/rebuild",
    response_model=EnhancedDailyInsight,
)
async def rebuild_daily_insight():

    await insight_service.build()

    return await insight_service.latest_enhanced()


