from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.database import Base

class TrackModel(Base):
    __tablename__ = "tracks"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    artist_name = Column(String, nullable=False, index=True)
    artist_id = Column(String, nullable=True)
    album_name = Column(String, nullable=True)
    album_id = Column(String, nullable=True)
    duration_seconds = Column(Integer, default=0)
    thumbnail_url = Column(String, nullable=True)
    is_explicit = Column(Boolean, default=False)
    loudness_db = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    sources = relationship("TrackSourceModel", back_populates="track", cascade="all, delete-orphan")
    playlist_associations = relationship("PlaylistTrackModel", back_populates="track", cascade="all, delete-orphan")
    play_events = relationship("PlayEventModel", back_populates="track", cascade="all, delete-orphan")
    likes = relationship("LikeModel", back_populates="track", cascade="all, delete-orphan")

class TrackSourceModel(Base):
    __tablename__ = "track_sources"

    id = Column(Integer, primary_key=True, autoincrement=True)
    track_id = Column(String, ForeignKey("tracks.id", ondelete="CASCADE"), nullable=False, index=True)
    provider = Column(String, nullable=False, default="ytmusic") # 'ytmusic' | 'local'
    source_id = Column(String, nullable=False, index=True) # YouTube videoId or local file path
    codec = Column(String, nullable=True) # 'aac', 'opus', 'flac', 'mp3'
    bitrate_kbps = Column(Integer, nullable=True)
    is_lossless = Column(Boolean, default=False)

    track = relationship("TrackModel", back_populates="sources")

class PlaylistModel(Base):
    __tablename__ = "playlists"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    cover_url = Column(String, nullable=True)
    is_smart = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tracks = relationship("PlaylistTrackModel", back_populates="playlist", cascade="all, delete-orphan", order_by="PlaylistTrackModel.position")

class PlaylistTrackModel(Base):
    __tablename__ = "playlist_tracks"

    playlist_id = Column(String, ForeignKey("playlists.id", ondelete="CASCADE"), primary_key=True)
    track_id = Column(String, ForeignKey("tracks.id", ondelete="CASCADE"), primary_key=True)
    position = Column(Integer, nullable=False, default=0)
    added_at = Column(DateTime, default=datetime.utcnow)

    playlist = relationship("PlaylistModel", back_populates="tracks")
    track = relationship("TrackModel", back_populates="playlist_associations")

class LikeModel(Base):
    __tablename__ = "likes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    track_id = Column(String, ForeignKey("tracks.id", ondelete="CASCADE"), unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    track = relationship("TrackModel", back_populates="likes")

class PlayEventModel(Base):
    __tablename__ = "play_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    track_id = Column(String, ForeignKey("tracks.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String, nullable=False) # 'start', 'progress_30s', 'complete', 'skip'
    position_ms = Column(Integer, default=0)
    duration_ms = Column(Integer, default=0)
    timestamp = Column(DateTime, default=datetime.utcnow)

    track = relationship("TrackModel", back_populates="play_events")

class TasteProfileModel(Base):
    __tablename__ = "taste_profiles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    artist_scores_json = Column(Text, default="{}")
    genre_scores_json = Column(Text, default="{}")
    total_plays = Column(Integer, default=0)
    last_updated = Column(DateTime, default=datetime.utcnow)

class StreamCacheModel(Base):
    __tablename__ = "stream_url_cache"

    source_id = Column(String, primary_key=True, index=True)
    resolved_url = Column(Text, nullable=False)
    codec = Column(String, nullable=False)
    bitrate_kbps = Column(Integer, nullable=False)
    is_lossless = Column(Boolean, default=False)
    label = Column(String, nullable=False)
    loudness_db = Column(Float, nullable=True)
    expires_at = Column(Integer, nullable=False) # Unix epoch timestamp
    created_at = Column(DateTime, default=datetime.utcnow)
