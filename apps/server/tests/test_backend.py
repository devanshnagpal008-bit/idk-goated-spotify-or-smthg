import pytest
from app.services.stream_resolver import StreamResolverService
from app.services.ytmusic_service import ytmusic_service
from app.main import app
from httpx import AsyncClient, ASGITransport

@pytest.fixture
def stream_resolver():
    return StreamResolverService()

def test_stream_codec_and_label_aac_256(stream_resolver):
    format_info = {
        "acodec": "mp4a.40.2",
        "ext": "m4a",
        "abr": 256.0
    }
    codec, abr, label = stream_resolver._determine_codec_and_label(format_info)
    assert codec == "aac"
    assert abr == 256
    assert label == "AAC 256 kbps"

def test_stream_codec_and_label_opus_160(stream_resolver):
    format_info = {
        "acodec": "opus",
        "ext": "webm",
        "abr": 160.0
    }
    codec, abr, label = stream_resolver._determine_codec_and_label(format_info)
    assert codec == "opus"
    assert abr == 160
    assert label == "Opus ~160 kbps"

def test_stream_codec_and_label_lossless_flac(stream_resolver):
    format_info = {
        "acodec": "flac",
        "ext": "flac",
        "abr": 920.0
    }
    codec, abr, label = stream_resolver._determine_codec_and_label(format_info)
    assert codec == "flac"
    assert label == "Lossless FLAC"

def test_extract_expiration(stream_resolver):
    test_url = "https://rr1---sn-example.googlevideo.com/videoplayback?expire=1795027119&ei=abc123xyz"
    expire = stream_resolver._extract_expiration(test_url)
    assert expire == 1795027119

@pytest.mark.asyncio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["app"] == "Sonora Music"

@pytest.mark.asyncio
async def test_search_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/search?q=Mozart&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert "songs" in data
        assert len(data["songs"]) > 0
        first_song = data["songs"][0]
        assert "title" in first_song
        assert "artist" in first_song
        assert first_song["provider"] == "ytmusic"
        assert first_song["source_id"] is not None


@pytest.mark.asyncio
async def test_stream_resolution_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Resolve audio stream for a known stable YouTube video ID
        response = await ac.get("/api/streams/WKZO-CWeOVA")
        assert response.status_code == 200
        data = response.json()
        assert "stream_url" in data
        assert data["stream_url"].startswith("http")
        assert "codec" in data
        assert "bitrate_kbps" in data
        assert "label" in data
        assert data["bitrate_kbps"] > 0
        assert data["is_lossless"] is False
