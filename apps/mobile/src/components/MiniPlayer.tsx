import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Play, Pause, SkipForward, Music } from 'lucide-react-native';
import { usePlayerStore } from '../stores/usePlayerStore';

interface MiniPlayerProps {
  onPress?: () => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({ onPress }) => {
  const { currentTrack, streamMetadata, isPlaying, isLoading, togglePlayPause, playNext, positionMillis, durationMillis } = usePlayerStore();

  if (!currentTrack) {
    return null;
  }

  const progress = durationMillis > 0 ? Math.min(positionMillis / durationMillis, 1) : 0;

  return (
    <View style={styles.container}>
      <TouchableOpacity activeOpacity={0.9} style={styles.content} onPress={onPress}>
        {/* Album Artwork */}
        <View style={styles.artworkContainer}>
          {currentTrack.thumbnailUrl ? (
            <Image source={{ uri: currentTrack.thumbnailUrl }} style={styles.artwork} />
          ) : (
            <View style={[styles.artwork, styles.artworkPlaceholder]}>
              <Music color="#888" size={20} />
            </View>
          )}
        </View>

        {/* Track Metadata */}
        <View style={styles.infoContainer}>
          <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
            {currentTrack.title}
          </Text>
          <View style={styles.subtitleRow}>
            <Text style={styles.artist} numberOfLines={1} ellipsizeMode="tail">
              {currentTrack.artist}
            </Text>
            {streamMetadata && (
              <View style={[styles.badge, streamMetadata.isLossless && styles.losslessBadge]}>
                <Text style={styles.badgeText}>{streamMetadata.label}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={(e) => {
              e.stopPropagation();
              togglePlayPause();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : isPlaying ? (
              <Pause size={22} color="#ffffff" fill="#ffffff" />
            ) : (
              <Play size={22} color="#ffffff" fill="#ffffff" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={(e) => {
              e.stopPropagation();
              playNext();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <SkipForward size={22} color="#ffffff" fill="#ffffff" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Progress Bar Indicator */}
      <View style={styles.progressBarTrack}>
        <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 60, // Above bottom tab bar
    left: 8,
    right: 8,
    backgroundColor: 'rgba(28, 28, 30, 0.94)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden',
    zIndex: 999
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  artworkContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  artwork: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#2c2c2e',
  },
  artworkPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  title: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 6,
  },
  artist: {
    color: '#a1a1a6',
    fontSize: 12,
    flexShrink: 1,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  losslessBadge: {
    backgroundColor: 'rgba(52, 199, 89, 0.25)',
  },
  badgeText: {
    color: '#d1d1d6',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlButton: {
    padding: 6,
  },
  progressBarTrack: {
    height: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#fa2d48', // Apple Music Red accent
  },
});
