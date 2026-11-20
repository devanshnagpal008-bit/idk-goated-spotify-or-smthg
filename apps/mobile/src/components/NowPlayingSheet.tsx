import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
  PanResponder,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  ListMusic,
  Sliders,
  Heart,
  Music,
  Mic2,
  MoreHorizontal,
  Volume1,
  Volume2
} from 'lucide-react-native';
import { usePlayerStore } from '../stores/usePlayerStore';
import { getArtworkGradientColors } from '../utils/colorExtractor';
import { upgradeArtworkUrl } from '../services/api';
import { QueueDrawer } from './QueueDrawer';
import { AudioSettingsModal } from './AudioSettingsModal';
import { LyricsView } from './LyricsView';

interface NowPlayingSheetProps {
  visible: boolean;
  onClose: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ARTWORK_SIZE = Math.min(SCREEN_WIDTH - 64, 340);

export const NowPlayingSheet: React.FC<NowPlayingSheetProps> = ({ visible, onClose }) => {
  const {
    currentTrack,
    streamMetadata,
    isPlaying,
    isLoading,
    togglePlayPause,
    seekTo,
    seekBy,
    playNext,
    playPrevious,
    positionMillis,
    durationMillis,
    isShuffled,
    toggleShuffle,
    repeatMode,
    toggleRepeat,
    artworkResolution,
  } = usePlayerStore();

  const [isLiked, setIsLiked] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [fallbackStep, setFallbackStep] = useState(0);
  const [volume, setVolume] = useState(0.7);

  // Scrubber drag / seek state
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubPositionMillis, setScrubPositionMillis] = useState(0);
  const trackRef = useRef<any>(null);
  const trackLayoutRef = useRef({ x: 28, width: SCREEN_WIDTH - 56 });
  const volumeTrackRef = useRef<any>(null);
  const volumeLayoutRef = useRef({ x: 28, width: SCREEN_WIDTH - 56 });

  // Progressive resolution cascade: selected -> 1440p -> 1080p -> 544p
  const cascade: ('4k' | '1440p' | '1080p')[] =
    artworkResolution === '4k' ? ['4k', '1440p', '1080p'] :
    artworkResolution === '1440p' ? ['1440p', '1080p', '1080p'] :
    ['1080p', '1080p', '1080p'];

  const activeRes = cascade[Math.min(fallbackStep, cascade.length - 1)];
  const resolvedArtwork = currentTrack?.thumbnailUrl
    ? upgradeArtworkUrl(currentTrack.thumbnailUrl, activeRes)
    : '';

  const gradient = currentTrack
    ? getArtworkGradientColors(currentTrack.id, currentTrack.title, currentTrack.artist)
    : { primary: '#1a1c29', secondary: '#11121d', background: '#08080c' };

  // Time & progress calculation
  const displayedPosition = isScrubbing ? scrubPositionMillis : positionMillis;
  const effectiveDuration = durationMillis > 0 ? durationMillis : ((currentTrack?.durationSeconds || 180) * 1000);
  const displayedProgress = effectiveDuration > 0
    ? Math.max(0, Math.min(1, displayedPosition / effectiveDuration))
    : 0;

  const formatTime = (millis: number) => {
    if (!millis || millis < 0) return '0:00';
    const totalSecs = Math.floor(millis / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const remainingMillis = Math.max(0, effectiveDuration - displayedPosition);

  // Helper to accurately extract ratio from touch/pointer event across Web & Native
  const getRatioFromPageX = (pageX: number): number => {
    if (Platform.OS === 'web' && trackRef.current) {
      const node = trackRef.current as any;
      if (typeof node.getBoundingClientRect === 'function') {
        const rect = node.getBoundingClientRect();
        return Math.max(0, Math.min(1, (pageX - rect.left) / rect.width));
      }
    }
    const width = trackLayoutRef.current.width || (SCREEN_WIDTH - 56);
    const x = trackLayoutRef.current.x || 28;
    return Math.max(0, Math.min(1, (pageX - x) / width));
  };

  // Full PanResponder for fluid 60fps forward & backward dragging
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          setIsScrubbing(true);
          const ratio = getRatioFromPageX(evt.nativeEvent.pageX);
          const target = ratio * effectiveDuration;
          setScrubPositionMillis(target);
        },
        onPanResponderMove: (evt) => {
          const ratio = getRatioFromPageX(evt.nativeEvent.pageX);
          const target = ratio * effectiveDuration;
          setScrubPositionMillis(target);
        },
        onPanResponderRelease: async (evt) => {
          const ratio = getRatioFromPageX(evt.nativeEvent.pageX);
          const target = ratio * effectiveDuration;
          await seekTo(target);
          setIsScrubbing(false);
        },
        onPanResponderTerminate: () => {
          setIsScrubbing(false);
        },
      }),
    [effectiveDuration, seekTo]
  );

  // Volume slider PanResponder
  const getVolumeRatio = (pageX: number): number => {
    if (Platform.OS === 'web' && volumeTrackRef.current) {
      const node = volumeTrackRef.current as any;
      if (typeof node.getBoundingClientRect === 'function') {
        const rect = node.getBoundingClientRect();
        return Math.max(0, Math.min(1, (pageX - rect.left) / rect.width));
      }
    }
    const width = volumeLayoutRef.current.width || (SCREEN_WIDTH - 56);
    const x = volumeLayoutRef.current.x || 28;
    return Math.max(0, Math.min(1, (pageX - x) / width));
  };

  const volumePanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          setVolume(getVolumeRatio(evt.nativeEvent.pageX));
        },
        onPanResponderMove: (evt) => {
          setVolume(getVolumeRatio(evt.nativeEvent.pageX));
        },
        onPanResponderRelease: async (evt) => {
          const vol = getVolumeRatio(evt.nativeEvent.pageX);
          setVolume(vol);
          // Apply volume to the sound object
          const { sound } = usePlayerStore.getState();
          if (sound) {
            try { await sound.setVolumeAsync(vol); } catch (e) {}
          }
        },
      }),
    []
  );

  if (!currentTrack) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Dynamic Blurred Cover Art Background (Apple Music Frosted Glass Effect) */}
        {resolvedArtwork ? (
          <Image
            source={{ uri: resolvedArtwork }}
            style={[
              StyleSheet.absoluteFill,
              styles.blurredBgImage,
              Platform.OS === 'web'
                ? ({
                    filter: 'blur(60px) saturate(300%) brightness(0.7)',
                    transform: [{ scale: 1.4 }],
                  } as any)
                : null,
            ]}
            blurRadius={Platform.OS === 'web' ? undefined : 55}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={[gradient.primary, gradient.secondary, gradient.background]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
        )}

        {/* Ambient Glassmorphism Tint Overlay */}
        <LinearGradient
          colors={[
            'rgba(10, 10, 20, 0.15)',
            'rgba(10, 10, 18, 0.45)',
            'rgba(5, 5, 10, 0.82)'
          ]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />

        {/* Frosted Glass Sheen Overlay */}
        <View style={[StyleSheet.absoluteFill, styles.frostedGlassSheen]} pointerEvents="none" />

        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.dismissButton} onPress={onClose} activeOpacity={0.7}>
              <ChevronDown size={28} color="#ffffff" />
            </TouchableOpacity>

            <View style={styles.headerTitleContainer}>
              <View style={styles.grabber} />
              <Text style={styles.headerContextText} numberOfLines={1}>
                PLAYING FROM SONORA
              </Text>
            </View>

            <TouchableOpacity
              style={styles.dismissButton}
              onPress={() => setShowAudioSettings(true)}
              activeOpacity={0.7}
            >
              <Sliders size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Large Artwork or Lyrics View */}
          {showLyrics ? (
            <View style={{ flex: 1 }}>
              <LyricsView />
            </View>
          ) : (
            <View style={styles.artworkWrapper}>
              <View style={styles.artworkShadowContainer}>
                {resolvedArtwork ? (
                  <Image
                    source={{ uri: resolvedArtwork }}
                    style={styles.artwork}
                    onError={() => {
                      if (fallbackStep < cascade.length - 1) {
                        setFallbackStep(prev => prev + 1);
                      }
                    }}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.artwork, styles.artworkPlaceholder]}>
                    <Music color="#888" size={64} />
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Title & Metadata Row — Apple Music style */}
          <View style={styles.metaContainer}>
            <View style={styles.titleColumn}>
              <Text style={styles.titleText} numberOfLines={1}>
                {currentTrack.title}
              </Text>
              <Text style={styles.artistText} numberOfLines={1}>
                {currentTrack.artist}
              </Text>
            </View>

            <View style={styles.metaActions}>
              <TouchableOpacity
                style={styles.heartButton}
                onPress={() => setIsLiked(!isLiked)}
                activeOpacity={0.7}
              >
                <Heart
                  size={24}
                  color={isLiked ? '#fa2d48' : 'rgba(255, 255, 255, 0.85)'}
                  fill={isLiked ? '#fa2d48' : 'transparent'}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.moreButton}
                onPress={() => setShowAudioSettings(true)}
                activeOpacity={0.7}
              >
                <MoreHorizontal size={24} color="rgba(255, 255, 255, 0.85)" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Progress Scrubber */}
          <View style={styles.scrubberContainer}>
            <View
              ref={trackRef}
              {...panResponder.panHandlers}
              style={styles.scrubberTouchArea}
              testID="scrubber-touch-area"
              onLayout={(e) => {
                trackLayoutRef.current = e.nativeEvent.layout;
              }}
            >
              <View style={styles.scrubberTrack} pointerEvents="none">
                <View style={[styles.scrubberFill, { width: `${displayedProgress * 100}%` }]} />
                <View
                  style={[
                    styles.scrubberThumb,
                    isScrubbing && styles.scrubberThumbActive,
                    { left: `${Math.max(0, Math.min(97, displayedProgress * 100))}%` }
                  ]}
                />
              </View>
            </View>

            {/* Time Labels */}
            <View style={styles.timeLabelsRow}>
              <Text style={styles.timeLabel}>{formatTime(displayedPosition)}</Text>
              <Text style={[styles.timeLabel, { textAlign: 'right' }]}>-{formatTime(remainingMillis)}</Text>
            </View>
          </View>

          {/* Primary Playback Controls — Apple Music large icons */}
          <View style={styles.controlsRow}>
            {/* Shuffle */}
            <TouchableOpacity onPress={toggleShuffle} style={styles.secondaryButton} activeOpacity={0.7}>
              <Shuffle size={22} color={isShuffled ? '#fa2d48' : 'rgba(255,255,255,0.5)'} />
            </TouchableOpacity>

            {/* Previous Track */}
            <TouchableOpacity onPress={playPrevious} style={styles.skipButton} activeOpacity={0.7}>
              <SkipBack size={36} color="#ffffff" fill="#ffffff" />
            </TouchableOpacity>

            {/* Play / Pause */}
            <TouchableOpacity onPress={togglePlayPause} style={styles.mainPlayButton} activeOpacity={0.85}>
              {isLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : isPlaying ? (
                <Pause size={42} color="#ffffff" fill="#ffffff" />
              ) : (
                <Play size={42} color="#ffffff" fill="#ffffff" style={{ marginLeft: 4 }} />
              )}
            </TouchableOpacity>

            {/* Next Track */}
            <TouchableOpacity onPress={playNext} style={styles.skipButton} activeOpacity={0.7}>
              <SkipForward size={36} color="#ffffff" fill="#ffffff" />
            </TouchableOpacity>

            {/* Repeat */}
            <TouchableOpacity onPress={toggleRepeat} style={styles.secondaryButton} activeOpacity={0.7}>
              {repeatMode === 'one' ? (
                <Repeat1 size={22} color="#fa2d48" />
              ) : (
                <Repeat size={22} color={repeatMode === 'all' ? '#fa2d48' : 'rgba(255,255,255,0.5)'} />
              )}
            </TouchableOpacity>
          </View>

          {/* Volume Slider — Apple Music style */}
          <View style={styles.volumeContainer}>
            <Volume1 size={16} color="rgba(255, 255, 255, 0.45)" />
            <View
              ref={volumeTrackRef}
              {...volumePanResponder.panHandlers}
              style={styles.volumeTouchArea}
              onLayout={(e) => {
                volumeLayoutRef.current = e.nativeEvent.layout;
              }}
            >
              <View style={styles.volumeTrack} pointerEvents="none">
                <View style={[styles.volumeFill, { width: `${volume * 100}%` }]} />
              </View>
            </View>
            <Volume2 size={16} color="rgba(255, 255, 255, 0.45)" />
          </View>

          {/* Bottom Toolbar */}
          <View style={styles.bottomToolbar}>
            <TouchableOpacity
              style={styles.toolButton}
              onPress={() => setShowLyrics(!showLyrics)}
              activeOpacity={0.7}
            >
              <Mic2 size={22} color={showLyrics ? '#fa2d48' : 'rgba(255,255,255,0.65)'} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolButton}
              onPress={() => setShowAudioSettings(true)}
              activeOpacity={0.7}
            >
              <Sliders size={20} color="rgba(255,255,255,0.65)" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolButton}
              onPress={() => setShowQueue(true)}
              activeOpacity={0.7}
            >
              <ListMusic size={22} color="rgba(255,255,255,0.65)" />
            </TouchableOpacity>
          </View>

          {/* Sub-Drawers */}
          <QueueDrawer visible={showQueue} onClose={() => setShowQueue(false)} />
          <AudioSettingsModal visible={showAudioSettings} onClose={() => setShowAudioSettings(false)} />
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0e',
    overflow: 'hidden',
  },
  blurredBgImage: {
    width: '120%',
    height: '120%',
    top: '-10%',
    left: '-10%',
    position: 'absolute',
    opacity: 0.9,
  },
  frostedGlassSheen: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    ...(Platform.OS === 'web'
      ? {
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }
      : {}),
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  dismissButton: {
    padding: 8,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    marginBottom: 6,
  },
  headerContextText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  artworkWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  artworkShadowContainer: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
    elevation: 24,
  },
  artwork: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    borderRadius: 18,
    backgroundColor: '#1c1c1e',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  artworkPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
  },
  titleColumn: {
    flex: 1,
    marginRight: 16,
  },
  titleText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  artistText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 17,
    fontWeight: '500',
    marginTop: 4,
  },
  metaActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heartButton: {
    padding: 8,
  },
  moreButton: {
    padding: 8,
  },
  scrubberContainer: {
    paddingHorizontal: 28,
    marginTop: 20,
  },
  scrubberTouchArea: {
    height: 36,
    justifyContent: 'center',
    cursor: 'pointer',
  } as any,
  scrubberTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 2,
    position: 'relative',
  },
  scrubberFill: {
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 2,
  },
  scrubberThumb: {
    position: 'absolute',
    top: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  scrubberThumbActive: {
    top: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 8,
  },
  timeLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  timeLabel: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    minWidth: 42,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    marginVertical: 10,
  },
  secondaryButton: {
    padding: 10,
  },
  skipButton: {
    padding: 10,
  },
  mainPlayButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    marginTop: 4,
    gap: 10,
  },
  volumeTouchArea: {
    flex: 1,
    height: 30,
    justifyContent: 'center',
    cursor: 'pointer',
  } as any,
  volumeTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  volumeFill: {
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderRadius: 2,
  },
  bottomToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 40,
  },
  toolButton: {
    padding: 10,
  },
});
