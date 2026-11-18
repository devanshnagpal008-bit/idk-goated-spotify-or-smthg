from typing import Optional
from fastapi import APIRouter, Query, HTTPException
from app.schemas import SearchResultResponse
from app.services.ytmusic_service import ytmusic_service

router = APIRouter(prefix="/search", tags=["Search"])

@router.get("", response_model=SearchResultResponse)
async def search_catalog(
    q: str = Query(..., min_length=1, description="Search query"),
    type: Optional[str] = Query(None, description="Filter: songs, albums, artists, playlists, videos"),
    limit: int = Query(20, ge=1, le=50)
):
    try:
        return ytmusic_service.search(query=q, filter_type=type, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")
