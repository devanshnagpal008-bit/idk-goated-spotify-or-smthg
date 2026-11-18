import os
import hashlib
import logging
from pathlib import Path
from typing import List, Optional, Dict, Any
from mutagen import File as MutagenFile
from app.schemas import TrackBase, AudioStreamMetadata
from app.core.config import settings

logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {".flac", ".m4a", ".mp3", ".wav", ".ogg", ".alac"}

class LocalAudioScannerService:
    def __init__(self):
        self._indexed_tracks: Dict[str, Dict[str, Any]] = {}

    def _generate_track_id(self, file_path: str) -> str:
        return f"local_{hashlib.md5(file_path.encode('utf-8')).hexdigest()[:12]}"

    def scan_directories(self, extra_dirs: Optional[List[str]] = None) -> List[TrackBase]:
        scan_paths = [settings.DATA_DIR / "local_music"]
        if extra_dirs:
            scan_paths.extend([Path(d) for d in extra_dirs])

        results: List[TrackBase] = []

        for base_path in scan_paths:
            base_path = Path(base_path)
            if not base_path.exists():
                base_path.mkdir(parents=True, exist_ok=True)
                continue

            for root, _, files in os.walk(base_path):
                for filename in files:
                    ext = Path(filename).suffix.lower()
                    if ext in SUPPORTED_EXTENSIONS:
                        full_path = os.path.join(root, filename)
                        track = self._parse_local_file(full_path)
                        if track:
                            results.append(track)

        logger.info(f"Local scanner indexed {len(results)} audio files")
        return results

    def _parse_local_file(self, file_path: str) -> Optional[TrackBase]:
        try:
            audio = MutagenFile(file_path)
            if audio is None:
                return None

            filename_no_ext = Path(file_path).stem
            # Extract tags safely
            title = filename_no_ext
            artist = "Local Artist"
            album = "Local Audio Collection"

            if hasattr(audio, "tags") and audio.tags:
                try:
                    title = str(audio.tags.get("title", [filename_no_ext])[0])
                    artist = str(audio.tags.get("artist", ["Local Artist"])[0])
                    album = str(audio.tags.get("album", ["Local Audio Collection"])[0])
                except Exception:
                    pass

            duration = int(round(audio.info.length)) if hasattr(audio, "info") and hasattr(audio.info, "length") else 0

            # Inspect audio specs for honest labeling
            ext = Path(file_path).suffix.lower()
            is_lossless = False
            codec = "flac"
            bitrate_kbps = 0

            if hasattr(audio, "info") and hasattr(audio.info, "bitrate") and audio.info.bitrate:
                bitrate_kbps = int(round(audio.info.bitrate / 1000))

            if ext in [".flac", ".alac", ".wav"]:
                is_lossless = True
                codec = "flac" if ext == ".flac" else ("alac" if ext == ".alac" else "wav")
                if bitrate_kbps == 0:
                    bitrate_kbps = 920
                label = "Lossless FLAC" if ext == ".flac" else ("Lossless ALAC" if ext == ".alac" else "Lossless PCM")
            elif ext == ".m4a":
                codec = "aac"
                if bitrate_kbps == 0:
                    bitrate_kbps = 256
                label = f"AAC {bitrate_kbps} kbps"
            elif ext == ".mp3":
                codec = "mp3"
                if bitrate_kbps == 0:
                    bitrate_kbps = 320
                label = f"MP3 {bitrate_kbps} kbps"
            else:
                codec = "vorbis"
                label = "Ogg Vorbis"

            track_id = self._generate_track_id(file_path)

            track = TrackBase(
                id=track_id,
                title=title,
                artist=artist,
                album=album,
                duration_seconds=duration,
                thumbnail_url="", # Local tracks display default acoustic badge
                provider="local",
                source_id=file_path
            )

            self._indexed_tracks[track_id] = {
                "track": track,
                "file_path": file_path,
                "codec": codec,
                "bitrate_kbps": bitrate_kbps,
                "is_lossless": is_lossless,
                "label": label,
                "size_bytes": os.path.getsize(file_path)
            }

            return track

        except Exception as e:
            logger.error(f"Failed to parse audio metadata for {file_path}: {e}")
            return None

    def get_track(self, track_id: str) -> Optional[TrackBase]:
        meta = self._indexed_tracks.get(track_id)
        return meta["track"] if meta else None

    def get_stream_metadata(self, track_id: str, host_url: str) -> Optional[AudioStreamMetadata]:
        meta = self._indexed_tracks.get(track_id)
        if not meta:
            return None

        return AudioStreamMetadata(
            codec=meta["codec"],
            bitrate_kbps=meta["bitrate_kbps"],
            is_lossless=meta["is_lossless"],
            label=meta["label"],
            stream_url=f"{host_url}/api/local/stream/{track_id}",
            loudness_db=-14.0 # Target standard
        )

    def get_file_info(self, track_id: str) -> Optional[Dict[str, Any]]:
        return self._indexed_tracks.get(track_id)

local_scanner = LocalAudioScannerService()
