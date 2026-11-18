import os
import mimetypes
from typing import List, Optional
from fastapi import APIRouter, Path, HTTPException, Header
from fastapi.responses import StreamingResponse
from app.services.download_service import download_service

router = APIRouter(prefix="/downloads", tags=["Downloads"])

@router.get("", response_model=List[dict])
async def list_cached_downloads():
    return download_service.list_downloads()

@router.post("/{source_id}")
async def trigger_download(source_id: str = Path(...)):
    success = await download_service.download_track(source_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to download audio track")
    return {"status": "downloaded", "source_id": source_id}

@router.get("/audio/{source_id}")
async def stream_cached_audio(
    source_id: str = Path(...),
    range_header: Optional[str] = Header(None, alias="Range")
):
    file_path = download_service.get_download_path(source_id)
    if not file_path:
        raise HTTPException(status_code=404, detail="Downloaded track not found")

    file_size = file_path.stat().st_size
    start = 0
    end = file_size - 1

    if range_header:
        try:
            bytes_range = range_header.replace("bytes=", "").split("-")
            start = int(bytes_range[0])
            if len(bytes_range) > 1 and bytes_range[1]:
                end = int(bytes_range[1])
        except Exception:
            start = 0

    end = min(end, file_size - 1)
    chunk_size = (end - start) + 1

    def chunk_generator():
        with open(file_path, "rb") as f:
            f.seek(start)
            remaining = chunk_size
            while remaining > 0:
                data = f.read(min(remaining, 64 * 1024))
                if not data:
                    break
                remaining -= len(data)
                yield data

    headers = {
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Accept-Ranges": "bytes",
        "Content-Length": str(chunk_size),
        "Content-Type": "audio/mp4",
    }

    return StreamingResponse(
        chunk_generator(),
        status_code=206 if range_header else 200,
        headers=headers
    )
