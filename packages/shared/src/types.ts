export type MusicProvider = 'ytmusic' | 'local';

export type AudioCodec = 'aac' | 'opus' | 'flac' | 'alac' | 'mp3' | 'vorbis';

export interface AudioStreamMetadata {
  codec: AudioCodec;
  bitrateKbps: number;
  isLossless: boolean;
  label: string;
  streamUrl: string;
  expiresAt?: number; // Unix timestamp
  loudnessDb?: number;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  album?: string;
  albumId?: string;
  durationSeconds: number;
  thumbnailUrl: string;
  isExplicit?: boolean;
  provider: MusicProvider;
  sourceId: string; // YouTube video ID or local absolute file path
  loudnessDb?: number;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  thumbnailUrl: string;
  year?: string | number;
  trackCount?: number;
  tracks?: Track[];
}

export interface Artist {
  id: string;
  name: string;
  thumbnailUrl?: string;
  subscriberCount?: string;
  topSongs?: Track[];
  albums?: Album[];
  relatedArtists?: Artist[];
}

export interface Playlist {
  id: string;
  title: string;
  description?: string;
  coverUrl?: string;
  trackCount: number;
  durationSeconds?: number;
  isSmart?: boolean;
  tracks?: Track[];
  createdAt?: string;
  updatedAt?: string;
}

export type PlayEventType = 'start' | 'progress_30s' | 'complete' | 'skip' | 'like';

export interface PlayEvent {
  trackId: string;
  eventType: PlayEventType;
  positionMs: number;
  durationMs: number;
  timestamp: string;
}

export interface SearchResult {
  query: string;
  songs: Track[];
  albums: Album[];
  artists: Artist[];
  playlists: Playlist[];
  videos: Track[];
}

export interface HomeFeed {
  jumpBackIn: Track[];
  madeForYou: Playlist[];
  dailyMixes: Playlist[];
  quickPicks: Track[];
  newReleases: Album[];
}

export interface LyricsLine {
  timeMs: number;
  text: string;
}

export interface LyricsResponse {
  isSynced: boolean;
  lines: LyricsLine[];
  plainLyrics?: string;
  provider: 'lrclib' | 'ytmusic' | 'local';
}

export interface TasteProfile {
  topArtists: { artist: string; score: number }[];
  topGenres: { genre: string; score: number }[];
  totalPlays: number;
  lastUpdated: string;
}

export interface PlaybackState {
  currentTrack: Track | null;
  streamMetadata: AudioStreamMetadata | null;
  isPlaying: boolean;
  positionSeconds: number;
  durationSeconds: number;
  bufferedSeconds: number;
  queue: Track[];
  queueIndex: number;
  isShuffled: boolean;
  repeatMode: 'off' | 'all' | 'one';
  autoplay: boolean;
  crossfadeSeconds: number;
  loudnessNormalization: boolean;
}
