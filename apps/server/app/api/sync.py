from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.core.config import settings
from app.schemas import TrackBase
from app.services.ytmusic_service import ytmusic_service
from app.api.library import toggle_like, LikeToggleRequest
from app.api.playlists import create_playlist, add_track_to_playlist, PlaylistCreate, AddTrackRequest

router = APIRouter(prefix="/sync", tags=["YouTube Account Sync"])

@router.get("/status")
async def check_sync_status():
    has_cookies = settings.COOKIES_PATH.exists()
    return {
        "authenticated": has_cookies,
        "cookie_file": str(settings.COOKIES_PATH),
        "aac_256_unlocked": has_cookies
    }

@router.post("/likes")
async def sync_youtube_likes(db: AsyncSession = Depends(get_db)):
    if not settings.COOKIES_PATH.exists():
        return {
            "status": "skipped",
            "message": "cookies.txt not found in data/. Drop your exported YouTube cookies into data/cookies.txt to sync personal likes."
        }

    try:
        liked_data = ytmusic_service._yt.get_liked_songs(limit=50)
        tracks = liked_data.get("tracks", [])
        synced_count = 0
        for item in tracks:
            track = ytmusic_service._parse_track(item)
            if track:
                await toggle_like(LikeToggleRequest(track=track), db)
                synced_count += 1
        return {"status": "synced", "count": synced_count}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/playlists")
async def sync_youtube_playlists(db: AsyncSession = Depends(get_db)):
    if not settings.COOKIES_PATH.exists():
        return {
            "status": "skipped",
            "message": "cookies.txt not found in data/. Drop your exported YouTube cookies into data/cookies.txt to sync personal playlists."
        }

    try:
        library_pls = ytmusic_service._yt.get_library_playlists(limit=25)
        synced_count = 0
        for p in library_pls:
            title = p.get("title", "Imported Playlist")
            browse_id = p.get("playlistId")
            if browse_id:
                pl_details = ytmusic_service._yt.get_playlist(browse_id, limit=30)
                new_pl = await create_playlist(
                    PlaylistCreate(title=title, description=pl_details.get("description")),
                    db
                )
                for item in pl_details.get("tracks", []):
                    track = ytmusic_service._parse_track(item)
                    if track:
                        await add_track_to_playlist(AddTrackRequest(track=track), new_pl.id, db)
                synced_count += 1
        return {"status": "synced", "playlists_count": synced_count}
    except Exception as e:
        return {"status": "error", "message": str(e)}
