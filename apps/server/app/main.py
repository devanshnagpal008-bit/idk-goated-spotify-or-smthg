from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.database import init_db
from app.api import search, streams, tracks, browse, radio, playlists, local, library, lyrics, downloads, sync

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    try:
        from app.services.local_scanner import local_scanner
        local_scanner.scan_directories()
    except Exception as e:
        print(f"Initial local scan: {e}")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all API routers
app.include_router(search.router, prefix=settings.API_V1_STR)
app.include_router(streams.router, prefix=settings.API_V1_STR)
app.include_router(tracks.router, prefix=settings.API_V1_STR)
app.include_router(browse.router, prefix=settings.API_V1_STR)
app.include_router(radio.router, prefix=settings.API_V1_STR)
app.include_router(playlists.router, prefix=settings.API_V1_STR)
app.include_router(local.router, prefix=settings.API_V1_STR)
app.include_router(library.router, prefix=settings.API_V1_STR)
app.include_router(lyrics.router, prefix=settings.API_V1_STR)
app.include_router(downloads.router, prefix=settings.API_V1_STR)
app.include_router(sync.router, prefix=settings.API_V1_STR)

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION
    }
