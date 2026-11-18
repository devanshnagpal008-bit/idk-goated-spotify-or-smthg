import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  ActivityIndicator
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
  Mic2
} from 'lucide-react-native';
import { usePlayerStore } from '../stores/usePlayerStore';
import { getArtworkGradientColors } from '../utils/colorExtractor';
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
    playNext,
    playPrevious,
    positionMillis,
    durationMillis,
    isShuffled,
    toggleShuffle,
    repeatMode,
    toggleRepeat
  } = usePlayerStore();

  const [isLiked, setIsLiked] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [showBadgeDetail, setShowBadgeDetail] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);

  if (!currentTrack) {
    return null;
  }

  const gradient = getArtworkGradientColors(currentTrack.id, currentTrack.title, currentTrack.artist);
  const progress = durationMillis > 0 ? Math.min(positionMillis / durationMillis, 1) : 0;

  const formatTime = (millis: number) => {
    if (!millis || millis < 0) return '0:00';
    const totalSecs = Math.floor(millis / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const remainingMillis = Math.max(0, durationMillis - positionMillis);

  const handleScrubPress = (event: any) => {
    const { locationX } = event.nativeEvent;
    const trackWidth = SCREEN_WIDTH - 48;
    const ratio = Math.max(0, Math.min(1, locationX / trackWidth));
    const targetMillis = ratio * durationMillis;
    seekTo(targetMillis);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <LinearGradient
        colors={[gradient.primary, gradient.secondary, gradient.background]}
        style={styles.gradientContainer}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.dismissButton} onPress={onClose}>
              <ChevronDown size={28} color="#ffffff" />
            </TouchableOpacity>

            <View style={styles.headerTitleContainer}>
              <View style={styles.grabber} />
              <Text style={styles.headerContextText} numberOfLines={1}>
                PLAYING FROM DISCOVERY
              </Text>
            </View>

            <TouchableOpacity style={styles.dismissButton} onPress={() => setShowAudioSettings(true)}>
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
                {currentTrack.thumbnailUrl ? (
                  <Image source={{ uri: currentTrack.thumbnailUrl }} style={styles.artwork} />
                ) : (
                  <View style={[styles.artwork, styles.artworkPlaceholder]}>
                    <Music color="#888" size={64} />
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Title & Metadata Row */}
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
              >
                <Heart
                  size={24}
                  color={isLiked ? '#fa2d48' : '#ffffff'}
                  fill={isLiked ? '#fa2d48' : 'transparent'}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Audio Quality Badge */}
          {streamMetadata && (
            <TouchableOpacity
              style={styles.qualityBadgeRow}
              onPress={() => setShowBadgeDetail(!showBadgeDetail)}
              activeOpacity={0.8}
            >
              <View style={[styles.qualityBadge, streamMetadata.isLossless && styles.losslessBadge]}>
                <Text style={styles.qualityBadgeText}>{streamMetadata.label}</Text>
              </View>
              {streamMetadata.loudnessDb !== undefined && streamMetadata.loudnessDb !== null && (
                <Text style={styles.loudnessText}>
                  {streamMetadata.loudnessDb > 0 ? `+${streamMetadata.loudnessDb}` : streamMetadata.loudnessDb} dB LUFS
                </Text>
              )}
            </TouchableOpacity>
          )}

          {/* Scrubber Bar */}
          <View style={styles.scrubberContainer}>
            <TouchableOpacity
              style={styles.scrubberTouchArea}
              onPress={handleScrubPress}
              activeOpacity={1}
            >
              <View style={styles.scrubberTrack}>
                <View style={[styles.scrubberFill, { width: `${progress * 100}%` }]} />
                <View style={[styles.scrubberThumb, { left: `${Math.max(0, Math.min(97, progress * 100))}%` }]} />
              </View>
            </TouchableOpacity>
            <View style={styles.timeLabelsRow}>
              <Text style={styles.timeLabel}>{formatTime(positionMillis)}</Text>
              <Text style={styles.timeLabel}>-{formatTime(remainingMillis)}</Text>
            </View>
          </View>

          {/* Primary Playback Controls */}
          <View style={styles.controlsRow}>
            {/* Shuffle */}
            <TouchableOpacity onPress={toggleShuffle} style={styles.secondaryButton}>
              <Shuffle size={22} color={isShuffled ? '#fa2d48' : 'rgba(255,255,255,0.7)'} />
            </TouchableOpacity>

            {/* Previous */}
            <TouchableOpacity onPress={playPrevious} style={styles.skipButton}>
              <SkipBack size={32} color="#ffffff" fill="#ffffff" />
            </TouchableOpacity>

            {/* Play / Pause Primary */}
            <TouchableOpacity onPress={togglePlayPause} style={styles.mainPlayButton} activeOpacity={0.85}>
              {isLoading ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : isPlaying ? (
                <Pause size={34} color="#000000" fill="#000000" />
              ) : (
                <Play size={34} color="#000000" fill="#000000" style={{ marginLeft: 3 }} />
              )}
            </TouchableOpacity>

            {/* Next */}
            <TouchableOpacity onPress={playNext} style={styles.skipButton}>
              <SkipForward size={32} color="#ffffff" fill="#ffffff" />
            </TouchableOpacity>

            {/* Repeat */}
            <TouchableOpacity onPress={toggleRepeat} style={styles.secondaryButton}>
              {repeatMode === 'one' ? (
                <Repeat1 size={22} color="#fa2d48" />
              ) : (
                <Repeat size={22} color={repeatMode === 'all' ? '#fa2d48' : 'rgba(255,255,255,0.7)'} />
              )}
            </TouchableOpacity>
          </View>

          {/* Bottom Toolbar */}
          <View style={styles.bottomToolbar}>
            <TouchableOpacity
              style={styles.toolButton}
              onPress={() => setShowLyrics(!showLyrics)}
            >
              <Mic2 size={22} color={showLyrics ? '#fa2d48' : 'rgba(255,255,255,0.8)'} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolButton}
              onPress={() => setShowAudioSettings(true)}
            >
              <Sliders size={20} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolButton}
              onPress={() => setShowQueue(true)}
            >
              <ListMusic size={22} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </View>

          {/* Sub-Drawers */}
          <QueueDrawer visible={showQueue} onClose={() => setShowQueue(false)} />
          <AudioSettingsModal visible={showAudioSettings} onClose={() => setShowAudioSettings(false)} />
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
};

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
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
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: 6,
  },
  headerContextText: {
    color: 'rgba(255, 255, 255, 0.6)',
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
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 20,
  },
  artwork: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    borderRadius: 16,
    backgroundColor: '#1c1c1e',
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
  },
  artistText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 17,
    fontWeight: '500',
    marginTop: 4,
  },
  metaActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heartButton: {
    padding: 8,
  },
  qualityBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    marginTop: 8,
    gap: 8,
  },
  qualityBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  losslessBadge: {
    backgroundColor: 'rgba(52, 199, 89, 0.3)',
  },
  qualityBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  loudnessText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    fontWeight: '500',
  },
  scrubberContainer: {
    paddingHorizontal: 28,
    marginTop: 16,
  },
  scrubberTouchArea: {
    height: 30,
    justifyContent: 'center',
  },
  scrubberTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    position: 'relative',
  },
  scrubberFill: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
  scrubberThumb: {
    position: 'absolute',
    top: -5,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  timeLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  timeLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontWeight: '500',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    marginVertical: 12,
  },
  secondaryButton: {
    padding: 10,
  },
  skipButton: {
    padding: 10,
  },
  mainPlayButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  bottomToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  toolButton: {
    padding: 10,
  },
});
