import { Universe, User } from '../types';
import { getDefaultUniverseGlow, DEFAULT_UNIVERSE_GLOW } from './colorPalette';

const STORAGE_KEY = 'constellation_universes_v1';

let cachedUniverses: Universe[] | null = null;

export const INITIAL_UNIVERSES: Universe[] = [];

export function getStoredUniverses(): Universe[] {
  if (cachedUniverses) {
    return cachedUniverses;
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
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
  cachedUniverses = [];
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
