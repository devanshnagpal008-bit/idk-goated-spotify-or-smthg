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
  provider: 'ytmusic' | 'local';
  sourceId: string;
  loudnessDb?: number;
}

export interface AudioStreamMetadata {
  codec: 'aac' | 'opus' | 'flac' | 'alac' | 'mp3' | 'vorbis';
  bitrateKbps: number;
  isLossless: boolean;
  label: string;
  streamUrl: string;
  expiresAt?: number;
  loudnessDb?: number;
}

export interface SearchResult {
  query: string;
  songs: Track[];
  albums: any[];
  artists: any[];
  playlists: any[];
  videos: Track[];
}

export interface HomeFeed {
  jumpBackIn: Track[];
  madeForYou: any[];
  dailyMixes: any[];
  quickPicks: Track[];
  newReleases: any[];
}

// Configurable API base URL with local IP support
export let API_BASE_URL = 'http://localhost:8000/api';

export function setApiBaseUrl(url: string) {
  API_BASE_URL = url;
}

export async function searchCatalog(query: string, filterType?: string, limit: number = 20): Promise<SearchResult> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  if (filterType && filterType !== 'all') {
    params.append('type', filterType);
  }
  
  const response = await fetch(`${API_BASE_URL}/search?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Search failed: ${response.statusText}`);
  }
  const data = await response.json();
  return {
    query: data.query || query,
    songs: (data.songs || []).map(mapTrack),
    albums: data.albums || [],
    artists: data.artists || [],
    playlists: data.playlists || [],
    videos: (data.videos || []).map(mapTrack)
  };
}

export async function getStreamUrl(sourceId: string, refresh: boolean = false): Promise<AudioStreamMetadata> {
  if (!sourceId) {
    throw new Error('No valid sourceId provided to getStreamUrl');
  }
  // If source is a local track id
  if (sourceId.startsWith('local_') || sourceId.includes('\\') || sourceId.includes('/')) {
    const trackId = sourceId.startsWith('local_') ? sourceId : `local_${sourceId}`;
    return {
      codec: 'flac',
      bitrateKbps: 920,
      isLossless: true,
      label: 'Lossless Audio',
      streamUrl: `${API_BASE_URL}/local/stream/${encodeURIComponent(trackId)}`,
      loudnessDb: -14.0
    };
  }

  const url = `${API_BASE_URL}/streams/${encodeURIComponent(sourceId)}${refresh ? '?refresh=true' : ''}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Stream resolution failed: ${response.statusText}`);
  }
  const data = await response.json();
  return {
    codec: data.codec,
    bitrateKbps: data.bitrate_kbps,
    isLossless: data.is_lossless,
    label: data.label,
    streamUrl: data.stream_url,
    expiresAt: data.expires_at,
    loudnessDb: data.loudness_db
  };
}

export async function prebufferStream(sourceId: string): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/streams/${encodeURIComponent(sourceId)}/prebuffer`, { method: 'POST' });
  } catch (e) {
    // Background pre-buffer failure is non-fatal
    console.debug('Prebuffer failed:', e);
  }
}

export async function getTrackDetails(trackId: string): Promise<Track> {
  const response = await fetch(`${API_BASE_URL}/tracks/${encodeURIComponent(trackId)}`);
  if (!response.ok) {
    throw new Error(`Track details failed: ${response.statusText}`);
  }
  const data = await response.json();
  return {
    id: data.id,
    title: data.title,
    artist: data.artist,
    album: data.album,
    durationSeconds: data.duration_seconds,
    thumbnailUrl: data.thumbnail_url,
    isExplicit: data.is_explicit,
    provider: data.provider,
    sourceId: data.source_id,
    loudnessDb: data.loudness_db
  };
}

export async function getRadioTracks(trackId: string, limit: number = 25): Promise<Track[]> {
  const response = await fetch(`${API_BASE_URL}/radio/${encodeURIComponent(trackId)}?limit=${limit}`);
  if (!response.ok) {
    throw new Error(`Radio fetch failed: ${response.statusText}`);
  }
  const data = await response.json();
  return data.map((t: any) => ({
    id: t.id,
    title: t.title,
    artist: t.artist,
    album: t.album,
    durationSeconds: t.duration_seconds,
    thumbnailUrl: t.thumbnail_url,
    isExplicit: t.is_explicit,
    provider: t.provider,
    sourceId: t.source_id
  }));
}

export async function getHomeFeed(): Promise<HomeFeed> {
  const response = await fetch(`${API_BASE_URL}/browse/home`);
  if (!response.ok) {
    throw new Error(`Home feed fetch failed: ${response.statusText}`);
  }
  const data = await response.json();
  return {
    jumpBackIn: (data.jump_back_in || []).map(mapTrack),
    madeForYou: data.made_for_you || [],
    dailyMixes: (data.daily_mixes || []).map((m: any) => ({
      ...m,
      tracks: (m.tracks || []).map(mapTrack)
    })),
    quickPicks: (data.quick_picks || []).map(mapTrack),
    newReleases: data.new_releases || []
  };
}

export function mapTrack(data: any): Track {
  if (!data) return {} as Track;
  const sourceId = data.sourceId || data.source_id || (typeof data.id === 'string' ? data.id.replace(/^yt_/, '') : '');
  return {
    id: data.id || (sourceId.startsWith('local_') ? sourceId : `yt_${sourceId}`),
    title: data.title || 'Unknown Title',
    artist: data.artist || 'Unknown Artist',
    artistId: data.artistId || data.artist_id,
    album: data.album || undefined,
    albumId: data.albumId || data.album_id,
    durationSeconds: data.durationSeconds || data.duration_seconds || 0,
    thumbnailUrl: data.thumbnailUrl || data.thumbnail_url || '',
    isExplicit: Boolean(data.isExplicit || data.is_explicit),
    provider: data.provider || (sourceId.startsWith('local_') ? 'local' : 'ytmusic'),
    sourceId: sourceId,
    loudnessDb: data.loudnessDb || data.loudness_db
  };
}


export async function fetchPlaylists(): Promise<any[]> {
  const response = await fetch(`${API_BASE_URL}/playlists`);
  if (!response.ok) throw new Error('Failed to fetch playlists');
  return response.json();
}

export async function createPlaylist(title: string, description?: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/playlists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description })
  });
  if (!response.ok) throw new Error('Failed to create playlist');
  return response.json();
}

export async function fetchPlaylistDetails(playlistId: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/playlists/${encodeURIComponent(playlistId)}`);
  if (!response.ok) throw new Error('Failed to fetch playlist details');
  const data = await response.json();
  return {
    ...data,
    tracks: (data.tracks || []).map(mapTrack)
  };
}

export async function addTrackToPlaylist(playlistId: string, track: Track): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/playlists/${encodeURIComponent(playlistId)}/tracks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ track })
  });
  if (!response.ok) throw new Error('Failed to add track to playlist');
  return response.json();
}

export async function fetchLocalTracks(): Promise<Track[]> {
  const response = await fetch(`${API_BASE_URL}/local/tracks`);
  if (!response.ok) throw new Error('Failed to fetch local tracks');
  const data = await response.json();
  return data.map(mapTrack);
}

export async function fetchLikedTracks(): Promise<Track[]> {
  const response = await fetch(`${API_BASE_URL}/library/likes`);
  if (!response.ok) throw new Error('Failed to fetch liked tracks');
  const data = await response.json();
  return data.map(mapTrack);
}

export async function toggleLikeTrack(track: Track): Promise<boolean> {
  const response = await fetch(`${API_BASE_URL}/library/likes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ track })
  });
  if (!response.ok) throw new Error('Failed to toggle like');
  const data = await response.json();
  return data.liked;
}

export async function fetchSmartAdd(playlistId: string): Promise<Track[]> {
  const response = await fetch(`${API_BASE_URL}/playlists/${encodeURIComponent(playlistId)}/smart-add`);
  if (!response.ok) throw new Error('Failed to fetch smart add suggestions');
  const data = await response.json();
  return data.map(mapTrack);
}

export async function importPlaylist(title: string, csvData: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/playlists/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, csv_data: csvData })
  });
  if (!response.ok) throw new Error('Failed to import playlist');
  return response.json();
}
