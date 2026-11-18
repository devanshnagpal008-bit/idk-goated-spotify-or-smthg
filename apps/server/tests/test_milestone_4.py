import pytest
from httpx import AsyncClient, ASGITransport
from datetime import datetime
from app.main import app
from app.db.database import init_db, AsyncSessionLocal
from app.db.models import PlayEventModel, TrackModel, LikeModel
from app.services.ai_playlist_generator import ai_playlist_generator
from app.services.recommendation_engine import recommendation_engine
from app.schemas import TrackBase

def test_parse_prompt_duration():
    assert ai_playlist_generator.parse_prompt_duration("rainy evening jazz, 45 minutes") == 2700
    assert ai_playlist_generator.parse_prompt_duration("workout edm 20m") == 1200
    assert ai_playlist_generator.parse_prompt_duration("deep focus 1 hour") == 3600
    assert ai_playlist_generator.parse_prompt_duration("ambient study") == 1800 # default

def test_ai_playlist_generation():
    pl = ai_playlist_generator.generate_playlist_from_prompt("synthwave night drive, 5 minutes", title="Night Drive")
    assert pl.title == "Night Drive"
    assert pl.track_count > 0
    assert pl.duration_seconds > 0
    assert len(pl.tracks) > 0

@pytest.mark.asyncio
async def test_taste_profile_and_reranking():
    await init_db()
    import uuid
    id1 = f"yt_liked_{uuid.uuid4().hex[:8]}"
    id2 = f"yt_skipped_{uuid.uuid4().hex[:8]}"

    async with AsyncSessionLocal() as session:
        # Add test tracks
        t1 = TrackModel(id=id1, title="Liked Song", artist_name="Affinity Artist", duration_seconds=200)
        t2 = TrackModel(id=id2, title="Skipped Song", artist_name="Disliked Artist", duration_seconds=180)
        session.add_all([t1, t2])
        await session.flush()

        # Add like for Affinity Artist
        session.add(LikeModel(track_id=id1, created_at=datetime.utcnow()))

        # Add skip event for Disliked Artist
        session.add(PlayEventModel(track_id=id2, event_type="skip", timestamp=datetime.utcnow()))
        await session.commit()

        # Compute taste profile
        profile = await recommendation_engine.compute_taste_profile(session)
        assert profile.get("Affinity Artist", 0) > 0
        assert profile.get("Disliked Artist", 0) < 0

        # Test reranking
        candidates = [
            TrackBase(id="c1", title="Song 1", artist="Disliked Artist", duration_seconds=180, source_id="c1"),
            TrackBase(id="c2", title="Song 2", artist="Affinity Artist", duration_seconds=200, source_id="c2"),
        ]
        reranked = await recommendation_engine.rerank_radio_tracks(candidates, session)
        assert len(reranked) == 2
        # Affinity Artist should now rank above Disliked Artist
        assert reranked[0].artist == "Affinity Artist"

@pytest.mark.asyncio
async def test_home_feed_daily_mixes():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/browse/home")
        assert res.status_code == 200
        feed = res.json()
        assert "daily_mixes" in feed
        assert len(feed["daily_mixes"]) > 0
        first_mix = feed["daily_mixes"][0]
        assert "Daily Mix" in first_mix["title"]
        assert first_mix["track_count"] > 0
