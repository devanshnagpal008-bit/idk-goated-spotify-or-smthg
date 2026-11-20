# Listening Pattern Observation, Home Recommendations, Top Charts & Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement an adaptive listening pattern observation model that improves Autoplay, personalizes the Home screen with recommendations, a 15–20 track "Recently Played" section, a "Top Charts" section (top artists and genres), and drastically speeds up cover art and audio stream rendering.

**Architecture:**
- **Telemetry Layer:** Frontend (`usePlayerStore`) automatically detects and emits playback lifecycle events (`start`, `progress_30s`, `complete`, `skip`) to the backend `/api/library/play-events`.
- **Recommendation & Reranking Engine:** Backend (`recommendation_engine.py`) models artist/genre affinity with exponential half-life decay, penalizes recent skips, and incorporates real-time session momentum into Autoplay radio queues.
- **Home Feed & Top Charts APIs:** Backend (`browse.py`, `library.py`) exposes personalized recommendations, 15-20 recently played items, and aggregated top artists/genres charts.
- **Performance Layer:** Smart thumbnail downscaling (`w300` for lists, reserving high-res for full player) and multi-track eager prebuffering.
- **Frontend UI:** Modern Apple Music-styled Home screen sections for Recently Played, Recommended For You, and Top Charts.

**Tech Stack:** Python 3.13/3.15, FastAPI, SQLAlchemy, SQLite, React Native / Expo, Zustand, Lucide React Native, yt-dlp.

---

## File Structure & Responsibilities

| File | Responsibility |
|---|---|
| `apps/server/app/schemas.py` | Add TopChartsResponse, PlayEventCreate enhancements, update HomeFeedResponse schemas |
| `apps/server/app/services/recommendation_engine.py` | Enhance taste profile computation, compute top charts, add session momentum & skip penalty to radio reranking |
| `apps/server/app/api/library.py` | Expose `/api/library/top-charts`, enhance `/api/library/history` (20 items, deduplicated), update `/api/library/play-events` |
| `apps/server/app/api/browse.py` | Update `/api/browse/home` to deliver `recently_played`, `recommended_for_you`, and `top_charts` |
| `apps/server/tests/test_recommendations_and_charts.py` | Pytest suite validating event logging, affinity scoring, top charts, and feed assembly |
| `apps/mobile/src/services/api.ts` | Optimize `upgradeArtworkUrl` (fast `w300`/`w544` thumbnails for lists), add `logPlayEvent` and `fetchTopCharts` APIs |
| `apps/mobile/src/stores/usePlayerStore.ts` | Wire telemetry emission on playback thresholds (`start`, `progress_30s`, `complete`, `skip`), multi-track prebuffering |
| `apps/mobile/src/screens/HomeScreen.tsx` | Render Recently Played (15-20 tracks), Recommended For You shelf, Top Charts section |

---

## Tasks

### Task 1: Telemetry & Listening Pattern Event Logging
- [ ] Update `PlayEventCreate` in `apps/server/app/schemas.py` if needed.
- [ ] Add `logPlayEvent` helper in `apps/mobile/src/services/api.ts`.
- [ ] In `apps/mobile/src/stores/usePlayerStore.ts`, track play session duration and emit:
  - `start` on track load/play.
  - `progress_30s` when `positionMillis >= 30000` (fire once per track).
  - `complete` on `status.didJustFinish`.
  - `skip` if skipped via `playNext` or `playPrevious` before 15 seconds.

### Task 2: Autoplay Engine Tuning with Session Momentum & Skip Penalties
- [ ] In `apps/server/app/services/recommendation_engine.py`:
  - Query recent skips (< 24h) and apply a -6.0 point penalty to candidate radio tracks with matching artist.
  - Add session momentum boost (+4.0 points) for tracks sharing artists or genres with the current session's completed songs.
  - Maintain 80% exploitation / 20% exploration ratio.
- [ ] Connect `rerank_radio_tracks` in `apps/server/app/api/radio.py`.

### Task 3: Backend History, Top Charts & Personalized Home Feed
- [ ] In `apps/server/app/api/library.py`:
  - Enhance `get_listening_history` to return up to 20 unique tracks, deduplicating consecutive repeats.
  - Implement `get_top_charts` returning ranked top artists and genres with counts and affinity scores.
- [ ] In `apps/server/app/api/browse.py`:
  - Update `get_home_feed` to include `recently_played`, `recommended_for_you`, and `top_charts`.
- [ ] Write pytest tests in `apps/server/tests/test_recommendations_and_charts.py` and ensure 100% pass rate.

### Task 4: Performance Optimizations for Cover Art & Song Streaming
- [ ] In `apps/mobile/src/services/api.ts`:
  - Update `upgradeArtworkUrl(url, targetResolution, purpose)`:
    - Default feed/list purpose to `'thumbnail'` (`w300` or `w544`), avoiding 2–4MB `maxresdefault.jpg` for small tiles.
    - Reserve full-res `1080p` / `1440p` strictly when `purpose === 'full'`.
- [ ] In `apps/mobile/src/stores/usePlayerStore.ts`:
  - Prebuffer the next 2 tracks in queue when nearing the end of the song.
- [ ] In `apps/server/app/services/stream_resolver.py`:
  - Optimize `resolve_stream` with fast in-memory TTL caching.

### Task 5: Frontend Home Screen UI (Recently Played, Recommendations, Top Charts)
- [ ] In `apps/mobile/src/screens/HomeScreen.tsx`:
  - Add **Recently Played** horizontal scroll row showing the last 15–20 songs.
  - Add **Recommended For You** carousel.
  - Add **Your Top Charts** section showing ranked artists and top genre chips with quick-play triggers.
  - Use fast-loading thumbnail URLs for all cards.

### Task 6: Verification & End-to-End Validation
- [ ] Run backend tests (`pytest tests/`).
- [ ] Check `/api/browse/home` and `/api/library/top-charts` with curl.
- [ ] Check Metro Web compilation and verify smooth rendering on `http://localhost:8081`.
- [ ] Sync all changes to `scratch/sonora`.
