import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Switch,
  ScrollView
} from 'react-native';
import { X, Sliders, Volume2, Shuffle, Check } from 'lucide-react-native';

interface AudioSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const EQ_PRESETS = [
  { name: 'Flat', curve: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { name: 'Bass Boost', curve: [6, 5, 4, 2, 0, 0, 0, 1, 2, 3] },
  { name: 'Vocal Enhancer', curve: [-2, -1, 0, 2, 4, 5, 4, 2, 1, 0] },
  { name: 'Acoustic', curve: [3, 2, 1, 0, 2, 3, 3, 4, 3, 2] },
  { name: 'Electronic', curve: [5, 4, 2, 0, -1, 2, 3, 4, 5, 5] },
  { name: 'Rock', curve: [4, 3, 1, -1, 0, 1, 2, 3, 4, 4] },
  { name: 'Jazz', curve: [2, 1, 0, 1, 2, 2, 1, 2, 3, 3] },
];

const CROSSFADE_STEPS = [0, 2, 4, 6, 8, 12];

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({ visible, onClose }) => {
  const [loudnessNorm, setLoudnessNorm] = useState(true);
  const [crossfadeSec, setCrossfadeSec] = useState(4);
  const [activePreset, setActivePreset] = useState('Bass Boost');

  const selectedPreset = EQ_PRESETS.find(p => p.name === activePreset) || EQ_PRESETS[0];

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Audio & Polish</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Loudness Normalization */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardIconTitle}>
                <Volume2 size={20} color="#fa2d48" style={{ marginRight: 8 }} />
                <Text style={styles.cardTitle}>Loudness Normalization</Text>
              </View>
              <Switch
                value={loudnessNorm}
                onValueChange={setLoudnessNorm}
                trackColor={{ false: '#3a3a3c', true: '#fa2d48' }}
                thumbColor="#ffffff"
              />
            </View>
            <Text style={styles.cardDescription}>
              Applies YouTube's loudness metadata (ReplayGain) to prevent sudden volume jumps across tracks.
            </Text>
          </View>

          {/* Configurable Crossfade */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardIconTitle}>
                <Shuffle size={20} color="#fa2d48" style={{ marginRight: 8 }} />
                <Text style={styles.cardTitle}>Crossfade Transitions</Text>
              </View>
              <Text style={styles.badgeValue}>{crossfadeSec === 0 ? 'Off' : `${crossfadeSec}s`}</Text>
            </View>
            <Text style={styles.cardDescription}>
              Smoothly blends the ending track with the incoming track.
            </Text>
            <View style={styles.stepRow}>
              {CROSSFADE_STEPS.map(sec => (
                <TouchableOpacity
                  key={sec}
                  style={[styles.stepButton, crossfadeSec === sec && styles.stepButtonActive]}
                  onPress={() => setCrossfadeSec(sec)}
                >
                  <Text style={[styles.stepText, crossfadeSec === sec && styles.stepTextActive]}>
                    {sec === 0 ? 'Off' : `${sec}s`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 10-Band EQ Presets */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardIconTitle}>
                <Sliders size={20} color="#fa2d48" style={{ marginRight: 8 }} />
                <Text style={styles.cardTitle}>10-Band Equalizer</Text>
              </View>
              <Text style={styles.badgeValue}>{activePreset}</Text>
            </View>

            {/* EQ Frequency Visualizer */}
            <View style={styles.eqVisualizer}>
              {selectedPreset.curve.map((gain, idx) => {
                const heightPercent = Math.max(15, Math.min(100, 50 + gain * 8));
                return (
                  <View key={idx} style={styles.barCol}>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { height: `${heightPercent}%` }]} />
                    </View>
                    <Text style={styles.freqLabel}>
                      {['32', '64', '125', '250', '500', '1k', '2k', '4k', '8k', '16k'][idx]}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Presets List */}
            <View style={styles.presetsGrid}>
              {EQ_PRESETS.map(preset => (
                <TouchableOpacity
                  key={preset.name}
                  style={[styles.presetChip, activePreset === preset.name && styles.presetChipActive]}
                  onPress={() => setActivePreset(preset.name)}
                >
                  <Text style={[styles.presetText, activePreset === preset.name && styles.presetTextActive]}>
                    {preset.name}
                  </Text>
                  {activePreset === preset.name && (
                    <Check size={14} color="#ffffff" style={{ marginLeft: 4 }} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
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
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1c1c1e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#1c1c1e',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardIconTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  cardDescription: {
    fontSize: 13,
    color: '#8e8e93',
    marginTop: 6,
    lineHeight: 18,
  },
  badgeValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fa2d48',
    backgroundColor: 'rgba(250, 45, 72, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stepRow: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 8,
    justifyContent: 'space-between',
  },
  stepButton: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#2c2c2e',
    borderRadius: 8,
    alignItems: 'center',
  },
  stepButtonActive: {
    backgroundColor: '#fa2d48',
  },
  stepText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8e8e93',
  },
  stepTextActive: {
    color: '#ffffff',
  },
  eqVisualizer: {
    flexDirection: 'row',
    height: 90,
    marginTop: 18,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 6,
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
  },
  barTrack: {
    width: 8,
    height: 70,
    backgroundColor: '#2c2c2e',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: '#fa2d48',
    borderRadius: 4,
  },
  freqLabel: {
    color: '#636366',
    fontSize: 9,
    marginTop: 4,
    fontWeight: '600',
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#2c2c2e',
    borderRadius: 16,
  },
  presetChipActive: {
    backgroundColor: '#fa2d48',
  },
  presetText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8e8e93',
  },
  presetTextActive: {
    color: '#ffffff',
  },
});
