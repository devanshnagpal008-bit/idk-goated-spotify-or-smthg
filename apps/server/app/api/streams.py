from fastapi import APIRouter, Path, Query, HTTPException
from app.schemas import AudioStreamMetadata
from app.services.stream_resolver import stream_resolver

router = APIRouter(prefix="/streams", tags=["Streams"])

@router.get("/{source_id}", response_model=AudioStreamMetadata)
async def get_stream_url(
    source_id: str = Path(..., description="YouTube Video ID or source identifier"),
    refresh: bool = Query(False, description="Force re-extraction bypassing cache"),
    quality: str = Query("high", description="Streaming quality: high, standard, saver")
):
    metadata = stream_resolver.resolve_stream(video_id=source_id, force_refresh=refresh, quality=quality)
    if not metadata:
        raise HTTPException(
            status_code=404,
            detail=f"Could not resolve audio stream for source ID '{source_id}'"
        )
    return metadata

@router.post("/{source_id}/prebuffer", response_model=AudioStreamMetadata)
async def prebuffer_stream(
    source_id: str = Path(..., description="YouTube Video ID to pre-resolve"),
    quality: str = Query("high", description="Streaming quality: high, standard, saver")
):
    # Asynchronously warms the stream resolution cache
    metadata = stream_resolver.resolve_stream(video_id=source_id, force_refresh=False, quality=quality)
    if not metadata:
        raise HTTPException(
            status_code=404,
            detail=f"Failed to prebuffer stream for '{source_id}'"
        )
    return metadata
