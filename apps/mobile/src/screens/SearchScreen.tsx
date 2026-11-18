import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Keyboard
} from 'react-native';
import { Search as SearchIcon, X, Play, Music, MoreVertical } from 'lucide-react-native';
import { searchCatalog, Track } from '../services/api';
import { usePlayerStore } from '../stores/usePlayerStore';

export const SearchScreen: React.FC = () => {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const { currentTrack, isPlaying, playTrack, addToQueue, playTrackNext } = usePlayerStore();

  const handleSearch = useCallback(async (searchQuery: string, type: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      const data = await searchCatalog(searchQuery.trim(), type === 'all' ? undefined : type, 25);
      setResults(data.songs || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        handleSearch(query, filterType);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query, filterType, handleSearch]);

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const renderTrackItem = ({ item }: { item: Track }) => {
    const isCurrent = currentTrack?.id === item.id;

    return (
      <TouchableOpacity
        style={[styles.trackItem, isCurrent && styles.trackItemActive]}
        activeOpacity={0.7}
        onPress={() => playTrack(item, results)}
      >
        <View style={styles.thumbnailContainer}>
          {item.thumbnailUrl ? (
            <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
          ) : (
            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
              <Music color="#888" size={20} />
            </View>
          )}
          {isCurrent && (
            <View style={styles.playingOverlay}>
              <Play size={16} color="#fa2d48" fill="#fa2d48" />
            </View>
          )}
        </View>

        <View style={styles.trackDetails}>
          <Text
            style={[styles.trackTitle, isCurrent && styles.activeText]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.title}
          </Text>
          <Text style={styles.trackSubtitle} numberOfLines={1} ellipsizeMode="tail">
            {item.artist} {item.album ? `• ${item.album}` : ''}
          </Text>
        </View>

        <Text style={styles.durationText}>{formatDuration(item.durationSeconds)}</Text>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => addToQueue(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MoreVertical size={18} color="#8e8e93" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.largeTitle}>Search</Text>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBar}>
          <SearchIcon size={18} color="#8e8e93" style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder="Artists, Songs, Lyrics, and More"
            placeholderTextColor="#8e8e93"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            onSubmitEditing={() => {
              Keyboard.dismiss();
              handleSearch(query, filterType);
            }}
            clearButtonMode="while-editing"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} style={styles.clearButton}>
              <X size={16} color="#8e8e93" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Category Pills */}
      <View style={styles.pillsRow}>
        {['all', 'songs', 'albums', 'artists'].map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.pill, filterType === type && styles.pillActive]}
            onPress={() => setFilterType(type)}
          >
            <Text style={[styles.pillText, filterType === type && styles.pillTextActive]}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#fa2d48" />
          <Text style={styles.loadingText}>Searching YouTube Music catalog...</Text>
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderTrackItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : hasSearched ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyTitle}>No Results Found</Text>
          <Text style={styles.emptySubtitle}>Try searching for a different song, artist, or album.</Text>
        </View>
      ) : (
        <View style={styles.centerContainer}>
          <Music size={54} color="#3a3a3c" />
          <Text style={styles.emptyTitle}>Explore Millions of Songs</Text>
          <Text style={styles.emptySubtitle}>
            Full YouTube Music catalog with high-fidelity stream resolution.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.8,
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  pillsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1c1c1e',
  },
  pillActive: {
    backgroundColor: '#fa2d48',
  },
  pillText: {
    color: '#8e8e93',
    fontSize: 13,
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#ffffff',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 140, // Space for mini-player and tabs
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1c1c1e',
  },
  trackItemActive: {
    backgroundColor: 'rgba(250, 45, 72, 0.08)',
    borderRadius: 8,
  },
  thumbnailContainer: {
    position: 'relative',
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: '#2c2c2e',
  },
  thumbnailPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  playingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackDetails: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  trackTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  activeText: {
    color: '#fa2d48',
  },
  trackSubtitle: {
    color: '#8e8e93',
    fontSize: 13,
    marginTop: 3,
  },
  durationText: {
    color: '#636366',
    fontSize: 13,
    marginRight: 10,
  },
  actionButton: {
    padding: 6,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: 60,
  },
  loadingText: {
    color: '#8e8e93',
    fontSize: 14,
    marginTop: 14,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
  },
  emptySubtitle: {
    color: '#8e8e93',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});
