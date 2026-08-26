import { Universe, User } from '../types';
import { getDefaultUniverseGlow, DEFAULT_UNIVERSE_GLOW } from './colorPalette';

const STORAGE_KEY = 'constellation_universes_v1';

let cachedUniverses: Universe[] | null = null;

export const INITIAL_UNIVERSES: Universe[] = [
  {
    id: 'universe-digital-art',
    name: 'Digital Art',
    isPrivate: false,
    ownerId: 'seed-ariachen',
    memberIds: ['seed-ariachen', 'seed-elena', 'seed-kaelvoss'],
    glowColor: '#FFD700', // Golden Gold (Creativity / Art)
    description: 'Volumetric shaders, GLSL raymarching, and algorithmic aesthetics.',
  },
  {
    id: 'universe-late-night-poetry',
    name: 'Late Night Poetry',
    isPrivate: false,
    ownerId: 'seed-lyrasolis',
    memberIds: ['seed-lyrasolis', 'seed-devon', 'seed-meilin'],
    glowColor: '#FF70A6', // Soft Pink (Poetry / Emotions)
    description: 'Nocturnal verses, lunar reflections, and starlight echoes.',
  },
  {
    id: 'universe-poetry-club',
    name: 'Poetry Club',
    isPrivate: false,
    ownerId: 'seed-marcus',
    memberIds: ['seed-marcus', 'seed-ariachen', 'seed-yuki'],
    glowColor: '#FF70A6', // Soft Pink (Poetry / Emotions)
    description: 'Collaborative verse and cosmic rhymes.',
  },
  {
    id: 'universe-tech-futures',
    name: 'Tech Futures',
    isPrivate: false,
    ownerId: 'seed-marcus',
    memberIds: ['seed-marcus', 'seed-zara'],
    glowColor: '#3A86FF', // Electric Blue (Tech / Cybernetics)
    description: 'Dyson swarms, warp metrics, and silicon nomad protocols.',
  },
  {
    id: 'universe-cybernetics',
    name: 'Cybernetics',
    isPrivate: false,
    ownerId: 'seed-ren',
    memberIds: ['seed-ren', 'seed-eonzero'],
    glowColor: '#3A86FF', // Electric Blue (Tech / Cybernetics)
    description: 'Bio-digital feedback loops, synthetic minds, and neural meshes.',
  },
  {
    id: 'universe-cyber-sanctuary',
    name: 'Cyber Sanctuary',
    isPrivate: false,
    ownerId: 'seed-eonzero',
    memberIds: ['seed-eonzero', 'seed-ren'],
    glowColor: '#3A86FF', // Electric Blue (Tech / Cybernetics)
    description: 'Encrypted safe haven for neural architects and digital nomads.',
  },
  {
    id: 'universe-cosmic-philosophy',
    name: 'Cosmic Philosophy',
    isPrivate: false,
    ownerId: 'seed-sthorne',
    memberIds: ['seed-sthorne', 'seed-ariachen'],
    glowColor: '#06D6A0', // Emerald Green (Philosophy / Cosmic Thought)
    description: 'Fermi solitudes, temporal entropy, and existential wonder.',
  },
  {
    id: 'universe-personal-journal',
    name: 'Personal Journal',
    isPrivate: true,
    ownerId: 'guest-explorer',
    memberIds: ['guest-explorer'],
    glowColor: '#06D6A0', // Emerald Green (Philosophy / Personal Thought)
    description: 'Private reflective sanctuary for nocturnal insights.',
  },
  {
    id: 'universe-quantum-research',
    name: 'Quantum Research',
    isPrivate: false,
    ownerId: 'seed-ariachen',
    memberIds: ['seed-ariachen', 'seed-marcus', 'seed-elena'],
    glowColor: '#8338EC', // Deep Violet (Quantum / Research)
    description: 'Quantum superposition, entanglement arrays, and string horizons.',
  },
  {
    id: 'universe-our-universe',
    name: 'Our Universe',
    isPrivate: false,
    ownerId: 'guest-explorer',
    memberIds: ['guest-explorer', 'seed-ariachen', 'seed-marcus'],
    glowColor: '#FFC300', // Warm Neutral Gold (Default / Multi-Universe)
    description: 'Collaborative constellation space connecting stargazers.',
  },
];

export function getStoredUniverses(): Universe[] {
  if (cachedUniverses) {
    return cachedUniverses;
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure all items have a valid glowColor
        cachedUniverses = parsed.map((u: Universe) => ({
          ...u,
          glowColor: u.glowColor || getDefaultUniverseGlow(u.name),
        }));
        return cachedUniverses;
      }
    }
  } catch {
    // ignore
  }
  cachedUniverses = INITIAL_UNIVERSES;
  return cachedUniverses;
}

export function invalidateUniversesCache(): void {
  cachedUniverses = null;
}

export function getUniverseGlowByName(universeName?: string): string {
  if (!universeName) return DEFAULT_UNIVERSE_GLOW;
  const list = getStoredUniverses();
  const found = list.find((u) => u.name.trim().toLowerCase() === universeName.trim().toLowerCase());
  if (found && found.glowColor) {
    return found.glowColor;
  }
  return getDefaultUniverseGlow(universeName);
}

export function saveUniverse(universe: Universe): Universe[] {
  const list = getStoredUniverses();
  const safeUniverse: Universe = {
    ...universe,
    glowColor: universe.glowColor || getDefaultUniverseGlow(universe.name),
  };
  const existingIdx = list.findIndex(
    (u) => u.id === safeUniverse.id || u.name.trim().toLowerCase() === safeUniverse.name.trim().toLowerCase()
  );
  let updated: Universe[];
  if (existingIdx >= 0) {
    updated = [...list];
    updated[existingIdx] = {
      ...updated[existingIdx],
      ...safeUniverse,
      memberIds: Array.from(new Set([...(updated[existingIdx].memberIds || []), ...(safeUniverse.memberIds || [])])),
    };
  } else {
    updated = [safeUniverse, ...list];
  }
  cachedUniverses = updated;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
  return updated;
}

export function getUserUniverses(currentUser: User | null, isPrivate?: boolean): Universe[] {
  const all = getStoredUniverses();
  if (!currentUser) {
    return all.filter((u) => (isPrivate !== undefined ? u.isPrivate === isPrivate : true));
  }

  return all.filter((u) => {
    if (isPrivate !== undefined && u.isPrivate !== isPrivate) return false;
    // User is owner or member, or it's a seed universe
    const isOwner = u.ownerId === currentUser.id;
    const isMember = (u.memberIds || []).includes(currentUser.id);
    const isSeed = u.ownerId.startsWith('seed-') || u.ownerId === 'guest-explorer';
    return isOwner || isMember || isSeed;
  });
}
