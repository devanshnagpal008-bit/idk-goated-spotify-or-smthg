import math
import time
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.models import PlayEventModel, TrackModel, LikeModel
from app.schemas import TrackBase, PlaylistBase
from app.services.ytmusic_service import ytmusic_service

# Half-life of 14 days in seconds for exponential decay
HALF_LIFE_SECONDS = 14 * 86400
LAMBDA = math.log(2) / HALF_LIFE_SECONDS

EVENT_BASE_WEIGHTS = {
    "like": 5.0,
    "complete": 3.0,
    "progress_30s": 1.5,
    "skip": -3.0
}

class RecommendationEngine:
    async def compute_taste_profile(self, db: AsyncSession) -> Dict[str, float]:
        """Calculates recency-decayed artist affinity weights from play events and likes."""
        now = time.time()
        artist_weights: Dict[str, float] = {}

        # 1. Process likes
        likes_res = await db.execute(
            select(LikeModel, TrackModel).join(TrackModel, LikeModel.track_id == TrackModel.id)
        )
        for _, track in likes_res.all():
            artist = track.artist_name
            artist_weights[artist] = artist_weights.get(artist, 0.0) + EVENT_BASE_WEIGHTS["like"]

        # 2. Process play events with exponential recency decay
        events_res = await db.execute(
            select(PlayEventModel, TrackModel)
            .join(TrackModel, PlayEventModel.track_id == TrackModel.id)
            .order_by(PlayEventModel.timestamp.desc())
            .limit(200)
        )
        for event, track in events_res.all():
            artist = track.artist_name
            delta_t = max(0, now - event.timestamp.timestamp())
            decay = math.exp(-LAMBDA * delta_t)
            weight = EVENT_BASE_WEIGHTS.get(event.event_type, 1.0) * decay
            artist_weights[artist] = artist_weights.get(artist, 0.0) + weight

        return artist_weights

    async def rerank_radio_tracks(
        self,
        candidate_tracks: List[TrackBase],
        db: AsyncSession,
        recent_track_ids: Optional[set] = None
    ) -> List[TrackBase]:
        """Re-ranks candidate radio tracks using user taste profile and penalizes recent skips."""
        taste_profile = await self.compute_taste_profile(db)
        if not candidate_tracks:
            return []

        recent_ids = recent_track_ids or set()
        scored_tracks: List[tuple[float, TrackBase]] = []

        for i, track in enumerate(candidate_tracks):
            # Base score inversely proportional to original YouTube radio position
            score = 10.0 - (i * 0.2)

            # Artist affinity bonus
            artist_affinity = taste_profile.get(track.artist, 0.0)
            score += min(max(artist_affinity, -5.0), 10.0)

            # Penalty if track was played very recently
            if track.id in recent_ids:
                score -= 8.0

            scored_tracks.append((score, track))

        # Sort descending by personalized score
        scored_tracks.sort(key=lambda x: x[0], reverse=True)
        return [t for _, t in scored_tracks]

    async def generate_daily_mixes(self, db: AsyncSession) -> List[PlaylistBase]:
        """Generates up to 6 distinct Daily Mix clusters based on top user artists."""
        taste_profile = await self.compute_taste_profile(db)
        sorted_artists = sorted(taste_profile.items(), key=lambda x: x[1], reverse=True)
        top_artists = [a for a, w in sorted_artists if w > 0][:12]

        if not top_artists:
            # Fallback popular artist clusters
            top_artists = ["Coldplay", "Dua Lipa", "The Weeknd", "Billie Eilish", "Taylor Swift", "Queen"]

        daily_mixes: List[PlaylistBase] = []
        mix_themes = [
            ("Daily Mix 1", "Your top personal rotation and favorites", top_artists[0:2]),
            ("Daily Mix 2", "High-energy hits and upbeat pop", top_artists[2:4] if len(top_artists) > 2 else [top_artists[0]]),
            ("Daily Mix 3", "Acoustic, chill, and relaxed grooves", top_artists[4:6] if len(top_artists) > 4 else [top_artists[0]]),
            ("Daily Mix 4", "Fresh discoveries and related artists", top_artists[0:1])
        ]

        for i, (title, desc, artists) in enumerate(mix_themes):
            mix_id = f"daily_mix_{i+1}"
            mix_tracks: List[TrackBase] = []
            for artist in artists:
                res = ytmusic_service.search(artist, filter_type="songs", limit=5)
                mix_tracks.extend(res.songs[:3])

            daily_mixes.append(PlaylistBase(
                id=mix_id,
                title=title,
                description=desc,
                cover_url=mix_tracks[0].thumbnail_url if mix_tracks else "",
                track_count=len(mix_tracks),
                duration_seconds=sum(t.duration_seconds for t in mix_tracks),
                is_smart=True,
                tracks=mix_tracks
            ))

        return daily_mixes

recommendation_engine = RecommendationEngine()
