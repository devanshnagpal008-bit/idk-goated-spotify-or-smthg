import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.database import init_db
from app.services.lyrics_service import lyrics_service

def test_lrc_parser():
    lrc_sample = """[ti:Test Song]
[ar:Test Artist]
[00:04.20]First line of lyrics
[00:10.50]Second line of lyrics
[01:02.80]Third line after one minute"""
    lines = lyrics_service._parse_lrc(lrc_sample)
    assert len(lines) == 3
    assert lines[0].time_ms == 4200
    assert lines[0].text == "First line of lyrics"
    assert lines[1].time_ms == 10500
    assert lines[2].time_ms == 62800

@pytest.mark.asyncio
async def test_lyrics_api_endpoint():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/lyrics?title=Yellow&artist=Coldplay")
        assert res.status_code == 200
        data = res.json()
        assert "is_synced" in data
        assert "lines" in data
        assert "provider" in data

@pytest.mark.asyncio
async def test_sync_status_api():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/sync/status")
        assert res.status_code == 200
        data = res.json()
        assert "authenticated" in data
        assert "aac_256_unlocked" in data

@pytest.mark.asyncio
async def test_downloads_api_list():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/downloads")
        assert res.status_code == 200
        assert isinstance(res.json(), list)
