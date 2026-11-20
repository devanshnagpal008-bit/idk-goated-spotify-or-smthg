from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Path
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.db.database import get_db
from app.db.models import LikeModel, PlayEventModel, TrackModel
from app.schemas import TrackBase, PlayEventCreate, TopChartsResponse
from app.services.recommendation_engine import recommendation_engine

router = APIRouter(prefix="/library", tags=["Library"])

class LikeToggleRequest(BaseModel):
    track: TrackBase

class SessionState(BaseModel):
    current_track: Optional[TrackBase] = None
    queue: List[TrackBase] = []
    position_millis: int = 0

_active_session: SessionState = SessionState()

@router.get("/likes", response_model=List[TrackBase])
async def get_liked_tracks(db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(LikeModel, TrackModel)
        .join(TrackModel, LikeModel.track_id == TrackModel.id)
        .order_by(LikeModel.created_at.desc())
    )
    items = res.all()
    tracks: List[TrackBase] = []
    for _, t in items:
        tracks.append(TrackBase(
            id=t.id,
            title=t.title,
            artist=t.artist_name,
            artist_id=t.artist_id,
            album=t.album_name,
            duration_seconds=t.duration_seconds,
            thumbnail_url=t.thumbnail_url or "",
            provider="ytmusic" if not t.id.startswith("local_") else "local",
            source_id=t.id.replace("yt_", "").replace("local_", "")
        ))
    return tracks

@router.post("/likes")
async def toggle_like(payload: LikeToggleRequest, db: AsyncSession = Depends(get_db)):
    t_data = payload.track
    # Check if exists
    res = await db.execute(select(LikeModel).where(LikeModel.track_id == t_data.id))
    existing_like = res.scalars().first()

    if existing_like:
        await db.execute(delete(LikeModel).where(LikeModel.track_id == t_data.id))
        await db.commit()
        return {"liked": False, "track_id": t_data.id}
    else:
        # Ensure track in DB
        track_res = await db.execute(select(TrackModel).where(TrackModel.id == t_data.id))
        if not track_res.scalars().first():
            db.add(TrackModel(
                id=t_data.id,
                title=t_data.title,
                artist_name=t_data.artist,
                artist_id=t_data.artist_id,
                album_name=t_data.album,
                duration_seconds=t_data.duration_seconds,
                thumbnail_url=t_data.thumbnail_url
            ))
            await db.flush()

        db.add(LikeModel(track_id=t_data.id, created_at=datetime.utcnow()))
        await db.commit()
        return {"liked": True, "track_id": t_data.id}

@router.post("/events")
async def log_play_event(event: PlayEventCreate, db: AsyncSession = Depends(get_db)):
    # Verify track exists in db before foreign key insertion
    track_res = await db.execute(select(TrackModel).where(TrackModel.id == event.track_id))
    existing_track = track_res.scalars().first()
    if not existing_track:
        db.add(TrackModel(
            id=event.track_id,
            title=event.title or "Track",
            artist_name=event.artist or "Artist",
            thumbnail_url=event.thumbnail_url or "",
            duration_seconds=event.duration_ms // 1000 if event.duration_ms else 180
        ))
        await db.flush()
    elif event.title and existing_track.title in ("Track", ""):
        existing_track.title = event.title
        if event.artist:
            existing_track.artist_name = event.artist
        if event.thumbnail_url:
            existing_track.thumbnail_url = event.thumbnail_url
        await db.flush()

    new_event = PlayEventModel(
        track_id=event.track_id,
        event_type=event.event_type,
        position_ms=event.position_ms,
        duration_ms=event.duration_ms,
        timestamp=datetime.utcnow()
    )
    db.add(new_event)
    await db.commit()
    return {"status": "logged", "event": event.event_type}

@router.get("/history", response_model=List[TrackBase])
async def get_listening_history(db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(PlayEventModel, TrackModel)
        .join(TrackModel, PlayEventModel.track_id == TrackModel.id)
        .order_by(PlayEventModel.timestamp.desc())
        .limit(100)
    )
    items = res.all()
    seen = set()
    history: List[TrackBase] = []
    for _, t in items:
        if t.id not in seen:
            seen.add(t.id)
            history.append(TrackBase(
                id=t.id,
                title=t.title,
                artist=t.artist_name,
                duration_seconds=t.duration_seconds,
                thumbnail_url=t.thumbnail_url or "",
                provider="ytmusic" if not t.id.startswith("local_") else "local",
                source_id=t.id.replace("yt_", "").replace("local_", "")
            ))
            if len(history) >= 20:
                break
    return history

@router.get("/top-charts", response_model=TopChartsResponse)
async def get_top_charts(db: AsyncSession = Depends(get_db)):
    return await recommendation_engine.compute_top_charts(db)

@router.post("/session")
async def save_session(session: SessionState):
    global _active_session
    _active_session = session
    return {"status": "saved"}

@router.get("/session", response_model=SessionState)
async def get_session():
    return _active_session
