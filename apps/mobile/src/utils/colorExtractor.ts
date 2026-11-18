/**
 * Generates an Apple Music-style harmonic multi-stop gradient palette
 * from track metadata and artwork.
 */
export interface GradientColors {
  primary: string;
  secondary: string;
  background: string;
  accent: string;
}

export function getArtworkGradientColors(trackId: string, title: string, artist: string): GradientColors {
  // Deterministic seed generation from track string
  const str = `${trackId}-${title}-${artist}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Pre-curated Apple Music vibrant color duos
  const curatedPalettes: GradientColors[] = [
    { primary: '#7b1128', secondary: '#3a0915', background: '#120407', accent: '#fa2d48' }, // Crimson
    { primary: '#1c3d5a', secondary: '#0e1e2d', background: '#050a0f', accent: '#38a169' }, // Deep Teal
    { primary: '#4a154b', secondary: '#240825', background: '#0d020e', accent: '#e01e5a' }, // Magenta Plum
    { primary: '#6b3012', secondary: '#361708', background: '#130802', accent: '#dd6b20' }, // Amber Gold
    { primary: '#183b38', secondary: '#091c1b', background: '#030a09', accent: '#319795' }, // Emerald Glow
    { primary: '#2d1557', secondary: '#16092e', background: '#080312', accent: '#805ad5' }, // Royal Violet
    { primary: '#1a202c', secondary: '#171923', background: '#0d0e12', accent: '#4a5568' }, // Midnight Slate
    { primary: '#63171b', secondary: '#2c0709', background: '#0f0203', accent: '#e53e3e' }, // Ruby Red
  ];

  const index = Math.abs(hash) % curatedPalettes.length;
  return curatedPalettes[index];
}
