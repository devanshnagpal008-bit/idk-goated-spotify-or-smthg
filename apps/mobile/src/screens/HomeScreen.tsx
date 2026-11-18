import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  TextInput
} from 'react-native';
import { Play, Sparkles, Wand2, Music2, Clock } from 'lucide-react-native';
import { getHomeFeed, HomeFeed, Track } from '../services/api';
import { usePlayerStore } from '../stores/usePlayerStore';

export const HomeScreen: React.FC = () => {
  const [feed, setFeed] = useState<HomeFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const { playTrack, currentTrack } = usePlayerStore();

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    try {
      setLoading(true);
      const data = await getHomeFeed();
      setFeed(data);
    } catch (err) {
      console.error('Failed to load home feed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAiPlaylist = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const res = await fetch('http://localhost:8000/api/playlists/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt.trim() })
      });
      const pl = await res.json();
      setIsGenerating(false);
      setShowAiModal(false);
      setAiPrompt('');
      if (pl.tracks && pl.tracks.length > 0) {
        playTrack(pl.tracks[0], pl.tracks);
      }
      loadFeed();
    } catch (e) {
      console.error('AI Playlist generation error:', e);
      setIsGenerating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.largeTitle}>Listen Now</Text>
            <Text style={styles.dateSubtitle}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.aiButton}
            onPress={() => setShowAiModal(true)}
            activeOpacity={0.8}
          >
            <Wand2 size={16} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.aiButtonText}>AI Mix</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#fa2d48" />
          </View>
        ) : (
          <>
            {/* Daily Mixes Carousel (Milestone 4) */}
            {feed && feed.dailyMixes.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Sparkles size={18} color="#fa2d48" style={{ marginRight: 6 }} />
                  <Text style={styles.sectionTitle}>Made For You: Daily Mixes</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                  {feed.dailyMixes.map((mix: any) => (
                    <TouchableOpacity
                      key={mix.id}
                      style={styles.dailyMixCard}
                      activeOpacity={0.8}
                      onPress={() => {
                        if (mix.tracks && mix.tracks.length > 0) {
                          playTrack(mix.tracks[0], mix.tracks);
                        }
                      }}
                    >
                      <View style={styles.mixArtWrapper}>
                        {mix.cover_url ? (
                          <Image source={{ uri: mix.cover_url }} style={styles.mixImage} />
                        ) : (
                          <View style={[styles.mixImage, styles.mixPlaceholder]}>
                            <Music2 size={36} color="#888" />
                          </View>
                        )}
                        <View style={styles.mixPlayOverlay}>
                          <Play size={20} color="#ffffff" fill="#ffffff" />
                        </View>
                      </View>
                      <Text style={styles.mixTitle}>{mix.title}</Text>
                      <Text style={styles.mixSubtitle} numberOfLines={2}>{mix.description}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Quick Picks Section */}
            {feed && feed.quickPicks.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Quick Picks</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                  {feed.quickPicks.slice(0, 10).map((track: Track) => {
                    const isPlayingCurrent = currentTrack?.id === track.id;
                    return (
                      <TouchableOpacity
                        key={track.id}
                        style={styles.card}
                        activeOpacity={0.8}
                        onPress={() => playTrack(track, feed.quickPicks)}
                      >
                        <Image source={{ uri: track.thumbnailUrl }} style={styles.cardImage} />
                        <TouchableOpacity
                          style={styles.cardPlayButton}
                          onPress={() => playTrack(track, feed.quickPicks)}
                        >
                          <Play size={16} color="#ffffff" fill="#ffffff" />
                        </TouchableOpacity>
                        <Text style={[styles.cardTitle, isPlayingCurrent && styles.activeText]} numberOfLines={1}>
                          {track.title}
                        </Text>
                        <Text style={styles.cardArtist} numberOfLines={1}>
                          {track.artist}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Jump Back In Section */}
            {feed && feed.jumpBackIn.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Clock size={16} color="#8e8e93" style={{ marginRight: 6 }} />
                  <Text style={styles.sectionTitle}>Jump Back In</Text>
                </View>
                <View style={styles.verticalList}>
                  {feed.jumpBackIn.map((track: Track) => (
                    <TouchableOpacity
                      key={track.id}
                      style={styles.miniRow}
                      activeOpacity={0.7}
                      onPress={() => playTrack(track, feed.jumpBackIn)}
                    >
                      <Image source={{ uri: track.thumbnailUrl }} style={styles.miniImage} />
                      <View style={styles.miniDetails}>
                        <Text style={styles.miniTitle} numberOfLines={1}>{track.title}</Text>
                        <Text style={styles.miniArtist} numberOfLines={1}>{track.artist}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.miniPlayBtn}
                        onPress={() => playTrack(track, feed.jumpBackIn)}
                      >
                        <Play size={16} color="#fa2d48" fill="#fa2d48" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        {/* Modal: AI Natural Language Playlist Generator */}
        <Modal visible={showAiModal} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeaderRow}>
                <Wand2 size={22} color="#fa2d48" style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>AI Playlist Generator</Text>
              </View>
              <Text style={styles.modalSubtitle}>
                Describe your mood, activity, or favorite vibe and duration:
              </Text>

              <TextInput
                style={styles.modalInput}
                placeholder="e.g. rainy evening jazz, 45 minutes"
                placeholderTextColor="#8e8e93"
                value={aiPrompt}
                onChangeText={setAiPrompt}
                autoFocus
              />

              <View style={styles.promptHints}>
                {['rainy evening jazz, 45m', 'synthwave night drive, 30m', 'acoustic focus'].map((hint) => (
                  <TouchableOpacity
                    key={hint}
                    style={styles.hintPill}
                    onPress={() => setAiPrompt(hint)}
                  >
                    <Text style={styles.hintText}>{hint}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnCancel]}
                  onPress={() => setShowAiModal(false)}
                  disabled={isGenerating}
                >
                  <Text style={styles.modalBtnTextCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnSubmit]}
                  onPress={handleGenerateAiPlaylist}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.modalBtnTextSubmit}>Synthesize</Text>
                  )}
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
  dateSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8e8e93',
    textTransform: 'uppercase',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fa2d48',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#fa2d48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  aiButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  centerContainer: {
    paddingTop: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.4,
  },
  horizontalScroll: {
    paddingHorizontal: 20,
    gap: 14,
  },
  dailyMixCard: {
    width: 160,
  },
  mixArtWrapper: {
    position: 'relative',
    width: 160,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1c1c1e',
  },
  mixImage: {
    width: '100%',
    height: '100%',
  },
  mixPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  mixPlayOverlay: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fa2d48',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
  },
  mixTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
  },
  mixSubtitle: {
    color: '#8e8e93',
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  card: {
    width: 140,
  },
  cardImage: {
    width: 140,
    height: 140,
    borderRadius: 10,
    backgroundColor: '#1c1c1e',
  },
  cardPlayButton: {
    position: 'absolute',
    right: 8,
    top: 104,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fa2d48',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
  activeText: {
    color: '#fa2d48',
  },
  cardArtist: {
    color: '#8e8e93',
    fontSize: 12,
    marginTop: 2,
  },
  verticalList: {
    paddingHorizontal: 20,
    gap: 10,
    marginTop: 10,
  },
  miniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  miniImage: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: '#1c1c1e',
  },
  miniDetails: {
    flex: 1,
    marginLeft: 12,
  },
  miniTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  miniArtist: {
    color: '#8e8e93',
    fontSize: 12,
    marginTop: 2,
  },
  miniPlayBtn: {
    padding: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
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
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: '#8e8e93',
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  modalInput: {
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 15,
  },
  promptHints: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  hintPill: {
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  hintText: {
    color: '#8e8e93',
    fontSize: 11,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  modalBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
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
