import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { Mic2, AlertCircle } from 'lucide-react-native';
import { usePlayerStore } from '../stores/usePlayerStore';
import { API_BASE_URL } from '../services/api';

interface LyricsLine {
  time_ms: number;
  text: string;
}

interface LyricsData {
  is_synced: boolean;
  lines: LyricsLine[];
  plain_lyrics?: string;
  provider: string;
}

export const LyricsView: React.FC = () => {
  const { currentTrack, positionMillis, seekTo } = usePlayerStore();
  const [lyricsData, setLyricsData] = useState<LyricsData | null>(null);
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<any>(null);

  useEffect(() => {
    if (currentTrack) {
      loadLyrics();
    }
  }, [currentTrack?.id]);

  const loadLyrics = async () => {
    if (!currentTrack) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        title: currentTrack.title,
        artist: currentTrack.artist,
      });
      if (currentTrack.album) params.append('album', currentTrack.album);
      if (currentTrack.durationSeconds) params.append('duration', String(currentTrack.durationSeconds));
      if (currentTrack.sourceId) params.append('video_id', currentTrack.sourceId);

      const res = await fetch(`${API_BASE_URL}/lyrics?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLyricsData(data);
      }
    } catch (e) {
      console.error('Failed to load lyrics:', e);
    } finally {
      setLoading(false);
    }
  };

  // Find active line index based on positionMillis
  const activeLineIndex = lyricsData?.lines
    ? lyricsData.lines.reduce((acc, line, idx) => {
        if (positionMillis >= line.time_ms) {
          return idx;
        }
        return acc;
      }, 0)
    : 0;

  // Auto-scroll to keep active line centered
  useEffect(() => {
    if (lyricsData?.is_synced && scrollViewRef.current && activeLineIndex > 0) {
      scrollViewRef.current.scrollTo({
        y: Math.max(0, activeLineIndex * 54 - 150),
        animated: true,
      });
    }
  }, [activeLineIndex, lyricsData?.is_synced]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#fa2d48" />
        <Text style={styles.statusText}>Connecting to LRCLIB & YouTube...</Text>
      </View>
    );
  }

  if (!lyricsData || (!lyricsData.lines.length && !lyricsData.plain_lyrics)) {
    return (
      <View style={styles.centerContainer}>
        <Mic2 size={48} color="#3a3a3c" />
        <Text style={styles.emptyTitle}>Lyrics Unavailable</Text>
        <Text style={styles.emptySubtitle}>No synchronized lyrics found for this track.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {lyricsData.is_synced ? (
        lyricsData.lines.map((line, idx) => {
          const isActive = idx === activeLineIndex;
          const isPast = idx < activeLineIndex;

          return (
            <TouchableOpacity
              key={`${line.time_ms}-${idx}`}
              onPress={() => seekTo(line.time_ms)}
              activeOpacity={0.7}
              style={[styles.lineWrapper, isActive && styles.activeLineWrapper]}
            >
              <Text
                style={[
                  styles.lyricText,
                  isActive && styles.activeLyricText,
                  isPast && styles.pastLyricText,
                ]}
              >
                {line.text}
              </Text>
            </TouchableOpacity>
          );
        })
      ) : (
        <View style={styles.plainContainer}>
          <Text style={styles.plainLyricsText}>{lyricsData.plain_lyrics}</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 28,
  },
  content: {
    paddingVertical: 40,
    paddingBottom: 100,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  statusText: {
    color: '#8e8e93',
    fontSize: 14,
    marginTop: 12,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 14,
  },
  emptySubtitle: {
    color: '#8e8e93',
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
  lineWrapper: {
    paddingVertical: 10,
  },
  activeLineWrapper: {
    transform: [{ scale: 1.03 }],
  },
  lyricText: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  activeLyricText: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 40,
    textShadowColor: 'rgba(250, 45, 72, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  pastLyricText: {
    color: 'rgba(255, 255, 255, 0.3)',
  },
  plainContainer: {
    paddingVertical: 20,
  },
  plainLyricsText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '500',
  },
});
