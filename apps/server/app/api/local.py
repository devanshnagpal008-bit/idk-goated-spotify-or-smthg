import os
import mimetypes
from typing import List, Optional
from fastapi import APIRouter, Request, HTTPException, Path, Header
from fastapi.responses import StreamingResponse
from app.schemas import TrackBase, AudioStreamMetadata
from app.services.local_scanner import local_scanner

router = APIRouter(prefix="/local", tags=["Local Audio"])

@router.post("/scan", response_model=List[TrackBase])
async def scan_local_files():
    return local_scanner.scan_directories()

@router.get("/tracks", response_model=List[TrackBase])
async def list_local_tracks():
    tracks = local_scanner.scan_directories()
    return tracks

@router.get("/stream/{track_id}")
async def stream_local_audio(
    track_id: str = Path(...),
    range_header: Optional[str] = Header(None, alias="Range")
):
    info = local_scanner.get_file_info(track_id)
    if not info:
        # Attempt scan in case it was newly added
        local_scanner.scan_directories()
        info = local_scanner.get_file_info(track_id)
        if not info:
            raise HTTPException(status_code=404, detail="Local audio file not found")

    file_path = info["file_path"]
    file_size = info["size_bytes"]
    mime_type, _ = mimetypes.guess_type(file_path)
    if not mime_type:
        mime_type = "audio/flac" if info["codec"] == "flac" else "audio/mpeg"

    start = 0
    end = file_size - 1

    if range_header:
        # Parse "bytes=0-1024"
        try:
            bytes_range = range_header.replace("bytes=", "").split("-")
            start = int(bytes_range[0])
            if len(bytes_range) > 1 and bytes_range[1]:
                end = int(bytes_range[1])
        except Exception:
            start = 0

    end = min(end, file_size - 1)
    chunk_size = (end - start) + 1

    def file_chunk_generator():
        with open(file_path, "rb") as f:
            f.seek(start)
            remaining = chunk_size
            while remaining > 0:
                read_bytes = min(remaining, 64 * 1024)
                data = f.read(read_bytes)
                if not data:
                    break
                remaining -= len(data)
                yield data

    headers = {
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Accept-Ranges": "bytes",
        "Content-Length": str(chunk_size),
        "Content-Type": mime_type,
    }

    return StreamingResponse(
        file_chunk_generator(),
        status_code=206 if range_header else 200,
        headers=headers
    )
