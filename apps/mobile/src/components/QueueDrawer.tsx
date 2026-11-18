import React from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Switch
} from 'react-native';
import { X, Trash2, ArrowUp, ArrowDown, Radio, Sparkles } from 'lucide-react-native';
import { usePlayerStore } from '../stores/usePlayerStore';
import { Track } from '../services/api';

interface QueueDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export const QueueDrawer: React.FC<QueueDrawerProps> = ({ visible, onClose }) => {
  const {
    queue,
    queueIndex,
    currentTrack,
    playTrack,
    removeFromQueue,
    reorderQueue,
    autoplay,
    toggleAutoplay
  } = usePlayerStore();

  const upNextTracks = queue.slice(queueIndex + 1);

  const renderTrackItem = ({ item, index }: { item: Track; index: number }) => {
    const actualIndex = queueIndex + 1 + index;
    const canMoveUp = index > 0;
    const canMoveDown = index < upNextTracks.length - 1;

    return (
      <View style={styles.trackRow}>
        <Text style={styles.indexText}>{index + 1}</Text>
        <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
        
        <TouchableOpacity
          style={styles.details}
          onPress={() => playTrack(item)}
          activeOpacity={0.7}
        >
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.artist} numberOfLines={1}>{item.artist}</Text>
        </TouchableOpacity>

        {/* Reorder Up/Down */}
        <View style={styles.reorderButtons}>
          <TouchableOpacity
            style={[styles.arrowButton, !canMoveUp && styles.disabledArrow]}
            disabled={!canMoveUp}
            onPress={() => reorderQueue(actualIndex, actualIndex - 1)}
          >
            <ArrowUp size={16} color={canMoveUp ? '#ffffff' : '#444'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.arrowButton, !canMoveDown && styles.disabledArrow]}
            disabled={!canMoveDown}
            onPress={() => reorderQueue(actualIndex, actualIndex + 1)}
          >
            <ArrowDown size={16} color={canMoveDown ? '#ffffff' : '#444'} />
          </TouchableOpacity>
        </View>

        {/* Remove */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => removeFromQueue(actualIndex)}
        >
          <Trash2 size={16} color="#8e8e93" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Playing Next</Text>
            <Text style={styles.headerSubtitle}>{upNextTracks.length} tracks remaining</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Currently Playing Card */}
        {currentTrack && (
          <View style={styles.nowPlayingCard}>
            <Text style={styles.sectionLabel}>NOW PLAYING</Text>
            <View style={styles.nowPlayingRow}>
              <Image source={{ uri: currentTrack.thumbnailUrl }} style={styles.nowPlayingThumbnail} />
              <View style={styles.nowPlayingDetails}>
                <Text style={styles.nowPlayingTitle} numberOfLines={1}>{currentTrack.title}</Text>
                <Text style={styles.nowPlayingArtist} numberOfLines={1}>{currentTrack.artist}</Text>
              </View>
              <View style={styles.liveIndicator}>
                <Text style={styles.liveText}>PLAYING</Text>
              </View>
            </View>
          </View>
        )}

        {/* Autoplay Toggle Banner */}
        <View style={styles.autoplayBanner}>
          <View style={styles.autoplayLeft}>
            <Radio size={20} color="#fa2d48" style={{ marginRight: 10 }} />
            <View>
              <Text style={styles.autoplayTitle}>Endless Autoplay</Text>
              <Text style={styles.autoplayDesc}>Similar songs keep playing when queue ends</Text>
            </View>
          </View>
          <Switch
            value={autoplay}
            onValueChange={toggleAutoplay}
            trackColor={{ false: '#3a3a3c', true: '#fa2d48' }}
            thumbColor="#ffffff"
          />
        </View>

        {/* Up Next List */}
        <FlatList
          data={upNextTracks}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={renderTrackItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Sparkles size={40} color="#3a3a3c" />
              <Text style={styles.emptyTitle}>End of Queue</Text>
              <Text style={styles.emptyDesc}>
                {autoplay
                  ? 'Autoplay is on — next songs will be recommended automatically.'
                  : 'Add songs from search or browse to keep the music going.'}
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121214',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#2c2c2e',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#8e8e93',
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2c2c2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nowPlayingCard: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 14,
    backgroundColor: 'rgba(250, 45, 72, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(250, 45, 72, 0.25)',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fa2d48',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  nowPlayingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nowPlayingThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  nowPlayingDetails: {
    flex: 1,
    marginLeft: 12,
  },
  nowPlayingTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  nowPlayingArtist: {
    color: '#fa2d48',
    fontSize: 13,
    marginTop: 2,
  },
  liveIndicator: {
    backgroundColor: '#fa2d48',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  liveText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  autoplayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
  },
  autoplayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  autoplayTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  autoplayDesc: {
    color: '#8e8e93',
    fontSize: 12,
    marginTop: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#242426',
  },
  indexText: {
    color: '#636366',
    fontSize: 13,
    width: 24,
    fontWeight: '600',
  },
  thumbnail: {
    width: 42,
    height: 42,
    borderRadius: 6,
    backgroundColor: '#2c2c2e',
  },
  details: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  title: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  artist: {
    color: '#8e8e93',
    fontSize: 12,
    marginTop: 2,
  },
  reorderButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  arrowButton: {
    padding: 6,
    backgroundColor: '#2c2c2e',
    borderRadius: 6,
  },
  disabledArrow: {
    opacity: 0.3,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 14,
  },
  emptyDesc: {
    color: '#8e8e93',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
