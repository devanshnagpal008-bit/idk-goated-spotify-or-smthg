import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.database import init_db
from app.services.local_scanner import local_scanner

@pytest.mark.asyncio
async def test_local_scanner_and_list():
    await init_db()
    local_scanner.scan_directories()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/local/tracks")
        assert response.status_code == 200
        tracks = response.json()
        assert len(tracks) > 0
        local_track = tracks[0]
        assert local_track["provider"] == "local"
        assert "acoustic_resonance" in local_track["title"].lower()

@pytest.mark.asyncio
async def test_local_streaming_range():
    await init_db()
    tracks = local_scanner.scan_directories()
    assert len(tracks) > 0
    track_id = tracks[0].id

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        headers = {"Range": "bytes=0-100"}
        response = await ac.get(f"/api/local/stream/{track_id}", headers=headers)
        assert response.status_code == 206
        assert "bytes 0-100/" in response.headers.get("content-range", "")
        assert len(response.content) == 101

@pytest.mark.asyncio
async def test_playlist_crud_and_duplicate():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Create playlist
        create_res = await ac.post("/api/playlists", json={"title": "M3 Test Playlist", "description": "Test Desc"})
        assert create_res.status_code == 200
        pl = create_res.json()
        pl_id = pl["id"]
        assert pl["title"] == "M3 Test Playlist"

        # 2. Add Track
        sample_track = {
            "id": "yt_test123",
            "title": "Test Song",
            "artist": "Test Artist",
            "duration_seconds": 210,
            "thumbnail_url": "http://example.com/thumb.jpg",
            "provider": "ytmusic",
            "source_id": "test123"
        }
        add_res = await ac.post(f"/api/playlists/{pl_id}/tracks", json={"track": sample_track})
        assert add_res.status_code == 200
        updated_pl = add_res.json()
        assert updated_pl["track_count"] == 1
        assert len(updated_pl["tracks"]) == 1

        # 3. Duplicate playlist
        dup_res = await ac.post(f"/api/playlists/{pl_id}/duplicate")
        assert dup_res.status_code == 200
        dup_pl = dup_res.json()
        assert "Copy" in dup_pl["title"]
        assert dup_pl["track_count"] == 1

        # 4. Delete playlists
        del1 = await ac.delete(f"/api/playlists/{pl_id}")
        assert del1.status_code == 200
        del2 = await ac.delete(f"/api/playlists/{dup_pl['id']}")
        assert del2.status_code == 200

@pytest.mark.asyncio
async def test_library_likes_and_session():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        track = {
            "id": "yt_like_test",
            "title": "Favorite Song",
            "artist": "Favorite Artist",
            "duration_seconds": 180,
            "thumbnail_url": "http://example.com/fav.jpg",
            "provider": "ytmusic",
            "source_id": "like_test"
        }

        # Like
        like_res = await ac.post("/api/library/likes", json={"track": track})
        assert like_res.status_code == 200
        assert like_res.json()["liked"] is True

        # List likes
        list_res = await ac.get("/api/library/likes")
        assert list_res.status_code == 200
        likes = list_res.json()
        assert any(t["id"] == "yt_like_test" for t in likes)

        # Unlike
        unlike_res = await ac.post("/api/library/likes", json={"track": track})
        assert unlike_res.status_code == 200
        assert unlike_res.json()["liked"] is False

        # Session Save & Restore
        sess_payload = {
            "current_track": track,
            "queue": [track],
            "position_millis": 45000
        }
        save_sess = await ac.post("/api/library/session", json=sess_payload)
        assert save_sess.status_code == 200

        get_sess = await ac.get("/api/library/session")
        assert get_sess.status_code == 200
        restored = get_sess.json()
        assert restored["current_track"]["id"] == "yt_like_test"
        assert restored["position_millis"] == 45000
