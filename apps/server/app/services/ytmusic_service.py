import re
import logging
from typing import List, Optional, Dict, Any
from ytmusicapi import YTMusic
from cachetools import TTLCache
from app.schemas import TrackBase, AlbumBase, ArtistBase, PlaylistBase, SearchResultResponse, HomeFeedResponse
from app.core.config import settings

logger = logging.getLogger(__name__)

class YTMusicService:
    def __init__(self):
        self._cache = TTLCache(maxsize=500, ttl=300) # 5 min TTL cache for searches & home
        self._yt: Optional[YTMusic] = None
        self._init_client()

    def _init_client(self):
        try:
            if settings.COOKIES_PATH.exists():
                logger.info(f"Initializing YTMusic with cookies from {settings.COOKIES_PATH}")
                self._yt = YTMusic(auth=str(settings.COOKIES_PATH))
            else:
                self._yt = YTMusic()
        except Exception as e:
            logger.warning(f"Error initializing YTMusic with cookies: {e}. Falling back to unauthenticated client.")
            self._yt = YTMusic()

    def _upgrade_thumbnail_resolution(self, url: str, quality: Optional[str] = None) -> str:
        if not url:
            return ""

        target_quality = quality or getattr(settings, "COVER_ART_QUALITY", "1440p")
        dim = "1440"
        if target_quality in ("4k", "2160p"):
            dim = "2160"
        elif target_quality == "1080p":
            dim = "1080"

        # 1. Google User Content (YouTube Music album/track/artist/playlist artwork)
        if "googleusercontent.com" in url or "ggpht.com" in url:
            if re.search(r'=[sw]\d+', url):
                return re.sub(r'=w\d+-h\d+.*|=s\d+.*', f'=w{dim}-h{dim}-l90-rj', url)
            else:
                return f"{url}=w{dim}-h{dim}-l90-rj"

        # 2. YouTube Video Thumbnails (i.ytimg.com)
        if "ytimg.com" in url:
            # Upgrade standard/hq default to 1080p maxresdefault
            match = re.search(r'/vi/([^/]+)/', url)
            if match:
                video_id = match.group(1)
                return f"https://i.ytimg.com/vi/{video_id}/maxresdefault.jpg"
            return re.sub(r'/(hq|mq|sd|default)\.jpg.*', '/maxresdefault.jpg', url)

        return url

    def _extract_best_thumbnail(self, thumbnails: List[Dict[str, Any]], quality: Optional[str] = None) -> str:
        if not thumbnails:
            return ""
        # Return thumbnail with highest width/height upgraded to ultra-high resolution (1080p / 1440p / 4K)
        sorted_thumbs = sorted(thumbnails, key=lambda t: t.get("width", 0), reverse=True)
        raw_url = sorted_thumbs[0].get("url", "")
        return self._upgrade_thumbnail_resolution(raw_url, quality=quality)

    def _parse_track(self, item: Dict[str, Any]) -> Optional[TrackBase]:
        video_id = item.get("videoId")
        if not video_id:
            return None

        title = item.get("title", "Unknown Title")
        
        # Parse artist(s)
        artists = item.get("artists", [])
        artist_name = "Unknown Artist"
        artist_id = None
        if isinstance(artists, list) and artists:
            artist_name = ", ".join([a.get("name", "") for a in artists if isinstance(a, dict) and a.get("name")])
            artist_id = artists[0].get("id") if isinstance(artists[0], dict) else None
        elif isinstance(artists, str):
            artist_name = artists

        # Parse album
        album_data = item.get("album")
        album_name = None
        album_id = None
        if isinstance(album_data, dict):
            album_name = album_data.get("name")
            album_id = album_data.get("id")
        elif isinstance(album_data, str):
            album_name = album_data

        # Duration
        duration_sec = item.get("duration_seconds", 0)
        if not duration_sec and "duration" in item and item["duration"]:
            try:
                parts = str(item["duration"]).split(":")
                if len(parts) == 2:
                    duration_sec = int(parts[0]) * 60 + int(parts[1])
                elif len(parts) == 3:
                    duration_sec = int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
            except Exception:
                duration_sec = 0

        # Thumbnails
        thumbs = item.get("thumbnails", []) or item.get("thumbnail", [])
        if isinstance(thumbs, dict):
            thumbs = [thumbs]
        thumbnail_url = self._extract_best_thumbnail(thumbs)

        return TrackBase(
            id=f"yt_{video_id}",
            title=title,
            artist=artist_name,
            artist_id=artist_id,
            album=album_name,
            album_id=album_id,
            duration_seconds=duration_sec,
            thumbnail_url=thumbnail_url,
            is_explicit=bool(item.get("isExplicit", False)),
            provider="ytmusic",
            source_id=video_id
        )

    def search(self, query: str, filter_type: Optional[str] = None, limit: int = 20) -> SearchResultResponse:
        cache_key = f"search_{query}_{filter_type}_{limit}"
        if cache_key in self._cache:
            return self._cache[cache_key]

        songs: List[TrackBase] = []
        albums: List[AlbumBase] = []
        artists: List[ArtistBase] = []
        playlists: List[PlaylistBase] = []
        videos: List[TrackBase] = []

        try:
            if filter_type in ["songs", "albums", "artists", "playlists", "videos"]:
                raw_results = self._yt.search(query, filter=filter_type, limit=limit)
                for item in raw_results:
                    result_type = item.get("resultType")
                    if result_type == "song":
                        t = self._parse_track(item)
                        if t: songs.append(t)
                    elif result_type == "video":
                        t = self._parse_track(item)
                        if t: videos.append(t)
                    elif result_type == "album":
                        albums.append(AlbumBase(
                            id=item.get("browseId", ""),
                            title=item.get("title", ""),
                            artist=item.get("artists", [{}])[0].get("name", "") if item.get("artists") else "",
                            thumbnail_url=self._extract_best_thumbnail(item.get("thumbnails", [])),
                            year=str(item.get("year", "")) if item.get("year") else None
                        ))
                    elif result_type == "artist":
                        artists.append(ArtistBase(
                            id=item.get("browseId", ""),
                            name=item.get("artist", item.get("title", "")),
                            thumbnail_url=self._extract_best_thumbnail(item.get("thumbnails", []))
                        ))
                    elif result_type == "playlist":
                        playlists.append(PlaylistBase(
                            id=item.get("browseId", ""),
                            title=item.get("title", ""),
                            description=item.get("itemCount", ""),
                            cover_url=self._extract_best_thumbnail(item.get("thumbnails", [])),
                            track_count=0
                        ))
            else:
                # Unified multi-category search
                raw_songs = self._yt.search(query, filter="songs", limit=min(limit, 10))
                for item in raw_songs:
                    t = self._parse_track(item)
                    if t: songs.append(t)

                raw_albums = self._yt.search(query, filter="albums", limit=min(limit, 5))
                for item in raw_albums:
                    albums.append(AlbumBase(
                        id=item.get("browseId", ""),
                        title=item.get("title", ""),
                        artist=item.get("artists", [{}])[0].get("name", "") if item.get("artists") else "",
                        thumbnail_url=self._extract_best_thumbnail(item.get("thumbnails", [])),
                        year=str(item.get("year", "")) if item.get("year") else None
                    ))

                raw_artists = self._yt.search(query, filter="artists", limit=min(limit, 5))
                for item in raw_artists:
                    artists.append(ArtistBase(
                        id=item.get("browseId", ""),
                        name=item.get("artist", item.get("title", "")),
                        thumbnail_url=self._extract_best_thumbnail(item.get("thumbnails", []))
                    ))

                raw_playlists = self._yt.search(query, filter="playlists", limit=min(limit, 5))
                for item in raw_playlists:
                    playlists.append(PlaylistBase(
                        id=item.get("browseId", ""),
                        title=item.get("title", ""),
                        cover_url=self._extract_best_thumbnail(item.get("thumbnails", [])),
                        track_count=0
                    ))

        except Exception as e:
            logger.error(f"Error executing ytmusic search for query '{query}': {e}")

        result = SearchResultResponse(
            query=query,
            songs=songs,
            albums=albums,
            artists=artists,
            playlists=playlists,
            videos=videos
        )
        self._cache[cache_key] = result
        return result

    def get_track(self, video_id: str) -> Optional[TrackBase]:
        try:
            song_data = self._yt.get_song(video_id)
            video_details = song_data.get("videoDetails", {})
            thumbs = video_details.get("thumbnail", {}).get("thumbnails", [])
            return TrackBase(
                id=f"yt_{video_id}",
                title=video_details.get("title", "Unknown Title"),
                artist=video_details.get("author", "Unknown Artist"),
                duration_seconds=int(video_details.get("lengthSeconds", 0)),
                thumbnail_url=self._extract_best_thumbnail(thumbs),
                provider="ytmusic",
                source_id=video_id
            )
        except Exception as e:
            logger.error(f"Error fetching track {video_id}: {e}")
            return None

    def get_radio_tracks(self, video_id: str, limit: int = 25) -> List[TrackBase]:
        tracks: List[TrackBase] = []
        try:
            watch = self._yt.get_watch_playlist(videoId=video_id, limit=limit)
            for item in watch.get("tracks", []):
                t = self._parse_track(item)
                if t:
                    tracks.append(t)
        except Exception as e:
            logger.error(f"Error fetching watch playlist radio for {video_id}: {e}")
        return tracks

    def get_home_feed(self) -> HomeFeedResponse:
        cache_key = "home_feed"
        if cache_key in self._cache:
            return self._cache[cache_key]

        quick_picks: List[TrackBase] = []
        made_for_you: List[PlaylistBase] = []
        new_releases: List[AlbumBase] = []

        try:
            # Quick picks from search or charts
            explore = self._yt.get_charts(country="US")
            for item in explore.get("videos", {}).get("items", [])[:10]:
                t = self._parse_track(item)
                if t: quick_picks.append(t)
        except Exception as e:
            logger.warning(f"Error fetching charts for home: {e}")

        # If quick picks empty, provide a fallback popular seed
        if not quick_picks:
            search_fallback = self.search("top hits 2026", filter_type="songs", limit=10)
            quick_picks = search_fallback.songs

        feed = HomeFeedResponse(
            jump_back_in=[],
            made_for_you=made_for_you,
            daily_mixes=[],
            quick_picks=quick_picks,
            new_releases=new_releases
        )
        self._cache[cache_key] = feed
        return feed

ytmusic_service = YTMusicService()
