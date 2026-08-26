import { User } from '../types';
import { INITIAL_STARS } from '../data/initialStars';
import { DEFAULT_COSMIC_AVATAR } from './colorPalette';

export const REGISTERED_USERS_KEY = 'asterful_registered_users';
export const LEGACY_REGISTERED_USERS_KEY = 'constellation_registered_users_v1';
const STARS_STORAGE_KEY = 'constellation_stars_v1';

let cachedUsersList: User[] | null = null;

export interface RegisteredUserProfile {
  id?: string;
  displayName: string;
  handle?: string;
  email?: string;
}

export const INITIAL_CREATORS: User[] = [
  {
    id: 'user-aria-chen',
    displayName: 'Aria Chen',
    username: 'Aria Chen',
    handle: 'ariachen',
    email: 'aria@cosmos.space',
    password: 'password123',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80',
    bio: 'Visual artist and creative coder exploring volumetric shaders and GLSL simulations in deep space.',
    quote: 'Volumetric distance fields capturing stellar nurseries in real-time GLSL.',
    websiteUrl: 'https://glsl-nebula.art',
    portalUrl: 'https://glsl-nebula.art',
    joinedAt: '3 months ago',
    glowColor: '#FFD700',
    isVerified: true,
    role: 'MODERATOR',
    followers: ['user-lyra-solis', 'user-elena-rostova'],
    following: ['user-elena-rostova', 'user-marcus-vance'],
  },
  {
    id: 'user-lyra-solis',
    displayName: 'Lyra Solis',
    username: 'Lyra Solis',
    handle: 'lyrasolis',
    email: 'lyra@cosmos.space',
    password: 'password123',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
    bio: 'Late night poet listening to ancient starlight whispers across the Orion arm.',
    quote: 'We are just echoes catching up with ancient fire.',
    websiteUrl: 'https://starlight-poetics.cosmos',
    portalUrl: 'https://starlight-poetics.cosmos',
    joinedAt: '2 months ago',
    glowColor: '#FFA726',
    isVerified: true,
    role: 'EXPLORER',
    followers: ['user-devon-mercer', 'user-mei-lin', 'user-aria-chen'],
    following: ['user-devon-mercer', 'user-aria-chen'],
  },
  {
    id: 'user-marcus-vance',
    displayName: 'Dr. Marcus Vance',
    username: 'Dr. Marcus Vance',
    handle: 'marcus_vance',
    email: 'marcus@cosmos.space',
    password: 'password123',
    avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1200&auto=format&fit=crop&q=80',
    bio: 'Astrophysicist designing Dyson Swarm mesh protocols and Alcubierre topologies.',
    quote: 'Architecting decentralized laser telemetry for 100,000 mirrors orbiting solar latitudes.',
    websiteUrl: 'https://dyson-mesh.cosmos',
    portalUrl: 'https://dyson-mesh.cosmos',
    joinedAt: '4 months ago',
    glowColor: '#FFE57F',
    isVerified: true,
    role: 'ADMIN',
    followers: ['user-zara-novak', 'user-aria-chen'],
    following: ['user-zara-novak', 'user-prof-thorne'],
  },
  {
    id: 'user-elena-rostova',
    displayName: 'Elena Rostova',
    username: 'Elena Rostova',
    handle: 'elena_glsl',
    email: 'elena@cosmos.space',
    password: 'password123',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=1200&auto=format&fit=crop&q=80',
    bio: 'Fractal mathematician and recursive geometry explorer.',
    quote: 'Mandelbulb transformations iterated infinitely in polar coordinates.',
    websiteUrl: 'https://fractal-geometry.io',
    portalUrl: 'https://fractal-geometry.io',
    joinedAt: '1 month ago',
    glowColor: '#FFD700',
    isVerified: true,
    role: 'EXPLORER',
    followers: ['user-aria-chen'],
    following: ['user-aria-chen', 'user-julian-thorne'],
  },
  {
    id: 'user-devon-mercer',
    displayName: 'Devon Mercer',
    username: 'Devon Mercer',
    handle: 'devon_night',
    email: 'devon@cosmos.space',
    password: 'password123',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1538370965046-79c0d6907d47?w=1200&auto=format&fit=crop&q=80',
    bio: 'Charting the dark side of forgotten moons and quiet midnight reveries.',
    quote: 'We keep tidal locks with people we used to love.',
    joinedAt: '3 months ago',
    glowColor: '#FFD700',
    isVerified: false,
    role: 'EXPLORER',
    followers: ['user-lyra-solis'],
    following: ['user-lyra-solis', 'user-mei-lin'],
  },
  {
    id: 'user-eon-zero',
    displayName: 'Eon Zero',
    username: 'Eon Zero',
    handle: 'eon_zero',
    email: 'eon@cosmos.space',
    password: 'password123',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1200&auto=format&fit=crop&q=80',
    bio: 'Quantum cyberneticist researching microtubule coherence in synthetic neural nets.',
    quote: 'We are not discrete observers; we are the universe observing itself.',
    websiteUrl: 'https://quantum-cybernetics.net',
    portalUrl: 'https://quantum-cybernetics.net',
    joinedAt: '5 months ago',
    glowColor: '#FFD700',
    isVerified: true,
    role: 'EXPLORER',
    followers: ['user-ren-tanaka', 'user-nadia-becker'],
    following: ['user-ren-tanaka', 'user-marcus-vance'],
  },
  {
    id: 'user-zara-novak',
    displayName: 'Zara Novak',
    username: 'Zara Novak',
    handle: 'zaranovak',
    email: 'zara@cosmos.space',
    password: 'password123',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1447433589675-4aaa569f3e05?w=1200&auto=format&fit=crop&q=80',
    bio: 'Silicon nomad engineer sending evolutionary neural probes into the Oort cloud.',
    quote: 'When humanity sleeps, our machines harvest iron from the Oort cloud.',
    joinedAt: '2 months ago',
    glowColor: '#FFE57F',
    isVerified: false,
    role: 'EXPLORER',
    followers: ['user-marcus-vance'],
    following: ['user-marcus-vance'],
  },
  {
    id: 'user-prof-thorne',
    displayName: 'Professor S. Thorne',
    username: 'Professor S. Thorne',
    handle: 'sthorne_cosmo',
    email: 'thorne@cosmos.space',
    password: 'password123',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1200&auto=format&fit=crop&q=80',
    bio: 'Cosmologist reflecting on Fermi paradox silence and cosmic solitude.',
    quote: 'Either intelligence is a fragile miracle, or they are listening in profound silence.',
    websiteUrl: 'https://cosmic-solitude.org',
    portalUrl: 'https://cosmic-solitude.org',
    joinedAt: '6 months ago',
    glowColor: '#FFC107',
    isVerified: true,
    role: 'MODERATOR',
    followers: ['user-nadia-becker', 'user-marcus-vance'],
    following: ['user-nadia-becker'],
  },
  {
    id: 'user-nadia-becker',
    displayName: 'Nadia Becker',
    username: 'Nadia Becker',
    handle: 'nadiabecker',
    email: 'nadia@cosmos.space',
    password: 'password123',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1200&auto=format&fit=crop&q=80',
    bio: 'Philosopher exploring negative entropy and consciousness in the cosmos.',
    quote: 'To create art is to resist the thermal equilibrium of the void.',
    joinedAt: '4 months ago',
    glowColor: '#FFA726',
    isVerified: false,
    role: 'EXPLORER',
    followers: ['user-prof-thorne'],
    following: ['user-prof-thorne', 'user-eon-zero'],
  },
  {
    id: 'user-ren-tanaka',
    displayName: 'Ren Tanaka',
    username: 'Ren Tanaka',
    handle: 'rentanaka',
    email: 'ren@cosmos.space',
    password: 'password123',
    avatarUrl: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=1200&auto=format&fit=crop&q=80',
    bio: 'Bio-digital engineer linking organoid cortical cultures to silicon architectures.',
    quote: 'Learning emerges organically when synthetic synapses feel resonance.',
    joinedAt: '3 months ago',
    glowColor: '#F59E0B',
    isVerified: true,
    role: 'EXPLORER',
    followers: ['user-eon-zero'],
    following: ['user-eon-zero'],
  },
  {
    id: 'user-mei-lin',
    displayName: 'Mei Lin',
    username: 'Mei Lin',
    handle: 'meilin_words',
    email: 'mei@cosmos.space',
    password: 'password123',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80',
    bio: 'Wordsmith weaving tea, silence, and stardust at 3 AM.',
    quote: 'In the silence of the glowing terminal, the universe breathed in.',
    joinedAt: '1 month ago',
    glowColor: '#FFE57F',
    isVerified: false,
    role: 'EXPLORER',
    followers: ['user-devon-mercer'],
    following: ['user-lyra-solis'],
  },
  {
    id: 'user-kaelen-voss',
    displayName: 'Kaelen Voss',
    username: 'Kaelen Voss',
    handle: 'kaelvoss',
    email: 'kael@cosmos.space',
    password: 'password123',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
    bio: 'Cybernetic glitch sculptor and raster topologist.',
    quote: 'When color channels drift across time vertices, digital artifacts become tactile memories.',
    joinedAt: '2 months ago',
    glowColor: '#FFE57F',
    isVerified: false,
    role: 'EXPLORER',
    followers: [],
    following: ['user-aria-chen'],
  },
  {
    id: 'user-julian-thorne',
    displayName: 'Julian Thorne',
    username: 'Julian Thorne',
    handle: 'julian_pulse',
    email: 'julian@cosmos.space',
    password: 'password123',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1200&auto=format&fit=crop&q=80',
    bio: 'Sound designer weaving cymatic frequencies into glowing stardust.',
    quote: 'Mapping Fourier spectral transforms into vibrating Chladni plate coordinates.',
    joinedAt: '2 months ago',
    glowColor: '#FFE57F',
    isVerified: false,
    role: 'EXPLORER',
    followers: ['user-elena-rostova'],
    following: ['user-aria-chen'],
  },
  {
    id: 'user-nova-vance',
    displayName: 'Nova Vance',
    username: 'Nova Vance',
    handle: 'novavance',
    email: 'nova@stargazer.space',
    password: 'password123',
    avatarUrl: DEFAULT_COSMIC_AVATAR,
    bannerUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1200&auto=format&fit=crop&q=80',
    bio: 'Astronomical voyager mapping celestial coordinates across the outer spirals.',
    quote: 'Every thought is a beacon igniting unseen pathways in the dark.',
    joinedAt: '1 month ago',
    glowColor: '#FFD700',
    isVerified: false,
    role: 'EXPLORER',
    followers: [],
    following: [],
  },
  {
    id: 'user-lyra-thorne',
    displayName: 'Lyra Thorne',
    username: 'Lyra Thorne',
    handle: 'lyrathorne',
    email: 'lyra@deepspace.art',
    password: 'password123',
    avatarUrl: DEFAULT_COSMIC_AVATAR,
    bannerUrl: 'https://images.unsplash.com/photo-1538370965046-79c0d6907d47?w=1200&auto=format&fit=crop&q=80',
    bio: 'Deep space abstract artist sculpting stardust into radiant constellations.',
    quote: 'Between the stars lie silent harmonies waiting to be heard.',
    joinedAt: '2 weeks ago',
    glowColor: '#FFE57F',
    isVerified: false,
    role: 'EXPLORER',
    followers: [],
    following: [],
  }
];

/**
 * Retrieves all registered users and creators from localStorage combined with presets.
 */
export function getAllRegisteredUsers(): User[] {
  if (cachedUsersList) {
    return cachedUsersList;
  }
  const usersMap = new Map<string, User>();

  // 1. Load initial creators
  INITIAL_CREATORS.forEach((creator) => {
    usersMap.set(creator.id, { age: 24, isOver18: true, ...creator });
  });

  // 2. Load stored users from localStorage cleanly without throwing errors on new domains
  try {
    const raw = localStorage.getItem(REGISTERED_USERS_KEY) || localStorage.getItem(LEGACY_REGISTERED_USERS_KEY);
    if (raw) {
      const parsed: User[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((u) => {
          if (u && u.id) {
            const existing = usersMap.get(u.id);
            usersMap.set(u.id, {
              ...existing,
              ...u,
              followers: u.followers || existing?.followers || [],
              following: u.following || existing?.following || [],
            });
          }
        });
      }
    } else {
      // Cleanly initialize the key if empty on new domain
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify([]));
    }
  } catch {
    // Ignore storage parse errors
  }

  cachedUsersList = Array.from(usersMap.values());
  return cachedUsersList;
}

export function invalidateUsersCache(): void {
  cachedUsersList = null;
}

/**
 * Retrieves all registered users and existing star author profiles across the app.
 */
export function getRegisteredUsers(): RegisteredUserProfile[] {
  const all = getAllRegisteredUsers();
  return all.map((u) => ({
    id: u.id,
    displayName: u.displayName || u.username || '',
    handle: u.handle?.replace(/^@/, '').trim(),
    email: u.email,
  }));
}

/**
 * Checks if a user has moderation privileges (Galaxy Keeper 🛡️ or Orbit Keeper 🛡️).
 */
export function canUserModerate(user?: User | null): boolean {
  if (!user) return false;
  return user.role === 'ADMIN' || user.role === 'MODERATOR';
}

/**
 * Checks if a user has full administrator privileges (Galaxy Keeper 🛡️).
 */
export function canUserAdminister(user?: User | null): boolean {
  if (!user) return false;
  return user.role === 'ADMIN';
}

/**
 * Finds or synthesizes a full User object for any author (by id, handle, or display name).
 */
export function getUserForAuthor(
  author: { name: string; handle?: string; avatarUrl?: string; bannerUrl?: string; isVerified?: boolean; role?: 'ADMIN' | 'MODERATOR' | 'EXPLORER' },
  authorId?: string
): User {
  const all = getAllRegisteredUsers();

  if (authorId) {
    const foundById = all.find((u) => u.id === authorId);
    if (foundById) {
      return {
        ...foundById,
        isVerified: author.isVerified !== undefined ? author.isVerified : foundById.isVerified,
        role: author.role || foundById.role || 'EXPLORER',
        bannerUrl: author.bannerUrl || foundById.bannerUrl,
      };
    }
  }

  const cleanName = author.name.trim().toLowerCase();
  const cleanHandle = (author.handle || '').replace(/^@/, '').trim().toLowerCase();

  const found = all.find((u) => {
    const uName = (u.displayName || u.username || '').trim().toLowerCase();
    const uHandle = (u.handle || '').replace(/^@/, '').trim().toLowerCase();
    return (cleanHandle && uHandle === cleanHandle) || uName === cleanName;
  });

  if (found) {
    return {
      ...found,
      isVerified: author.isVerified !== undefined ? author.isVerified : found.isVerified,
      role: author.role || found.role || 'EXPLORER',
      bannerUrl: author.bannerUrl || found.bannerUrl,
    };
  }

  // Synthesize consistent User model for new author
  const synthId = authorId || `user-${cleanHandle || cleanName.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || Date.now()}`;
  const newUser: User = {
    id: synthId,
    displayName: author.name,
    username: author.name,
    handle: cleanHandle || author.name.toLowerCase().replace(/\s+/g, '_'),
    email: `${cleanHandle || 'stargazer'}@cosmos.space`,
    avatarUrl: author.avatarUrl || DEFAULT_COSMIC_AVATAR,
    bannerUrl: author.bannerUrl || 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1200&auto=format&fit=crop&q=80',
    bio: 'Exploring and connecting ideas across the cosmic network.',
    quote: 'Exploring and connecting ideas across the cosmic network.',
    joinedAt: 'Recent explorer',
    glowColor: '#FFD700',
    isVerified: author.isVerified ?? false,
    role: author.role || 'EXPLORER',
    followers: [],
    following: [],
  };

  return newUser;
}

/**
 * Checks if a given email is already registered (case-insensitive).
 */
export function isEmailTaken(emailToTest: string, excludeUserId?: string): boolean {
  const normalized = emailToTest.trim().toLowerCase();
  if (!normalized) return false;

  const existingUsers = getAllRegisteredUsers();

  return existingUsers.some((u) => {
    if (excludeUserId && u.id === excludeUserId) {
      return false;
    }
    const existingEmail = (u.email || '').trim().toLowerCase();
    return existingEmail === normalized;
  });
}

/**
 * Checks if a given display name is already registered (case-insensitive).
 */
export function isDisplayNameTaken(nameToTest: string, excludeUserId?: string): boolean {
  const normalized = nameToTest.trim().toLowerCase();
  if (!normalized) return false;

  const existingUsers = getAllRegisteredUsers();

  return existingUsers.some((u) => {
    if (excludeUserId && u.id === excludeUserId) {
      return false;
    }
    const existingDisplayName = (u.displayName || '').trim().toLowerCase();
    return existingDisplayName === normalized;
  });
}

/**
 * Generates a clean handle or username by stripping email domains, '@' symbols, and invalid characters.
 * E.g. 'lunaradiant7@gmail.com' -> 'lunaradiant7'
 */
export function generateCleanHandle(rawInput: string): string {
  if (!rawInput) return 'stargazer';
  let clean = rawInput.trim();
  if (clean.includes('@')) {
    clean = clean.split('@')[0];
  }
  clean = clean.replace(/^@+/, '').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
  return clean || 'stargazer';
}

/**
 * Checks if a given username or handle is already registered (case-insensitive).
 */
export function isUsernameTaken(usernameToTest: string, excludeUserId?: string): boolean {
  const normalized = usernameToTest.trim().toLowerCase().replace(/^@/, '');
  if (!normalized) return false;

  const existingUsers = getAllRegisteredUsers();

  return existingUsers.some((u) => {
    if (excludeUserId && u.id === excludeUserId) {
      return false;
    }
    const existingUsername = (u.username || '').trim().toLowerCase().replace(/^@/, '');
    const existingHandle = (u.handle || '').trim().toLowerCase().replace(/^@/, '');
    return existingUsername === normalized || existingHandle === normalized;
  });
}

/**
 * Checks if a given email, username, or handle is already registered (case-insensitive).
 */
export function isEmailOrUsernameTaken(identifierToTest: string, excludeUserId?: string): boolean {
  const normalized = identifierToTest.trim().toLowerCase().replace(/^@/, '');
  if (!normalized) return false;

  const existingUsers = getAllRegisteredUsers();

  return existingUsers.some((u) => {
    if (excludeUserId && u.id === excludeUserId) {
      return false;
    }
    const existingEmail = (u.email || '').trim().toLowerCase();
    const existingUsername = (u.username || '').trim().toLowerCase();
    const existingHandle = (u.handle || '').replace(/^@/, '').trim().toLowerCase();
    return (
      existingEmail === normalized ||
      existingUsername === normalized ||
      existingHandle === normalized
    );
  });
}

/**
 * Saves a newly registered user to the persistent registry in localStorage.
 */
export function registerUser(user: User): void {
  if (!user || user.isGuest) return;

  try {
    const allUsers = getAllRegisteredUsers();
    const normalizedNewName = (user.displayName || user.username || '').trim().toLowerCase();
    const existingIndex = allUsers.findIndex(
      (u) => u.id === user.id || (u.displayName || u.username || '').trim().toLowerCase() === normalizedNewName
    );

    if (existingIndex >= 0) {
      allUsers[existingIndex] = {
        ...allUsers[existingIndex],
        ...user,
        followers: user.followers !== undefined ? user.followers : allUsers[existingIndex].followers || [],
        following: user.following !== undefined ? user.following : allUsers[existingIndex].following || [],
        eclipsedUserIds: user.eclipsedUserIds !== undefined ? user.eclipsedUserIds : allUsers[existingIndex].eclipsedUserIds || [],
        isPrivateSky: user.isPrivateSky !== undefined ? user.isPrivateSky : allUsers[existingIndex].isPrivateSky || false,
        orbitRequests: user.orbitRequests !== undefined ? user.orbitRequests : allUsers[existingIndex].orbitRequests || [],
      };
    } else {
      allUsers.push({
        ...user,
        followers: user.followers || [],
        following: user.following || [],
        eclipsedUserIds: user.eclipsedUserIds || [],
        isPrivateSky: user.isPrivateSky || false,
        orbitRequests: user.orbitRequests || [],
      });
    }

    const payload = JSON.stringify(allUsers);
    localStorage.setItem(REGISTERED_USERS_KEY, payload);
    localStorage.setItem(LEGACY_REGISTERED_USERS_KEY, payload);
    cachedUsersList = allUsers;
  } catch {
    // Ignore storage errors
  }
}

/**
 * Toggles the follow status between currentUser and targetUser.
 * If targetUser has enabled Private Sky 🔒 and currentUser is not following yet,
 * it toggles an Orbit Request instead.
 * Returns the updated currentUser and targetUser.
 */
export function toggleFollowUser(
  currentUser: User,
  targetUser: User
): { 
  updatedCurrentUser: User; 
  updatedTargetUser: User; 
  isFollowing: boolean; 
  isOrbitRequested?: boolean;
} {
  const currentFollowing = new Set<string>(currentUser.following || []);
  const targetFollowers = new Set<string>(targetUser.followers || []);
  const isFollowing = currentFollowing.has(targetUser.id);

  // If already following, unfollow
  if (isFollowing) {
    currentFollowing.delete(targetUser.id);
    targetFollowers.delete(currentUser.id);

    const updatedCurrentUser: User = {
      ...currentUser,
      following: Array.from(currentFollowing),
      followers: currentUser.followers || [],
    };

    const updatedTargetUser: User = {
      ...targetUser,
      followers: Array.from(targetFollowers),
      following: targetUser.following || [],
    };

    registerUser(updatedCurrentUser);
    registerUser(updatedTargetUser);

    return {
      updatedCurrentUser,
      updatedTargetUser,
      isFollowing: false,
      isOrbitRequested: false,
    };
  }

  // If not following, check if targetUser has Private Sky 🔒
  if (targetUser.isPrivateSky) {
    const requests = new Set<string>(targetUser.orbitRequests || []);
    let requested = false;
    if (requests.has(currentUser.id)) {
      requests.delete(currentUser.id);
      requested = false;
    } else {
      requests.add(currentUser.id);
      requested = true;
    }

    const updatedTargetUser: User = {
      ...targetUser,
      orbitRequests: Array.from(requests),
    };

    registerUser(updatedTargetUser);

    return {
      updatedCurrentUser: currentUser,
      updatedTargetUser,
      isFollowing: false,
      isOrbitRequested: requested,
    };
  }

  // Regular Follow
  currentFollowing.add(targetUser.id);
  targetFollowers.add(currentUser.id);

  const updatedCurrentUser: User = {
    ...currentUser,
    following: Array.from(currentFollowing),
    followers: currentUser.followers || [],
  };

  const updatedTargetUser: User = {
    ...targetUser,
    followers: Array.from(targetFollowers),
    following: targetUser.following || [],
  };

  // Persist both in allUsers
  registerUser(updatedCurrentUser);
  registerUser(updatedTargetUser);

  return {
    updatedCurrentUser,
    updatedTargetUser,
    isFollowing: true,
    isOrbitRequested: false,
  };
}

/**
 * Searches for a registered user specifically by their registered email address.
 */
export function findUserByEmail(email: string): User | undefined {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return undefined;

  const allUsers = getAllRegisteredUsers();
  return allUsers.find((u) => (u.email || '').trim().toLowerCase() === normalized);
}

/**
 * Searches for a registered user by email, username, handle, or display name.
 */
export function findUserByIdentifier(identifier: string): User | undefined {
  const normalized = identifier.trim().toLowerCase().replace(/^@/, '');
  if (!normalized) return undefined;

  const allUsers = getAllRegisteredUsers();
  return allUsers.find((u) => {
    const uEmail = (u.email || '').trim().toLowerCase();
    const uUsername = (u.username || '').trim().toLowerCase();
    const uHandle = (u.handle || '').replace(/^@/, '').trim().toLowerCase();
    const uDisplayName = (u.displayName || '').trim().toLowerCase();
    return (
      uEmail === normalized ||
      uUsername === normalized ||
      uHandle === normalized ||
      uDisplayName === normalized
    );
  });
}

export interface AuthValidationResult {
  success: boolean;
  user?: User;
  error?: 'NO_ACCOUNT' | 'WRONG_PASSWORD';
}

/**
 * Validates sign-in credentials against registered users.
 * Returns:
 * - { success: false, error: 'NO_ACCOUNT' } if no user matches the email/username.
 * - { success: false, error: 'WRONG_PASSWORD' } if account exists but password doesn't match.
 * - { success: true, user } if both email/username and password match.
 */
export function validateUserCredentials(
  identifier: string,
  passwordInput: string
): AuthValidationResult {
  const user = findUserByIdentifier(identifier);
  if (!user) {
    return { success: false, error: 'NO_ACCOUNT' };
  }

  const trimmedPassword = passwordInput.trim();
  const storedPassword = user.password || 'password123';

  if (storedPassword !== trimmedPassword) {
    return { success: false, error: 'WRONG_PASSWORD' };
  }

  return { success: true, user };
}

/**
 * Updates a registered user's account password directly in localStorage and in-memory state.
 */
export function updateUserPassword(
  identifierOrEmail: string,
  newPassword: string
): { success: boolean; user?: User; error?: string } {
  const normalized = identifierOrEmail.trim().toLowerCase().replace(/^@/, '');
  if (!normalized) {
    return { success: false, error: 'No email or username provided.' };
  }

  const allUsers = getAllRegisteredUsers();
  const userIndex = allUsers.findIndex((u) => {
    const uEmail = (u.email || '').trim().toLowerCase();
    const uUsername = (u.username || '').trim().toLowerCase();
    const uHandle = (u.handle || '').replace(/^@/, '').trim().toLowerCase();
    return (
      uEmail === normalized ||
      uUsername === normalized ||
      uHandle === normalized ||
      u.id === identifierOrEmail
    );
  });

  if (userIndex === -1) {
    return { success: false, error: 'No account found with this email' };
  }

  const updatedUser: User = {
    ...allUsers[userIndex],
    password: newPassword.trim(),
  };

  allUsers[userIndex] = updatedUser;

  try {
    const payload = JSON.stringify(allUsers);
    localStorage.setItem(REGISTERED_USERS_KEY, payload);
    localStorage.setItem(LEGACY_REGISTERED_USERS_KEY, payload);
    cachedUsersList = allUsers;
  } catch {
    // Ignore storage quota errors
  }

  return { success: true, user: updatedUser };
}

