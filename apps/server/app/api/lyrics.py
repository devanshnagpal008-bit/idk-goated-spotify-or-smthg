from typing import Optional
from fastapi import APIRouter, Query
from app.schemas import LyricsResponse
from app.services.lyrics_service import lyrics_service

router = APIRouter(prefix="/lyrics", tags=["Lyrics"])

@router.get("", response_model=LyricsResponse)
async def get_track_lyrics(
    title: str = Query(..., min_length=1),
    artist: str = Query(..., min_length=1),
    album: Optional[str] = Query(None),
    duration: Optional[int] = Query(None),
    video_id: Optional[str] = Query(None)
):
    return await lyrics_service.get_lyrics(
        title=title,
        artist=artist,
        album=album,
        duration_seconds=duration,
        video_id=video_id
    )
