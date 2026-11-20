import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_log_play_event_lifecycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Log start event
        start_res = await client.post("/api/library/events", json={
            "track_id": "test_track_obs_1",
            "event_type": "start",
            "position_ms": 0,
            "duration_ms": 180000,
            "title": "Observed Track 1",
            "artist": "Test Artist Alpha",
            "thumbnail_url": "https://example.com/thumb1.jpg"
        })
        assert start_res.status_code == 200
        assert start_res.json()["event"] == "start"

        # 2. Log progress 30s
        prog_res = await client.post("/api/library/events", json={
            "track_id": "test_track_obs_1",
            "event_type": "progress_30s",
            "position_ms": 30000,
            "duration_ms": 180000,
            "title": "Observed Track 1",
            "artist": "Test Artist Alpha"
        })
        assert prog_res.status_code == 200

        # 3. Log complete event
        comp_res = await client.post("/api/library/events", json={
            "track_id": "test_track_obs_1",
            "event_type": "complete",
            "position_ms": 180000,
            "duration_ms": 180000,
            "title": "Observed Track 1",
            "artist": "Test Artist Alpha"
        })
        assert comp_res.status_code == 200

        # 4. Log skip event on another track
        skip_res = await client.post("/api/library/events", json={
            "track_id": "test_track_skipped",
            "event_type": "skip",
            "position_ms": 4000,
            "duration_ms": 200000,
            "title": "Skipped Song",
            "artist": "Skipped Artist"
        })
        assert skip_res.status_code == 200

@pytest.mark.asyncio
async def test_listening_history_and_top_charts():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # History
        hist_res = await client.get("/api/library/history")
        assert hist_res.status_code == 200
        history = hist_res.json()
        assert isinstance(history, list)
        assert len(history) <= 20

        # Top Charts
        charts_res = await client.get("/api/library/top-charts")
        assert charts_res.status_code == 200
        charts_data = charts_res.json()
        assert "top_artists" in charts_data
        assert "top_genres" in charts_data
        assert len(charts_data["top_artists"]) > 0
        assert len(charts_data["top_genres"]) > 0

@pytest.mark.asyncio
async def test_home_feed_with_recommendations_and_history():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        home_res = await client.get("/api/browse/home")
        assert home_res.status_code == 200
        data = home_res.json()
        assert "recently_played" in data
        assert "recommended_for_you" in data
        assert "top_charts" in data
        assert "daily_mixes" in data
