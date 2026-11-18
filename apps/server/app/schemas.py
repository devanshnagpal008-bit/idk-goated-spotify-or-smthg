from typing import Optional, List, Literal
from pydantic import BaseModel, Field

MusicProvider = Literal['ytmusic', 'local']
AudioCodec = Literal['aac', 'opus', 'flac', 'alac', 'mp3', 'vorbis']

class AudioStreamMetadata(BaseModel):
    codec: AudioCodec
    bitrate_kbps: int
    is_lossless: bool
    label: str
    stream_url: str
    expires_at: Optional[int] = None
    loudness_db: Optional[float] = None

class TrackBase(BaseModel):
    id: str
    title: str
    artist: str
    artist_id: Optional[str] = None
    album: Optional[str] = None
    album_id: Optional[str] = None
    duration_seconds: int = 0
    thumbnail_url: str = ""
    is_explicit: bool = False
    provider: MusicProvider = "ytmusic"
    source_id: str
    loudness_db: Optional[float] = None

class AlbumBase(BaseModel):
    id: str
    title: str
    artist: str
    artist_id: Optional[str] = None
    thumbnail_url: str = ""
    year: Optional[str] = None
    track_count: Optional[int] = None
    tracks: Optional[List[TrackBase]] = None

class ArtistBase(BaseModel):
    id: str
    name: str
    thumbnail_url: Optional[str] = None
    subscriber_count: Optional[str] = None
    top_songs: Optional[List[TrackBase]] = None
    albums: Optional[List[AlbumBase]] = None

class PlaylistBase(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    cover_url: Optional[str] = None
    track_count: int = 0
    duration_seconds: Optional[int] = None
    is_smart: bool = False
    tracks: Optional[List[TrackBase]] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class SearchResultResponse(BaseModel):
    query: str
    songs: List[TrackBase] = Field(default_factory=list)
    albums: List[AlbumBase] = Field(default_factory=list)
    artists: List[ArtistBase] = Field(default_factory=list)
    playlists: List[PlaylistBase] = Field(default_factory=list)
    videos: List[TrackBase] = Field(default_factory=list)

class HomeFeedResponse(BaseModel):
    jump_back_in: List[TrackBase] = Field(default_factory=list)
    made_for_you: List[PlaylistBase] = Field(default_factory=list)
    daily_mixes: List[PlaylistBase] = Field(default_factory=list)
    quick_picks: List[TrackBase] = Field(default_factory=list)
    new_releases: List[AlbumBase] = Field(default_factory=list)

class LyricsLine(BaseModel):
    time_ms: int
    text: str

class LyricsResponse(BaseModel):
    is_synced: bool
    lines: List[LyricsLine] = Field(default_factory=list)
    plain_lyrics: Optional[str] = None
    provider: str = "ytmusic"

class PlayEventCreate(BaseModel):
    track_id: str
    event_type: Literal['start', 'progress_30s', 'complete', 'skip', 'like']
    position_ms: int = 0
    duration_ms: int = 0
