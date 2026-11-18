import os
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from app.core.config import settings
from app.schemas import TrackBase
from app.services.stream_resolver import stream_resolver

logger = logging.getLogger(__name__)

class DownloadService:
    def __init__(self):
        self.downloads_dir = settings.DATA_DIR / "downloads"
        self.downloads_dir.mkdir(parents=True, exist_ok=True)

    def is_downloaded(self, source_id: str) -> bool:
        file_path = self.downloads_dir / f"{source_id}.m4a"
        return file_path.exists() and file_path.stat().st_size > 1000

    def get_download_path(self, source_id: str) -> Optional[Path]:
        file_path = self.downloads_dir / f"{source_id}.m4a"
        if file_path.exists():
            return file_path
        return None

    async def download_track(self, source_id: str) -> bool:
        """Resolves audio stream and caches file locally for offline playback."""
        target_path = self.downloads_dir / f"{source_id}.m4a"
        if target_path.exists() and target_path.stat().st_size > 1000:
            return True

        meta = stream_resolver.resolve_stream(source_id)
        if not meta or not meta.stream_url:
            return False

        try:
            import httpx
            async with httpx.AsyncClient(timeout=30.0) as client:
                async with client.stream("GET", meta.stream_url) as response:
                    if response.status_code != 200:
                        return False
                    with open(target_path, "wb") as f:
                        async for chunk in response.aiter_bytes(chunk_size=64 * 1024):
                            f.write(chunk)
            return True
        except Exception as e:
            logger.error(f"Download failed for {source_id}: {e}")
            if target_path.exists():
                target_path.unlink(missing_ok=True)
            return False

    def list_downloads(self) -> List[Dict[str, Any]]:
        results = []
        for f in self.downloads_dir.glob("*.m4a"):
            source_id = f.stem
            results.append({
                "source_id": source_id,
                "file_size": f.stat().st_size,
                "file_path": str(f)
            })
        return results

download_service = DownloadService()
