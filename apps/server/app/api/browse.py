from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.schemas import HomeFeedResponse
from app.services.ytmusic_service import ytmusic_service
from app.services.recommendation_engine import recommendation_engine
from app.api.library import get_listening_history

router = APIRouter(prefix="/browse", tags=["Browse"])

@router.get("/home", response_model=HomeFeedResponse)
async def get_home_feed(db: AsyncSession = Depends(get_db)):
    # 1. Base explore feed
    base_feed = ytmusic_service.get_home_feed()

    # 2. Personalized jump back in from listening history
    history = await get_listening_history(db)
    jump_back_in = history[:8] if history else base_feed.quick_picks[:5]

    # 3. Dynamic Daily Mixes 1-4
    daily_mixes = await recommendation_engine.generate_daily_mixes(db)

    return HomeFeedResponse(
        jump_back_in=jump_back_in,
        made_for_you=daily_mixes[:2],
        daily_mixes=daily_mixes,
        quick_picks=base_feed.quick_picks,
        new_releases=base_feed.new_releases
    )
