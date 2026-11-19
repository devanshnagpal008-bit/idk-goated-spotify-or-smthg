import { create } from 'zustand';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Track, AudioStreamMetadata, getStreamUrl, prebufferStream, getRadioTracks } from '../services/api';

interface PlayerState {
  currentTrack: Track | null;
  streamMetadata: AudioStreamMetadata | null;
  isPlaying: boolean;
  isLoading: boolean;
  positionMillis: number;
  durationMillis: number;
  queue: Track[];
  queueIndex: number;
  autoplay: boolean;
  isShuffled: boolean;
  repeatMode: 'off' | 'all' | 'one';
  sound: Audio.Sound | null;
  error: string | null;
  artworkResolution: '1080p' | '1440p' | '4k';

  // Actions
  setArtworkResolution: (resolution: '1080p' | '1440p' | '4k') => void;
  playTrack: (track: Track, newQueue?: Track[]) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seekTo: (positionMillis: number) => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  addToQueue: (track: Track) => void;
  playTrackNext: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  toggleAutoplay: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  streamMetadata: null,
  isPlaying: false,
  isLoading: false,
  positionMillis: 0,
  durationMillis: 0,
  queue: [],
  queueIndex: 0,
  autoplay: true,
  isShuffled: false,
  repeatMode: 'off',
  sound: null,
  error: null,
  artworkResolution: '1440p',

  setArtworkResolution: (resolution: '1080p' | '1440p' | '4k') => set({ artworkResolution: resolution }),

  playTrack: async (track: Track, newQueue?: Track[]) => {
    const { sound: currentSound, queue: currentQueue } = get();

    // Stop and unload existing sound
    if (currentSound) {
      try {
        await currentSound.stopAsync();
        await currentSound.unloadAsync();
      } catch (e) {
        console.debug('Error unloading existing sound:', e);
      }
    }

    let updatedQueue = newQueue ? [...newQueue] : [...currentQueue];
    let index = updatedQueue.findIndex(t => t.id === track.id);
    if (index === -1) {
      updatedQueue = [track, ...updatedQueue];
      index = 0;
    }

    set({
      currentTrack: track,
      queue: updatedQueue,
      queueIndex: index,
      isLoading: true,
      error: null,
      positionMillis: 0,
      durationMillis: (track.durationSeconds || 0) * 1000
    });

    let sourceId = track.sourceId || (track as any).source_id;
    if (!sourceId && typeof track.id === 'string') {
      sourceId = track.id.replace(/^yt_/, '');
    }

    try {
      // 1. Resolve stream URL from backend
      const metadata = await getStreamUrl(sourceId);
      set({ streamMetadata: metadata });

      // 2. Initialize Expo Audio Sound
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true
        });
      } catch (e) {
        console.debug('AudioMode setup:', e);
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: metadata.streamUrl },
        { shouldPlay: true, progressUpdateIntervalMillis: 250 },
        (status: AVPlaybackStatus) => {
          if (!status.isLoaded) {
            if (status.error) {
              set({ error: status.error, isPlaying: false, isLoading: false });
            }
            return;
          }

          set({
            isPlaying: status.isPlaying,
            positionMillis: status.positionMillis,
            durationMillis: status.durationMillis || ((track.durationSeconds || 0) * 1000),
            isLoading: status.isBuffering && !status.isPlaying
          });

          // Prebuffer next track when 15 seconds remaining
          if (status.durationMillis && (status.durationMillis - status.positionMillis <= 15000)) {
            const state = get();
            const nextTrack = state.queue[state.queueIndex + 1];
            if (nextTrack) {
              const nextSourceId = nextTrack.sourceId || (nextTrack as any).source_id;
              if (nextSourceId) prebufferStream(nextSourceId);
            }
          }

          // Handle track completion
          if (status.didJustFinish) {
            const { repeatMode, playNext, sound } = get();
            if (repeatMode === 'one' && sound) {
              sound.replayAsync();
            } else {
              playNext();
            }
          }
        }
      );

      set({ sound: newSound, isPlaying: true, isLoading: false });
    } catch (err: any) {
      console.error('Error playing track:', err);
      set({
        error: err.message || 'Failed to play track',
        isLoading: false,
        isPlaying: false
      });
    }
  },

  togglePlayPause: async () => {
    const { sound, isPlaying } = get();
    if (!sound) return;

    try {
      if (isPlaying) {
        await sound.pauseAsync();
        set({ isPlaying: false });
      } else {
        await sound.playAsync();
        set({ isPlaying: true });
      }
    } catch (err) {
      console.error('Toggle play/pause failed:', err);
    }
  },

  seekTo: async (positionMillis: number) => {
    const { sound } = get();
    if (!sound) return;
    try {
      await sound.setPositionAsync(positionMillis);
      set({ positionMillis });
    } catch (err) {
      console.error('Seek failed:', err);
    }
  },

  playNext: async () => {
    const { queue, queueIndex, repeatMode, autoplay, currentTrack, playTrack } = get();
    const nextIndex = queueIndex + 1;

    if (nextIndex < queue.length) {
      await playTrack(queue[nextIndex]);
    } else if (repeatMode === 'all' && queue.length > 0) {
      await playTrack(queue[0]);
    } else if (autoplay && currentTrack) {
      // Endless Autoplay: fetch YouTube radio tracks
      try {
        set({ isLoading: true });
        const radioTracks = await getRadioTracks(currentTrack.sourceId, 15);
        if (radioTracks.length > 0) {
          // Append and play first recommended track
          const newQueue = [...queue, ...radioTracks];
          set({ queue: newQueue });
          await playTrack(radioTracks[0]);
        }
      } catch (e) {
        console.error('Autoplay radio fetch failed:', e);
        set({ isPlaying: false, isLoading: false });
      }
    } else {
      set({ isPlaying: false });
    }
  },

  playPrevious: async () => {
    const { queue, queueIndex, positionMillis, sound, playTrack } = get();
    // If played more than 3 seconds, restart current track
    if (positionMillis > 3000 && sound) {
      await sound.setPositionAsync(0);
      return;
    }

    const prevIndex = queueIndex - 1;
    if (prevIndex >= 0) {
      await playTrack(queue[prevIndex]);
    }
  },

  addToQueue: (track: Track) => {
    set(state => ({
      queue: [...state.queue, track]
    }));
  },

  playTrackNext: (track: Track) => {
    set(state => {
      const newQueue = [...state.queue];
      newQueue.splice(state.queueIndex + 1, 0, track);
      return { queue: newQueue };
    });
  },

  removeFromQueue: (index: number) => {
    set(state => {
      const newQueue = state.queue.filter((_, i) => i !== index);
      let newIndex = state.queueIndex;
      if (index < state.queueIndex) {
        newIndex -= 1;
      }
      return { queue: newQueue, queueIndex: newIndex };
    });
  },

  reorderQueue: (fromIndex: number, toIndex: number) => {
    set(state => {
      const newQueue = [...state.queue];
      const [moved] = newQueue.splice(fromIndex, 1);
      newQueue.splice(toIndex, 0, moved);
      return { queue: newQueue };
    });
  },

  toggleShuffle: () => {
    set(state => ({ isShuffled: !state.isShuffled }));
  },

  toggleRepeat: () => {
    set(state => {
      const next = state.repeatMode === 'off' ? 'all' : state.repeatMode === 'all' ? 'one' : 'off';
      return { repeatMode: next };
    });
  },

  toggleAutoplay: () => {
    set(state => ({ autoplay: !state.autoplay }));
  }
}));
