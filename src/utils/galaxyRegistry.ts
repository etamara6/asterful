import { Galaxy } from '../types/galaxy';

const GALAXY_STORAGE_KEY = 'constellation_galaxies_v1';

export const INITIAL_GALAXIES: Galaxy[] = [
  {
    id: 'galaxy-astrophotography',
    name: 'AstroPhotography',
    tag: '#AstroPhotography',
    description: 'Deep sky long-exposures, stellar nebulae, planetary imaging, and telescope telemetry.',
    icon: '🔭',
    category: 'Science & Cosmos',
    glowColor: '#38BDF8',
    memberIds: ['seed-elena', 'seed-ariachen', 'seed-marcus', 'seed-kaelvoss'],
    creatorId: 'seed-elena',
    createdAt: '2026-01-15',
    rules: [
      'Share telescope specs, exposure duration, and processing filters where possible.',
      'Constructive feedback on astrophoto stacking and star alignment is encouraged.',
      'Respect original celestial captures.'
    ]
  },
  {
    id: 'galaxy-coding',
    name: 'Coding',
    tag: '#Coding',
    description: 'Algorithmic systems, TypeScript frameworks, GLSL shaders, compilers, and distributed compute protocols.',
    icon: '💻',
    category: 'Code & Dev',
    glowColor: '#3A86FF',
    memberIds: ['seed-marcus', 'seed-ariachen', 'seed-ren', 'seed-eonzero'],
    creatorId: 'seed-marcus',
    createdAt: '2026-01-10',
    rules: [
      'Keep code snippets legible and provide context.',
      'Celebrate elegant algorithms and creative development.',
      'Be respectful to all coders from novices to neural architects.'
    ]
  },
  {
    id: 'galaxy-bioinformatics',
    name: 'Bioinformatics',
    tag: '#Bioinformatics',
    description: 'Genomic sequencing, protein folding simulations, neural mapping, and synthetic biological circuits.',
    icon: '🧬',
    category: 'Science & Cosmos',
    glowColor: '#10B981',
    memberIds: ['seed-ariachen', 'seed-meilin', 'seed-sthorne'],
    creatorId: 'seed-ariachen',
    createdAt: '2026-01-18',
    rules: [
      'Ground hypotheses in biological or computational principles.',
      'Link datasets and open-source models when sharing breakthroughs.',
      'Foster open scientific inquiry across the galaxy.'
    ]
  },
  {
    id: 'galaxy-general',
    name: 'General',
    tag: '#General',
    description: 'The universal town square for all cosmos explorers. Open reflections, welcoming signals, and stargazing.',
    icon: '🌌',
    category: 'General',
    glowColor: '#FFD700',
    memberIds: ['seed-ariachen', 'seed-elena', 'seed-marcus', 'seed-lyrasolis', 'seed-ren', 'guest-explorer'],
    creatorId: 'seed-ariachen',
    createdAt: '2026-01-01',
    rules: [
      'Abide by the Cosmic Code.',
      'Be welcoming to new explorers entering the universe.',
      'Keep discussions thoughtful and constructive.'
    ]
  },
  {
    id: 'galaxy-digital-art',
    name: 'Digital Art',
    tag: '#DigitalArt',
    description: 'Generative art, 3D volumetric shaders, visual synthesis, and starlight canvas explorations.',
    icon: '🎨',
    category: 'Art & Creation',
    glowColor: '#F59E0B',
    memberIds: ['seed-ariachen', 'seed-kaelvoss', 'seed-yuki'],
    creatorId: 'seed-ariachen',
    createdAt: '2026-01-20',
    rules: [
      'Credit inspiration and collaborative remix origins.',
      'All digital mediums and creative visualizers are welcome.'
    ]
  },
  {
    id: 'galaxy-late-night-poetry',
    name: 'Late Night Poetry',
    tag: '#LateNightPoetry',
    description: 'Nocturnal verses, lunar reflections, philosophical strophes, and starlight echoes.',
    icon: '📜',
    category: 'Philosophy & Writing',
    glowColor: '#EC4899',
    memberIds: ['seed-lyrasolis', 'seed-devon', 'seed-meilin'],
    creatorId: 'seed-lyrasolis',
    createdAt: '2026-01-22',
    rules: [
      'Express with authenticity and emotional depth.',
      'Support fellow poets and starlight bards.'
    ]
  },
  {
    id: 'galaxy-tech-futures',
    name: 'Tech Futures',
    tag: '#TechFutures',
    description: 'Dyson swarms, interstellar propulsion metrics, silicon nomad networks, and futuristic quantum tech.',
    icon: '🚀',
    category: 'Code & Dev',
    glowColor: '#8B5CF6',
    memberIds: ['seed-marcus', 'seed-zara', 'seed-eonzero'],
    creatorId: 'seed-marcus',
    createdAt: '2026-01-25',
    rules: [
      'Explore speculative technology with curiosity.',
      'Share futuristic papers, telemetry data, and visionary concepts.'
    ]
  },
  {
    id: 'galaxy-cosmic-philosophy',
    name: 'Cosmic Philosophy',
    tag: '#CosmicPhilosophy',
    description: 'Fermi paradoxes, entropy, temporal relativity, consciousness, and the ontology of space-time.',
    icon: '✨',
    category: 'Philosophy & Writing',
    glowColor: '#06D6A0',
    memberIds: ['seed-sthorne', 'seed-ariachen', 'seed-lyrasolis'],
    creatorId: 'seed-sthorne',
    createdAt: '2026-01-28',
    rules: [
      'Maintain intellectual humility and deep curiosity.',
      'Engage with diverse metaphysical and cosmological viewpoints.'
    ]
  }
];

export const GALAXY_UPDATE_EVENT = 'constellation_galaxies_updated';

export function getStoredGalaxies(): Galaxy[] {
  try {
    const saved = localStorage.getItem(GALAXY_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure all seeded galaxies exist
        const map = new Map<string, Galaxy>();
        INITIAL_GALAXIES.forEach((g) => map.set(g.id, g));
        parsed.forEach((g: Galaxy) => map.set(g.id, g));
        return Array.from(map.values());
      }
    }
  } catch {
    // ignore
  }
  return INITIAL_GALAXIES;
}

export function saveGalaxy(galaxy: Galaxy): Galaxy[] {
  const current = getStoredGalaxies();
  const index = current.findIndex((g) => g.id === galaxy.id);
  let updated: Galaxy[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = galaxy;
  } else {
    updated = [galaxy, ...current];
  }
  try {
    localStorage.setItem(GALAXY_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event(GALAXY_UPDATE_EVENT));
  } catch {
    // ignore
  }
  return updated;
}

export function toggleJoinGalaxy(galaxyId: string, userId: string): Galaxy[] {
  if (!userId) return getStoredGalaxies();
  const current = getStoredGalaxies();
  const updated = current.map((g) => {
    if (g.id === galaxyId) {
      const isMember = (g.memberIds || []).includes(userId);
      const newMembers = isMember
        ? (g.memberIds || []).filter((id) => id !== userId)
        : Array.from(new Set([...(g.memberIds || []), userId]));
      return {
        ...g,
        memberIds: newMembers,
      };
    }
    return g;
  });

  try {
    localStorage.setItem(GALAXY_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event(GALAXY_UPDATE_EVENT));
  } catch {
    // ignore
  }
  return updated;
}

export function isUserMemberOfGalaxy(galaxy: Galaxy, userId?: string | null): boolean {
  if (!userId || !galaxy.memberIds) return false;
  return galaxy.memberIds.includes(userId);
}

export function getGalaxyById(galaxyId: string): Galaxy | undefined {
  const all = getStoredGalaxies();
  return all.find((g) => g.id === galaxyId);
}

export function getGalaxyByTagOrName(query: string): Galaxy | undefined {
  if (!query) return undefined;
  const clean = query.trim().toLowerCase().replace(/^#/, '');
  const all = getStoredGalaxies();
  return all.find(
    (g) =>
      g.name.toLowerCase() === clean ||
      g.tag.toLowerCase().replace(/^#/, '') === clean ||
      g.id.toLowerCase() === clean
  );
}
