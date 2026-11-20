import time
import logging
import urllib.parse
from typing import Optional, Dict, Any
import yt_dlp
from cachetools import TTLCache
from app.schemas import AudioStreamMetadata, AudioCodec
from app.core.config import settings

logger = logging.getLogger(__name__)

class StreamResolverService:
    def __init__(self):
        # In-memory cache holding AudioStreamMetadata with TTL
        self._memory_cache: TTLCache = TTLCache(maxsize=1000, ttl=18000) # 5 hours TTL

    def _get_ydl_options(self, quality: str = "high") -> Dict[str, Any]:
        if quality == "saver":
            fmt = "250/249/139/worstaudio[ext=m4a]/worstaudio/bestaudio"
        elif quality == "standard":
            fmt = "251/140/bestaudio[ext=m4a]/bestaudio[acodec=opus]/bestaudio/best"
        else:  # high (256k AAC / 160k Opus / highest available)
            fmt = "141/251/140/bestaudio[ext=m4a]/bestaudio[acodec=opus]/bestaudio/best"

        opts: Dict[str, Any] = {
            'format': fmt,
            'quiet': True,
            'no_warnings': True,
            'noplaylist': True,
            'extract_flat': False,
            'socket_timeout': 15,
        }
        
        # Include cookies if present
        if settings.COOKIES_PATH.exists():
            opts['cookiefile'] = str(settings.COOKIES_PATH)
            logger.info(f"Using cookies from {settings.COOKIES_PATH} for stream resolution")
            
        return opts

    def _extract_expiration(self, stream_url: str) -> Optional[int]:
        try:
            parsed = urllib.parse.urlparse(stream_url)
            params = urllib.parse.parse_qs(parsed.query)
            expire_val = params.get("expire", [None])[0]
            if expire_val:
                return int(expire_val)
        except Exception as e:
            logger.debug(f"Could not parse expiration timestamp from URL: {e}")
        return None

    def _determine_codec_and_label(self, format_info: Dict[str, Any]) -> tuple[AudioCodec, int, str]:
        acodec = str(format_info.get("acodec", "")).lower()
        ext = str(format_info.get("ext", "")).lower()
        abr = format_info.get("abr") or 0
        try:
            abr_int = int(round(float(abr)))
        except Exception:
            abr_int = 128

        codec: AudioCodec = "aac"
        label = "AAC"

        if "mp4a" in acodec or ext == "m4a" or "aac" in acodec:
            codec = "aac"
            if abr_int >= 240:
                label = f"AAC 256 kbps"
                abr_int = 256
            elif abr_int >= 120:
                label = f"AAC {abr_int} kbps"
            else:
                label = f"AAC 128 kbps"
                abr_int = 128
        elif "opus" in acodec or ext == "webm":
            codec = "opus"
            if abr_int >= 150:
                label = f"Opus ~160 kbps"
                abr_int = 160
            else:
                label = f"Opus {abr_int} kbps"
        elif "flac" in acodec or ext == "flac":
            codec = "flac"
            label = "Lossless FLAC"
        elif "mp3" in acodec or ext == "mp3":
            codec = "mp3"
            label = f"MP3 {abr_int} kbps"
        else:
            codec = "aac"
            label = f"AAC {abr_int} kbps"

        return codec, abr_int, label

    def resolve_stream(self, video_id: str, force_refresh: bool = False, quality: str = "high") -> Optional[AudioStreamMetadata]:
        now = int(time.time())
        cache_key = f"{video_id}_{quality}"

        # Check in-memory cache
        if not force_refresh and cache_key in self._memory_cache:
            cached_meta: AudioStreamMetadata = self._memory_cache[cache_key]
            # Verify expiry with 15-minute buffer
            if cached_meta.expires_at is None or cached_meta.expires_at > (now + 900):
                return cached_meta

        youtube_url = f"https://www.youtube.com/watch?v={video_id}"
        ydl_opts = self._get_ydl_options(quality=quality)

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(youtube_url, download=False)
                if not info:
                    logger.error(f"yt-dlp returned empty info for {video_id}")
                    return None

                stream_url = info.get("url")
                if not stream_url:
                    logger.error(f"yt-dlp could not find stream URL for {video_id}")
                    return None

                codec, bitrate_kbps, label = self._determine_codec_and_label(info)
                expires_at = self._extract_expiration(stream_url)
                loudness_db = info.get("loudness_db")

                metadata = AudioStreamMetadata(
                    codec=codec,
                    bitrate_kbps=bitrate_kbps,
                    is_lossless=False,
                    label=label,
                    stream_url=stream_url,
                    expires_at=expires_at,
                    loudness_db=loudness_db
                )

                self._memory_cache[cache_key] = metadata
                return metadata

        except Exception as e:
            logger.error(f"Failed to resolve audio stream for video {video_id}: {e}")
            return None

stream_resolver = StreamResolverService()
