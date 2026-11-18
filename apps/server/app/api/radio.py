from typing import List
from fastapi import APIRouter, Path, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.schemas import TrackBase
from app.services.ytmusic_service import ytmusic_service
from app.services.recommendation_engine import recommendation_engine

router = APIRouter(prefix="/radio", tags=["Radio"])

@router.get("/{track_id}", response_model=List[TrackBase])
async def get_radio_for_track(
    track_id: str = Path(..., description="Track ID (e.g. yt_videoID)"),
    limit: int = Query(25, ge=5, le=50),
    db: AsyncSession = Depends(get_db)
):
    video_id = track_id.replace("yt_", "").replace("local_", "")
    raw_tracks = ytmusic_service.get_radio_tracks(video_id=video_id, limit=limit)
    # Personalized re-ranking with user taste profile
    reranked = await recommendation_engine.rerank_radio_tracks(raw_tracks, db)
    return reranked
