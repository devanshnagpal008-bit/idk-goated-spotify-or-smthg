import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  FlatList,
  Modal,
  TextInput,
  Image,
  ActivityIndicator
} from 'react-native';
import {
  Heart,
  ListMusic,
  Download,
  HardDrive,
  ChevronRight,
  Plus,
  Play,
  Upload,
  X,
  Music
} from 'lucide-react-native';
import {
  fetchPlaylists,
  fetchLocalTracks,
  fetchLikedTracks,
  createPlaylist,
  importPlaylist,
  Track
} from '../services/api';
import { usePlayerStore } from '../stores/usePlayerStore';

export const LibraryScreen: React.FC = () => {
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [localTracks, setLocalTracks] = useState<Track[]>([]);
  const [likedTracks, setLikedTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [importCsv, setImportCsv] = useState('');
  const [viewingCategory, setViewingCategory] = useState<'root' | 'playlists' | 'local' | 'likes'>('root');

  const { playTrack } = usePlayerStore();

  useEffect(() => {
    loadLibraryData();
  }, []);

  const loadLibraryData = async () => {
    setLoading(true);
    try {
      const [pls, locals, likes] = await Promise.all([
        fetchPlaylists().catch(() => []),
        fetchLocalTracks().catch(() => []),
        fetchLikedTracks().catch(() => [])
      ]);
      setPlaylists(pls);
      setLocalTracks(locals);
      setLikedTracks(likes);
    } catch (err) {
      console.error('Error loading library data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newTitle.trim()) return;
    try {
      await createPlaylist(newTitle.trim());
      setNewTitle('');
      setShowCreateModal(false);
      loadLibraryData();
    } catch (e) {
      console.error('Create playlist failed:', e);
    }
  };

  const handleImport = async () => {
    if (!newTitle.trim() || !importCsv.trim()) return;
    try {
      await importPlaylist(newTitle.trim(), importCsv.trim());
      setNewTitle('');
      setImportCsv('');
      setShowImportModal(false);
      loadLibraryData();
    } catch (e) {
      console.error('Import failed:', e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.largeTitle}>Library</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.actionPill}
              onPress={() => setShowCreateModal(true)}
            >
              <Plus size={16} color="#ffffff" style={{ marginRight: 4 }} />
              <Text style={styles.actionPillText}>New</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionPill}
              onPress={() => setShowImportModal(true)}
            >
              <Upload size={16} color="#ffffff" style={{ marginRight: 4 }} />
              <Text style={styles.actionPillText}>Import</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#fa2d48" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Quick Navigation Rows */}
            <View style={styles.listContainer}>
              <TouchableOpacity
                style={styles.row}
                onPress={() => setViewingCategory('playlists')}
                activeOpacity={0.7}
              >
                <View style={styles.iconContainer}>
                  <ListMusic size={22} color="#fa2d48" />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.rowTitle}>Playlists</Text>
                  <Text style={styles.rowCount}>{playlists.length} playlists</Text>
                </View>
                <ChevronRight size={18} color="#48484a" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.row}
                onPress={() => setViewingCategory('likes')}
                activeOpacity={0.7}
              >
                <View style={styles.iconContainer}>
                  <Heart size={22} color="#fa2d48" />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.rowTitle}>Favorite Songs</Text>
                  <Text style={styles.rowCount}>{likedTracks.length} liked tracks</Text>
                </View>
                <ChevronRight size={18} color="#48484a" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.row}
                onPress={() => setViewingCategory('local')}
                activeOpacity={0.7}
              >
                <View style={styles.iconContainer}>
                  <HardDrive size={22} color="#fa2d48" />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.rowTitle}>Local Lossless Files</Text>
                  <Text style={styles.rowCount}>{localTracks.length} local files indexed</Text>
                </View>
                <ChevronRight size={18} color="#48484a" />
              </TouchableOpacity>
            </View>

            {/* Local Lossless Tracks Section */}
            {localTracks.length > 0 && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Lossless Audio Library</Text>
                  <View style={styles.losslessBadge}>
                    <Text style={styles.losslessBadgeText}>Bit-Perfect</Text>
                  </View>
                </View>
                {localTracks.map((track) => (
                  <TouchableOpacity
                    key={track.id}
                    style={styles.trackCard}
                    activeOpacity={0.7}
                    onPress={() => playTrack(track, localTracks)}
                  >
                    <View style={styles.localThumbnail}>
                      <Music size={20} color="#fa2d48" />
                    </View>
                    <View style={styles.trackDetails}>
                      <Text style={styles.trackTitle} numberOfLines={1}>{track.title}</Text>
                      <Text style={styles.trackArtist} numberOfLines={1}>{track.artist}</Text>
                    </View>
                    <View style={styles.hiResPill}>
                      <Text style={styles.hiResText}>LOSSLESS</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.playIconBtn}
                      onPress={() => playTrack(track, localTracks)}
                    >
                      <Play size={18} color="#fa2d48" fill="#fa2d48" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Playlists Grid */}
            {playlists.length > 0 && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Your Playlists</Text>
                <View style={styles.playlistGrid}>
                  {playlists.map((pl) => (
                    <TouchableOpacity key={pl.id} style={styles.playlistCard} activeOpacity={0.8}>
                      {pl.cover_url ? (
                        <Image source={{ uri: pl.cover_url }} style={styles.playlistImage} />
                      ) : (
                        <View style={[styles.playlistImage, styles.playlistPlaceholder]}>
                          <ListMusic size={28} color="#888" />
                        </View>
                      )}
                      <Text style={styles.playlistTitle} numberOfLines={1}>{pl.title}</Text>
                      <Text style={styles.playlistSubtitle}>{pl.track_count} songs</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        {/* Modal: Create Playlist */}
        <Modal visible={showCreateModal} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>New Playlist</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Playlist Title"
                placeholderTextColor="#8e8e93"
                value={newTitle}
                onChangeText={setNewTitle}
                autoFocus
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnCancel]}
                  onPress={() => setShowCreateModal(false)}
                >
                  <Text style={styles.modalBtnTextCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnSubmit]}
                  onPress={handleCreatePlaylist}
                >
                  <Text style={styles.modalBtnTextSubmit}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal: Import Playlist */}
        <Modal visible={showImportModal} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Import Playlist</Text>
              <Text style={styles.modalSubtitle}>Paste CSV (Title, Artist) from Spotify or Apple Music</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Playlist Name"
                placeholderTextColor="#8e8e93"
                value={newTitle}
                onChangeText={setNewTitle}
              />
              <TextInput
                style={[styles.modalInput, styles.modalInputMultiline]}
                placeholder="Viva La Vida, Coldplay&#10;Levitating, Dua Lipa"
                placeholderTextColor="#8e8e93"
                value={importCsv}
                onChangeText={setImportCsv}
                multiline
                numberOfLines={4}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnCancel]}
                  onPress={() => setShowImportModal(false)}
                >
                  <Text style={styles.modalBtnTextCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnSubmit]}
                  onPress={handleImport}
                >
                  <Text style={styles.modalBtnTextSubmit}>Import</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    paddingBottom: 140,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fa2d48',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  actionPillText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  listContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1c1c1e',
  },
  iconContainer: {
    width: 36,
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  rowTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  rowCount: {
    color: '#8e8e93',
    fontSize: 13,
    marginTop: 2,
  },
  sectionContainer: {
    marginTop: 28,
    paddingHorizontal: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  losslessBadge: {
    backgroundColor: 'rgba(52, 199, 89, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  losslessBadgeText: {
    color: '#34c759',
    fontSize: 11,
    fontWeight: '700',
  },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  localThumbnail: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#2c2c2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackDetails: {
    flex: 1,
    marginLeft: 12,
  },
  trackTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  trackArtist: {
    color: '#8e8e93',
    fontSize: 12,
    marginTop: 2,
  },
  hiResPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  hiResText: {
    color: '#d1d1d6',
    fontSize: 9,
    fontWeight: '700',
  },
  playIconBtn: {
    padding: 6,
  },
  playlistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 12,
  },
  playlistCard: {
    width: '47%',
  },
  playlistImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: '#1c1c1e',
  },
  playlistPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
  },
  playlistSubtitle: {
    color: '#8e8e93',
    fontSize: 12,
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSubtitle: {
    color: '#8e8e93',
    fontSize: 12,
    marginBottom: 14,
  },
  modalInput: {
    backgroundColor: '#2c2c2e',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 15,
    marginBottom: 12,
  },
  modalInputMultiline: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  modalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalBtnCancel: {
    backgroundColor: '#2c2c2e',
  },
  modalBtnSubmit: {
    backgroundColor: '#fa2d48',
  },
  modalBtnTextCancel: {
    color: '#ffffff',
    fontWeight: '600',
  },
  modalBtnTextSubmit: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
