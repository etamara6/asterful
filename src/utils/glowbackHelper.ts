import { StarNode, Glowback } from '../types';

export const GLOWBACK_STORAGE_KEY = 'constellation_stars_v1';

/**
 * Returns the list of Glowbacks for a given star.
 */
export function getStarGlowbacks(star?: StarNode | null): Glowback[] {
  if (!star || !star.glowbacks || !Array.isArray(star.glowbacks)) {
    return [];
  }
  return star.glowbacks;
}

/**
 * Computes the total count of Glowbacks for a star.
 */
export function getStarGlowbackCount(star?: StarNode | null): number {
  if (!star) return 0;
  if (typeof star.glowbackCount === 'number') {
    return star.glowbackCount;
  }
  if (Array.isArray(star.glowbacks)) {
    return star.glowbacks.length;
  }
  return 0;
}

/**
 * Checks if a glowback is liked/glowing by the current user.
 */
export function isGlowbackGlowingByUser(glowback: Glowback, currentUserId?: string): boolean {
  if (!glowback) return false;
  if (!currentUserId) {
    return Boolean(glowback.isGlowing);
  }
  if (Array.isArray(glowback.glowers)) {
    return glowback.glowers.includes(currentUserId);
  }
  return Boolean(glowback.isGlowing);
}

/**
 * Adds a new Glowback comment to a star in the stars array and returns the updated array and created glowback.
 */
export function addGlowbackToStar(
  stars: StarNode[],
  starId: string,
  data: {
    authorId: string;
    authorName: string;
    authorAvatar: string;
    text: string;
  }
): { updatedStars: StarNode[]; newGlowback: Glowback } {
  const nowIso = new Date().toISOString();
  const newGlowback: Glowback = {
    id: `glowback-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    starId,
    authorId: data.authorId,
    authorName: data.authorName,
    authorAvatar: data.authorAvatar,
    text: data.text.trim(),
    timestamp: nowIso,
    glowCount: 0,
    isGlowing: false,
    glowers: [],
  };

  const updatedStars = stars.map((s) => {
    if (s.id === starId) {
      const currentGlowbacks = Array.isArray(s.glowbacks) ? [...s.glowbacks] : [];
      const updatedGlowbacks = [...currentGlowbacks, newGlowback];
      return {
        ...s,
        glowbacks: updatedGlowbacks,
        glowbackCount: updatedGlowbacks.length,
      };
    }
    return s;
  });

  return { updatedStars, newGlowback };
}

/**
 * Toggles the glow / like state of an individual Glowback comment.
 */
export function toggleGlowbackGlow(
  stars: StarNode[],
  starId: string,
  glowbackId: string,
  currentUserId?: string
): StarNode[] {
  const effectiveUserId = currentUserId || 'guest-stargazer';

  return stars.map((s) => {
    if (s.id !== starId || !Array.isArray(s.glowbacks)) {
      return s;
    }

    const updatedGlowbacks = s.glowbacks.map((gb) => {
      if (gb.id !== glowbackId) {
        return gb;
      }

      const glowers = Array.isArray(gb.glowers) ? [...gb.glowers] : [];
      const userIndex = glowers.indexOf(effectiveUserId);
      const isCurrentlyGlowing = userIndex !== -1 || Boolean(gb.isGlowing);

      let nextGlowers: string[];
      let nextCount = gb.glowCount || 0;
      let nextIsGlowing = false;

      if (isCurrentlyGlowing) {
        // Unlike / Unglow
        nextGlowers = glowers.filter((id) => id !== effectiveUserId);
        nextCount = Math.max(0, nextCount - 1);
        nextIsGlowing = false;
      } else {
        // Like / Glow
        nextGlowers = [...glowers, effectiveUserId];
        nextCount = nextCount + 1;
        nextIsGlowing = true;
      }

      return {
        ...gb,
        glowCount: nextCount,
        isGlowing: nextIsGlowing,
        glowers: nextGlowers,
      };
    });

    return {
      ...s,
      glowbacks: updatedGlowbacks,
      glowbackCount: updatedGlowbacks.length,
    };
  });
}

/**
 * Formats a relative timestamp for display in Glowbacks.
 */
export function formatGlowbackTime(timestamp: string): string {
  if (!timestamp) return 'Just now';

  // If already relative (e.g. "2 hours ago", "Yesterday")
  if (timestamp.includes('ago') || timestamp.includes('Just') || timestamp.includes('yesterday')) {
    return timestamp;
  }

  try {
    const timeMs = new Date(timestamp).getTime();
    if (isNaN(timeMs)) return timestamp;

    const diffSeconds = Math.floor((Date.now() - timeMs) / 1000);
    if (diffSeconds < 45) return 'Just now';
    if (diffSeconds < 3600) {
      const mins = Math.floor(diffSeconds / 60);
      return `${mins}m ago`;
    }
    if (diffSeconds < 86400) {
      const hours = Math.floor(diffSeconds / 3600);
      return `${hours}h ago`;
    }
    const days = Math.floor(diffSeconds / 86400);
    if (days < 30) {
      return `${days}d ago`;
    }
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return timestamp;
  }
}
