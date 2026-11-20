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

    # 2. Personalized recently played (last 20 unique tracks)
    history = await get_listening_history(db)
    recently_played = history[:20] if history else []

    # 3. Dynamic Daily Mixes 1-4
    daily_mixes = await recommendation_engine.generate_daily_mixes(db)

    # 4. Personalized Recommendations based on user's affinity
    recommended = await recommendation_engine.get_recommended_tracks(db, limit=15)

    # 5. Top Charts of favorite artists & genres
    top_charts = await recommendation_engine.compute_top_charts(db)

    return HomeFeedResponse(
        recently_played=recently_played,
        recommended_for_you=recommended,
        jump_back_in=recently_played[:8] if recently_played else base_feed.quick_picks[:5],
        made_for_you=daily_mixes[:2],
        daily_mixes=daily_mixes,
        quick_picks=base_feed.quick_picks,
        new_releases=base_feed.new_releases,
        top_charts=top_charts
    )
