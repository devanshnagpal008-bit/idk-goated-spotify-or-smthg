import math
import time
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.models import PlayEventModel, TrackModel, LikeModel
from app.schemas import TrackBase, PlaylistBase, TopChartsResponse, TopArtist, TopGenre
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
        """Re-ranks candidate radio tracks using user taste profile, session momentum, and penalizes recent skips."""
        taste_profile = await self.compute_taste_profile(db)
        if not candidate_tracks:
            return []

        recent_ids = recent_track_ids or set()

        # Query recent skips within the last 24 hours to aggressively demote skipped tracks
        cutoff_skips = datetime.utcnow() - timedelta(hours=24)
        skips_res = await db.execute(
            select(PlayEventModel.track_id)
            .where(PlayEventModel.event_type == 'skip')
            .where(PlayEventModel.timestamp >= cutoff_skips)
        )
        recent_skipped_ids = set(skips_res.scalars().all())

        scored_tracks: List[tuple[float, TrackBase]] = []

        for i, track in enumerate(candidate_tracks):
            # Base score inversely proportional to original YouTube radio position
            score = 10.0 - (i * 0.2)

            # Artist affinity bonus (positive affinity boosts, negative skips suppress)
            artist_affinity = taste_profile.get(track.artist, 0.0)
            score += min(max(artist_affinity, -8.0), 12.0)

            # Heavy penalty if user skipped this track recently
            if track.id in recent_skipped_ids:
                score -= 12.0

            # Penalty if track was played very recently in current queue/history
            if track.id in recent_ids:
                score -= 8.0

            scored_tracks.append((score, track))

        # Sort descending by personalized score
        scored_tracks.sort(key=lambda x: x[0], reverse=True)
        return [t for _, t in scored_tracks]

    async def compute_top_charts(self, db: AsyncSession) -> TopChartsResponse:
        """Computes top artists and genres from listening patterns, completions, and likes."""
        # 1. Top Artists based on play counts and affinity
        events_res = await db.execute(
            select(TrackModel.artist_name, func.count(PlayEventModel.id), TrackModel.thumbnail_url)
            .join(TrackModel, PlayEventModel.track_id == TrackModel.id)
            .where(PlayEventModel.event_type.in_(('start', 'progress_30s', 'complete')))
            .group_by(TrackModel.artist_name)
            .order_by(func.count(PlayEventModel.id).desc())
            .limit(10)
        )
        artist_rows = events_res.all()

        taste_profile = await self.compute_taste_profile(db)

        top_artists: List[TopArtist] = []
        for name, count, thumb in artist_rows:
            if not name or name.strip() == "" or name.lower() == "artist":
                continue
            affinity = taste_profile.get(name, 0.0)
            top_artists.append(TopArtist(
                artist=name,
                play_count=count,
                score=round(affinity + (count * 1.5), 1),
                thumbnail_url=thumb or ""
            ))

        # Fallback if brand new user without history
        if not top_artists:
            default_artists = [
                ("The Weeknd", 12, 28.5, "https://i.ytimg.com/vi/4NRXx6U8ABQ/hqdefault.jpg"),
                ("Dua Lipa", 10, 24.0, "https://i.ytimg.com/vi/BC19kwABFwc/hqdefault.jpg"),
                ("Coldplay", 8, 20.0, "https://i.ytimg.com/vi/d020hcWA_bQ/hqdefault.jpg"),
                ("Karan Aujla", 7, 18.0, "https://i.ytimg.com/vi/0pWsChby54w/hqdefault.jpg"),
                ("Billie Eilish", 6, 15.0, "https://i.ytimg.com/vi/egmwvD4Z8lY/hqdefault.jpg")
            ]
            top_artists = [
                TopArtist(artist=a[0], play_count=a[1], score=a[2], thumbnail_url=a[3])
                for a in default_artists
            ]

        # 2. Top Genres deduced from top artists / categories
        genre_keyword_map = {
            "Pop": ["dua lipa", "taylor swift", "ariana grande", "billie eilish", "ed sheeran", "olivia rodrigo"],
            "Hip-Hop & Rap": ["drake", "travis scott", "kanye", "future", "kendrick", "metro boomin", "yung lean"],
            "Electronic & Dance": ["justice", "daft punk", "calvin harris", "tame impala", "skrillex", "avicii"],
            "Punjabi & Desi": ["karan aujla", "diljit", "ap dhillon", "sidhu moose wala", "shubh"],
            "Rock & Alternative": ["coldplay", "arctic monkeys", "queen", "imagine dragons", "linkin park", "nirvana"],
            "R&B & Soul": ["the weeknd", "sza", "frank ocean", "brent faiyaz", "daniel caesar"]
        }

        genre_scores: Dict[str, float] = {g: 5.0 for g in genre_keyword_map}
        for artist_obj in top_artists:
            a_lower = artist_obj.artist.lower()
            for genre, keywords in genre_keyword_map.items():
                if any(kw in a_lower for kw in keywords):
                    genre_scores[genre] = genre_scores.get(genre, 0.0) + (artist_obj.score * 1.2)

        sorted_genres = sorted(genre_scores.items(), key=lambda x: x[1], reverse=True)
        top_genres = [TopGenre(genre=g, score=round(s, 1)) for g, s in sorted_genres[:6]]

        return TopChartsResponse(top_artists=top_artists[:6], top_genres=top_genres)

    async def get_recommended_tracks(self, db: AsyncSession, limit: int = 15) -> List[TrackBase]:
        """Fetches personalized track recommendations based on user's top affinity artists."""
        taste_profile = await self.compute_taste_profile(db)
        top_artists = [a for a, score in sorted(taste_profile.items(), key=lambda x: x[1], reverse=True) if score > 0][:5]
        if not top_artists:
            top_artists = ["The Weeknd", "Dua Lipa", "Tame Impala"]

        recommended: List[TrackBase] = []
        seen_ids = set()

        for artist in top_artists:
            search_res = ytmusic_service.search(f"{artist} songs", filter_type="songs", limit=5)
            for track in search_res.songs:
                if track.id not in seen_ids:
                    seen_ids.add(track.id)
                    recommended.append(track)
                if len(recommended) >= limit:
                    break
            if len(recommended) >= limit:
                break

        return recommended

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
