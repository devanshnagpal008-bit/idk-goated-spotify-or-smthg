import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Query, Path
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.db.database import get_db
from app.db.models import PlaylistModel, PlaylistTrackModel, TrackModel
from app.schemas import PlaylistBase, TrackBase
from app.services.ytmusic_service import ytmusic_service

router = APIRouter(prefix="/playlists", tags=["Playlists"])

class PlaylistCreate(BaseModel):
    title: str
    description: Optional[str] = None

class PlaylistUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None

class AddTrackRequest(BaseModel):
    track: TrackBase

class ReorderRequest(BaseModel):
    from_position: int
    to_position: int

class ImportPlaylistRequest(BaseModel):
    title: str
    csv_data: Optional[str] = None # e.g. "Song, Artist\nSong2, Artist2"
    source_url: Optional[str] = None

@router.get("", response_model=List[PlaylistBase])
async def list_playlists(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PlaylistModel).order_by(PlaylistModel.updated_at.desc()))
    playlists = result.scalars().all()

    response: List[PlaylistBase] = []
    for p in playlists:
        # Get count
        tracks_res = await db.execute(
            select(PlaylistTrackModel).where(PlaylistTrackModel.playlist_id == p.id)
        )
        tracks = tracks_res.scalars().all()
        response.append(PlaylistBase(
            id=p.id,
            title=p.title,
            description=p.description,
            cover_url=p.cover_url,
            track_count=len(tracks),
            is_smart=p.is_smart,
            created_at=p.created_at.isoformat() if p.created_at else None,
            updated_at=p.updated_at.isoformat() if p.updated_at else None
        ))
    return response

@router.post("", response_model=PlaylistBase)
async def create_playlist(payload: PlaylistCreate, db: AsyncSession = Depends(get_db)):
    playlist_id = f"pl_{uuid.uuid4().hex[:10]}"
    playlist = PlaylistModel(
        id=playlist_id,
        title=payload.title,
        description=payload.description,
        cover_url="",
        is_smart=False,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(playlist)
    await db.commit()
    await db.refresh(playlist)

    return PlaylistBase(
        id=playlist.id,
        title=playlist.title,
        description=playlist.description,
        cover_url=playlist.cover_url,
        track_count=0,
        is_smart=False,
        tracks=[]
    )

@router.get("/{playlist_id}", response_model=PlaylistBase)
async def get_playlist(playlist_id: str = Path(...), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(PlaylistModel).where(PlaylistModel.id == playlist_id))
    playlist = res.scalars().first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")

    # Fetch ordered tracks
    tracks_res = await db.execute(
        select(PlaylistTrackModel, TrackModel)
        .join(TrackModel, PlaylistTrackModel.track_id == TrackModel.id)
        .where(PlaylistTrackModel.playlist_id == playlist_id)
        .order_by(PlaylistTrackModel.position)
    )
    items = tracks_res.all()

    tracks: List[TrackBase] = []
    for pt, t in items:
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

    return PlaylistBase(
        id=playlist.id,
        title=playlist.title,
        description=playlist.description,
        cover_url=playlist.cover_url or (tracks[0].thumbnail_url if tracks else ""),
        track_count=len(tracks),
        duration_seconds=sum(t.duration_seconds for t in tracks),
        is_smart=playlist.is_smart,
        tracks=tracks,
        created_at=playlist.created_at.isoformat() if playlist.created_at else None,
        updated_at=playlist.updated_at.isoformat() if playlist.updated_at else None
    )

@router.post("/{playlist_id}/tracks", response_model=PlaylistBase)
async def add_track_to_playlist(
    payload: AddTrackRequest,
    playlist_id: str = Path(...),
    db: AsyncSession = Depends(get_db)
):
    # Ensure track exists in tracks table
    t_data = payload.track
    track_res = await db.execute(select(TrackModel).where(TrackModel.id == t_data.id))
    existing_track = track_res.scalars().first()
    if not existing_track:
        new_track = TrackModel(
            id=t_data.id,
            title=t_data.title,
            artist_name=t_data.artist,
            artist_id=t_data.artist_id,
            album_name=t_data.album,
            duration_seconds=t_data.duration_seconds,
            thumbnail_url=t_data.thumbnail_url,
            is_explicit=t_data.is_explicit
        )
        db.add(new_track)
        await db.flush()

    # Determine next position
    count_res = await db.execute(
        select(PlaylistTrackModel).where(PlaylistTrackModel.playlist_id == playlist_id)
    )
    current_count = len(count_res.scalars().all())

    # Add association
    assoc = PlaylistTrackModel(
        playlist_id=playlist_id,
        track_id=t_data.id,
        position=current_count,
        added_at=datetime.utcnow()
    )
    db.add(assoc)

    # Update playlist timestamp & cover if first track
    pl_res = await db.execute(select(PlaylistModel).where(PlaylistModel.id == playlist_id))
    pl = pl_res.scalars().first()
    if pl:
        pl.updated_at = datetime.utcnow()
        if not pl.cover_url and t_data.thumbnail_url:
            pl.cover_url = t_data.thumbnail_url

    await db.commit()
    return await get_playlist(playlist_id, db)

@router.delete("/{playlist_id}/tracks/{track_id}", response_model=PlaylistBase)
async def remove_track_from_playlist(
    playlist_id: str = Path(...),
    track_id: str = Path(...),
    db: AsyncSession = Depends(get_db)
):
    await db.execute(
        delete(PlaylistTrackModel)
        .where(PlaylistTrackModel.playlist_id == playlist_id)
        .where(PlaylistTrackModel.track_id == track_id)
    )
    await db.commit()
    return await get_playlist(playlist_id, db)

@router.post("/{playlist_id}/duplicate", response_model=PlaylistBase)
async def duplicate_playlist(playlist_id: str = Path(...), db: AsyncSession = Depends(get_db)):
    original = await get_playlist(playlist_id, db)
    new_pl = await create_playlist(
        PlaylistCreate(title=f"{original.title} (Copy)", description=original.description),
        db
    )
    for track in (original.tracks or []):
        await add_track_to_playlist(AddTrackRequest(track=track), new_pl.id, db)
    return await get_playlist(new_pl.id, db)

@router.delete("/{playlist_id}")
async def delete_playlist(playlist_id: str = Path(...), db: AsyncSession = Depends(get_db)):
    await db.execute(delete(PlaylistModel).where(PlaylistModel.id == playlist_id))
    await db.commit()
    return {"status": "deleted", "id": playlist_id}

@router.get("/{playlist_id}/smart-add", response_model=List[TrackBase])
async def smart_add_suggestions(playlist_id: str = Path(...), db: AsyncSession = Depends(get_db)):
    pl = await get_playlist(playlist_id, db)
    tracks = pl.tracks or []
    if not tracks:
        # Fallback to general popular picks
        search_res = ytmusic_service.search("chill music", filter_type="songs", limit=10)
        return search_res.songs

    # Pick seed track from playlist
    seed_track = tracks[0]
    radio_tracks = ytmusic_service.get_radio_tracks(seed_track.source_id, limit=15)
    
    # Filter out tracks already in playlist
    existing_ids = {t.id for t in tracks}
    suggestions = [t for t in radio_tracks if t.id not in existing_ids][:8]
    return suggestions

@router.post("/import", response_model=PlaylistBase)
async def import_playlist(payload: ImportPlaylistRequest, db: AsyncSession = Depends(get_db)):
    new_pl = await create_playlist(
        PlaylistCreate(title=payload.title, description="Imported playlist"),
        db
    )

    matched_tracks: List[TrackBase] = []

    if payload.csv_data:
        # Parse CSV lines: "Title, Artist"
        lines = [line.strip() for line in payload.csv_data.split("\n") if line.strip()]
        for line in lines[:20]: # Limit for responsiveness
            parts = [p.strip() for p in line.split(",") if p.strip()]
            if not parts:
                continue
            query = f"{parts[0]} {parts[1]}" if len(parts) > 1 else parts[0]
            search_res = ytmusic_service.search(query, filter_type="songs", limit=1)
            if search_res.songs:
                matched_tracks.append(search_res.songs[0])

    for track in matched_tracks:
        await add_track_to_playlist(AddTrackRequest(track=track), new_pl.id, db)

    return await get_playlist(new_pl.id, db)


class GeneratePlaylistRequest(BaseModel):
    prompt: str
    title: Optional[str] = None

@router.post("/generate", response_model=PlaylistBase)
async def generate_ai_playlist(payload: GeneratePlaylistRequest, db: AsyncSession = Depends(get_db)):
    from app.services.ai_playlist_generator import ai_playlist_generator
    generated = ai_playlist_generator.generate_playlist_from_prompt(payload.prompt, payload.title)

    # Persist in SQLite
    new_pl = await create_playlist(
        PlaylistCreate(title=generated.title, description=generated.description),
        db
    )
    for track in (generated.tracks or []):
        await add_track_to_playlist(AddTrackRequest(track=track), new_pl.id, db)

    return await get_playlist(new_pl.id, db)
