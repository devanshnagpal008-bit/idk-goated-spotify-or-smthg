import re
import logging
import httpx
from typing import List, Optional
from app.schemas import LyricsResponse, LyricsLine
from app.services.ytmusic_service import ytmusic_service

logger = logging.getLogger(__name__)

LRCLIB_API_URL = "https://lrclib.net/api/get"

class LyricsService:
    def _parse_lrc(self, lrc_text: str) -> List[LyricsLine]:
        """Parses LRC format '[mm:ss.xx] text' into structured timestamped lines."""
        lines: List[LyricsLine] = []
        pattern = re.compile(r"\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)")

        for raw_line in lrc_text.splitlines():
            match = pattern.match(raw_line.strip())
            if match:
                minutes = int(match.group(1))
                seconds = int(match.group(2))
                fraction_str = match.group(3) or "0"
                if len(fraction_str) == 2:
                    millis = int(fraction_str) * 10
                else:
                    millis = int(fraction_str[:3])

                total_ms = (minutes * 60 + seconds) * 1000 + millis
                text = match.group(4).strip()
                if text: # Skip empty spacing marks
                    lines.append(LyricsLine(time_ms=total_ms, text=text))

        return sorted(lines, key=lambda l: l.time_ms)

    async def get_lyrics(
        self,
        title: str,
        artist: str,
        album: Optional[str] = None,
        duration_seconds: Optional[int] = None,
        video_id: Optional[str] = None
    ) -> LyricsResponse:
        # Tier 1: Try LRCLIB for time-synced lyrics
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                params = {
                    "track_name": title,
                    "artist_name": artist,
                }
                if album:
                    params["album_name"] = album
                if duration_seconds:
                    params["duration"] = duration_seconds

                res = await client.get(LRCLIB_API_URL, params=params)
                if res.status_code == 200:
                    data = res.json()
                    synced_lrc = data.get("syncedLyrics")
                    if synced_lrc:
                        parsed_lines = self._parse_lrc(synced_lrc)
                        if parsed_lines:
                            return LyricsResponse(
                                is_synced=True,
                                lines=parsed_lines,
                                plain_lyrics=data.get("plainLyrics"),
                                provider="lrclib"
                            )
                    elif data.get("plainLyrics"):
                        return LyricsResponse(
                            is_synced=False,
                            lines=[],
                            plain_lyrics=data["plainLyrics"],
                            provider="lrclib"
                        )
        except Exception as e:
            logger.debug(f"LRCLIB lyrics lookup failed: {e}")

        # Tier 2: Try YouTube Music lyrics fallback
        if video_id:
            try:
                watch = ytmusic_service._yt.get_watch_playlist(videoId=video_id)
                lyrics_browse_id = watch.get("lyrics")
                if lyrics_browse_id:
                    yt_lyrics_data = ytmusic_service._yt.get_lyrics(lyrics_browse_id)
                    plain = yt_lyrics_data.get("lyrics", "")
                    if plain:
                        return LyricsResponse(
                            is_synced=False,
                            lines=[],
                            plain_lyrics=plain,
                            provider="ytmusic"
                        )
            except Exception as e:
                logger.debug(f"YouTube Music lyrics fallback failed: {e}")

        # Fallback: Clean placeholder
        return LyricsResponse(
            is_synced=False,
            lines=[],
            plain_lyrics=f"Instrumental or lyrics unavailable for {title} by {artist}.",
            provider="fallback"
        )

lyrics_service = LyricsService()
