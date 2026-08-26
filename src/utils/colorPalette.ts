import { StarCluster, ClusterTheme } from '../types';

export const DEFAULT_CLUSTERS: StarCluster[] = [
  'Digital Art',
  'Late Night Poetry',
  'Tech Futures',
  'Cosmic Philosophy',
  'Cybernetics',
];

export const DEFAULT_COSMIC_AVATAR = 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=150&auto=format&fit=crop&q=80';

export const CLUSTERS = DEFAULT_CLUSTERS;

export const CLUSTER_THEMES: Record<string, ClusterTheme> = {
  'Digital Art': {
    name: 'Digital Art',
    color: '#FFD700', // Golden Gold
    glow: 'rgba(255, 215, 0, 0.6)',
    bgBadge: 'bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-400/15 dark:text-amber-200 dark:border-amber-400/30',
    borderColor: '#FFD700',
    description: 'Generative graphics, shaders, algorithmic beauty & cyber-visuals'
  },
  'Late Night Poetry': {
    name: 'Late Night Poetry',
    color: '#FF70A6', // Soft Pink
    glow: 'rgba(255, 112, 166, 0.6)',
    bgBadge: 'bg-pink-100 text-pink-950 border-pink-300 dark:bg-pink-400/15 dark:text-pink-200 dark:border-pink-400/30',
    borderColor: '#FF70A6',
    description: 'Starlight musings, midnight cadence & echoes across lightyears'
  },
  'Tech Futures': {
    name: 'Tech Futures',
    color: '#3A86FF', // Electric Blue
    glow: 'rgba(58, 134, 255, 0.6)',
    bgBadge: 'bg-blue-100 text-blue-950 border-blue-300 dark:bg-blue-400/15 dark:text-blue-200 dark:border-blue-400/30',
    borderColor: '#3A86FF',
    description: 'Dyson spheres, quantum compute & post-planetary horizons'
  },
  'Cosmic Philosophy': {
    name: 'Cosmic Philosophy',
    color: '#06D6A0', // Emerald Green
    glow: 'rgba(6, 214, 160, 0.6)',
    bgBadge: 'bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-400/15 dark:text-emerald-200 dark:border-emerald-400/30',
    borderColor: '#06D6A0',
    description: 'Fermi paradox, temporal entropy, existence in the void'
  },
  'Cybernetics': {
    name: 'Cybernetics',
    color: '#3A86FF', // Electric Blue
    glow: 'rgba(58, 134, 255, 0.6)',
    bgBadge: 'bg-blue-100 text-blue-950 border-blue-300 dark:bg-blue-400/15 dark:text-blue-200 dark:border-blue-400/30',
    borderColor: '#3A86FF',
    description: 'Bio-digital feedback loops, synthetic minds, neural networks'
  },
  'Our Universe': {
    name: 'Our Universe',
    color: '#FFC300', // Warm Neutral Gold
    glow: 'rgba(255, 195, 0, 0.7)',
    bgBadge: 'bg-amber-100 text-amber-950 border-amber-300 dark:bg-gradient-to-r dark:from-amber-500/20 dark:to-yellow-500/20 dark:text-amber-200 dark:border-amber-300/40',
    borderColor: '#FFC300',
    description: 'Private shared spaces, collaborator constellations & secret cosmos'
  },
};

export const UNIVERSE_PRESET_COLORS = [
  { name: 'Golden Gold', hex: '#FFD700', category: 'Creativity / Art' },
  { name: 'Soft Pink', hex: '#FF70A6', category: 'Poetry / Emotions' },
  { name: 'Electric Blue', hex: '#3A86FF', category: 'Tech / Cybernetics' },
  { name: 'Emerald Green', hex: '#06D6A0', category: 'Philosophy / Cosmic Thought' },
  { name: 'Deep Violet', hex: '#8338EC', category: 'Quantum / Research' },
] as const;

export const DEFAULT_UNIVERSE_GLOW = '#FFC300'; // Warm Neutral Gold

export function getDefaultUniverseGlow(universeName: string): string {
  if (!universeName) return DEFAULT_UNIVERSE_GLOW;
  const lower = universeName.toLowerCase().trim();
  if (lower.includes('art') || lower.includes('creativ') || lower.includes('paint') || lower.includes('visual')) {
    return '#FFD700'; // Golden Gold
  }
  if (lower.includes('poet') || lower.includes('emotion') || lower.includes('late night') || lower.includes('verse') || lower.includes('lyric')) {
    return '#FF70A6'; // Soft Pink
  }
  if (lower.includes('tech') || lower.includes('cyber') || lower.includes('sanctuary') || lower.includes('future') || lower.includes('code') || lower.includes('silicon')) {
    return '#3A86FF'; // Electric Blue
  }
  if (lower.includes('phil') || lower.includes('thought') || lower.includes('cosmic') || lower.includes('journal') || lower.includes('nature') || lower.includes('zen')) {
    return '#06D6A0'; // Emerald Green
  }
  if (lower.includes('quantum') || lower.includes('research') || lower.includes('science') || lower.includes('physics') || lower.includes('deep')) {
    return '#8338EC'; // Deep Violet
  }
  return DEFAULT_UNIVERSE_GLOW; // Warm Neutral Gold
}

export const NEON_PALETTE = [
  '#00f3ff', // Cyan Neon
  '#b026ff', // Violet Neon
  '#ffd700', // Solar Gold
  '#ff007f', // Rose Neon
  '#00ff88', // Emerald Neon
  '#ff7b00', // Plasma Orange
  '#38bdf8', // Sky Blue
  '#a855f7', // Purple Neon
  '#ec4899', // Pink Neon
  '#10b981', // Jade Green
  '#f59e0b', // Amber
  '#6366f1', // Indigo
];

export function getDynamicUniverseColor(clusterName: string): string {
  if (CLUSTER_THEMES[clusterName]) {
    return CLUSTER_THEMES[clusterName].color;
  }
  let hash = 0;
  for (let i = 0; i < clusterName.length; i++) {
    hash = (hash << 5) - hash + clusterName.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % NEON_PALETTE.length;
  return NEON_PALETTE[index];
}

export function getClusterTheme(clusterName: string): ClusterTheme {
  if (CLUSTER_THEMES[clusterName]) {
    return CLUSTER_THEMES[clusterName];
  }
  const color = getDynamicUniverseColor(clusterName);
  return {
    name: clusterName,
    color,
    glow: hexToRgba(color, 0.6),
    bgBadge: 'bg-amber-400/15 text-amber-200 border-amber-400/30',
    borderColor: color,
    description: `Cosmic nexus for ${clusterName} ideas and connections`
  };
}

export const MOOD_COLORS = [
  { name: 'Electric Cyan', hex: '#00f3ff' },
  { name: 'Deep Violet', hex: '#8a2be2' },
  { name: 'Neon Pink', hex: '#ff007f' },
  { name: 'Cosmic Amber', hex: '#ffd700' },
  { name: 'Supernova Gold', hex: '#ffaa00' },
  { name: 'Emerald Glow', hex: '#00ff88' },
  { name: 'Crimson Red', hex: '#ff3366' },
  { name: 'Plasma Purple', hex: '#b026ff' },
  { name: 'Stellar Blue', hex: '#0077ff' },
  { name: 'Pure White', hex: '#ffffff' },
];

export function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  const r = parseInt(cleanHex.substring(0, 2), 16) || 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

