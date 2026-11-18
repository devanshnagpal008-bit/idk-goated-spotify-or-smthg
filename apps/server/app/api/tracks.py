from fastapi import APIRouter, Path, HTTPException
from app.schemas import TrackBase
from app.services.ytmusic_service import ytmusic_service

router = APIRouter(prefix="/tracks", tags=["Tracks"])

@router.get("/{track_id}", response_model=TrackBase)
async def get_track_details(
    track_id: str = Path(..., description="Track ID (e.g. yt_videoID)")
):
    video_id = track_id.replace("yt_", "") if track_id.startswith("yt_") else track_id
    track = ytmusic_service.get_track(video_id)
    if not track:
        raise HTTPException(status_code=404, detail=f"Track '{track_id}' not found")
    return track
