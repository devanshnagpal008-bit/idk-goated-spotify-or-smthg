import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Compass, Search as SearchIcon, Library } from 'lucide-react-native';
import { HomeScreen } from './src/screens/HomeScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { MiniPlayer } from './src/components/MiniPlayer';
import { NowPlayingSheet } from './src/components/NowPlayingSheet';
import { usePlayerStore } from './src/stores/usePlayerStore';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'library'>('search');
  const [nowPlayingVisible, setNowPlayingVisible] = useState(false);
  const { error } = usePlayerStore();

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SafeAreaView style={styles.rootContainer} edges={['top', 'left', 'right']}>
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText} numberOfLines={2}>{error}</Text>
          </View>
        )}
        {/* Active Tab Screen */}
        <View style={styles.screenContainer}>
          {activeTab === 'home' && <HomeScreen />}
          {activeTab === 'search' && <SearchScreen />}
          {activeTab === 'library' && <LibraryScreen />}
        </View>

        {/* Persistent Floating Mini-Player */}
        <MiniPlayer onPress={() => setNowPlayingVisible(true)} />

        {/* Full-Screen Apple Music Now Playing Sheet */}
        <NowPlayingSheet
          visible={nowPlayingVisible}
          onClose={() => setNowPlayingVisible(false)}
        />

        {/* Bottom Tab Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => setActiveTab('home')}
            activeOpacity={0.7}
          >
            <Compass size={24} color={activeTab === 'home' ? '#fa2d48' : '#8e8e93'} />
            <Text style={[styles.tabLabel, activeTab === 'home' && styles.tabLabelActive]}>
              Listen Now
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => setActiveTab('search')}
            activeOpacity={0.7}
          >
            <SearchIcon size={24} color={activeTab === 'search' ? '#fa2d48' : '#8e8e93'} />
            <Text style={[styles.tabLabel, activeTab === 'search' && styles.tabLabelActive]}>
              Search
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => setActiveTab('library')}
            activeOpacity={0.7}
          >
            <Library size={24} color={activeTab === 'library' ? '#fa2d48' : '#8e8e93'} />
            <Text style={[styles.tabLabel, activeTab === 'library' && styles.tabLabelActive]}>
              Library
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  screenContainer: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    height: 58,
    backgroundColor: 'rgba(20, 20, 20, 0.96)',
    borderTopWidth: 0.5,
    borderTopColor: '#2c2c2e',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 4,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 10,
    color: '#8e8e93',
    fontWeight: '500',
    marginTop: 3,
  },
  tabLabelActive: {
    color: '#fa2d48',
  },
  errorBanner: {
    backgroundColor: '#dc2626',
    paddingVertical: 10,
    paddingHorizontal: 16,
    zIndex: 9999,
  },
  errorText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
