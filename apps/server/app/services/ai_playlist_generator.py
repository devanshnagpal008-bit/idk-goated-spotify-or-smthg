import re
import logging
from typing import List, Dict, Any, Optional
from app.schemas import TrackBase, PlaylistBase
from app.services.ytmusic_service import ytmusic_service

logger = logging.getLogger(__name__)

class AIPlaylistGenerator:
    def parse_prompt_duration(self, prompt: str) -> int:
        """Extracts requested duration in seconds (default 30 minutes / 1800s)."""
        match = re.search(r"(\d+)\s*(?:min|minute|minutes|m\b)", prompt, re.IGNORECASE)
        if match:
            minutes = int(match.group(1))
            return max(300, min(minutes * 60, 7200)) # Clamped between 5 mins and 2 hours

        hour_match = re.search(r"(\d+)\s*(?:hour|hours|h\b)", prompt, re.IGNORECASE)
        if hour_match:
            hours = int(hour_match.group(1))
            return max(300, min(hours * 3600, 7200))

        return 1800 # 30 mins default

    def generate_search_queries(self, prompt: str) -> List[str]:
        """Expands natural language prompt into catalog query seeds."""
        clean = re.sub(r"\b\d+\s*(?:min|minute|minutes|hour|hours|m|h)\b", "", prompt, flags=re.IGNORECASE).strip()
        queries = [clean]

        # Add stylistic variations
        if any(w in clean.lower() for w in ["jazz", "night", "rainy", "smooth"]):
            queries.extend([f"{clean} instrumental", "smooth jazz classics", "Miles Davis Bill Evans"])
        elif any(w in clean.lower() for w in ["workout", "gym", "energy", "edm", "running"]):
            queries.extend([f"{clean} mix", "high energy edm workout", "synthwave electro"])
        elif any(w in clean.lower() for w in ["study", "focus", "chill", "lofi", "ambient"]):
            queries.extend([f"{clean} beats", "lo-fi study beats", "chill instrumental"])
        else:
            queries.extend([f"{clean} songs", f"{clean} playlist"])

        return queries

    def generate_playlist_from_prompt(self, prompt: str, title: Optional[str] = None) -> PlaylistBase:
        target_duration = self.parse_prompt_duration(prompt)
        queries = self.generate_search_queries(prompt)

        seen_ids = set()
        accumulated_tracks: List[TrackBase] = []
        current_duration = 0

        for q in queries:
            if current_duration >= target_duration:
                break
            try:
                res = ytmusic_service.search(q, filter_type="songs", limit=10)
                for t in res.songs:
                    if t.id not in seen_ids and t.duration_seconds > 0:
                        seen_ids.add(t.id)
                        accumulated_tracks.append(t)
                        current_duration += t.duration_seconds
                        if current_duration >= target_duration:
                            break
            except Exception as e:
                logger.error(f"Error searching query '{q}' for AI playlist: {e}")

        # Fallback if too few
        if len(accumulated_tracks) < 3:
            fallback_res = ytmusic_service.search("chill acoustic", filter_type="songs", limit=5)
            for t in fallback_res.songs:
                if t.id not in seen_ids:
                    seen_ids.add(t.id)
                    accumulated_tracks.append(t)

        final_title = title or prompt.strip().title()
        if len(final_title) > 35:
            final_title = final_title[:32] + "..."

        return PlaylistBase(
            id=f"ai_{abs(hash(prompt)) % 1000000}",
            title=final_title,
            description=f"Generated from prompt: \"{prompt}\" (~{current_duration // 60} mins)",
            cover_url=accumulated_tracks[0].thumbnail_url if accumulated_tracks else "",
            track_count=len(accumulated_tracks),
            duration_seconds=current_duration,
            is_smart=True,
            tracks=accumulated_tracks
        )

ai_playlist_generator = AIPlaylistGenerator()
