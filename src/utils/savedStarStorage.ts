import { StarNode } from '../types/star';

const SAVED_STARS_STORAGE_KEY = 'constellation_saved_stars_v1';
export const SAVED_STARS_UPDATED_EVENT = 'asterful_saved_stars_updated';

interface UserSavedMap {
  [userId: string]: string[];
}

/**
 * Retrieves the raw user-to-saved-starIds map from localStorage
 */
function getRawSavedMap(): UserSavedMap {
  try {
    const raw = localStorage.getItem(SAVED_STARS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load saved stars map:', err);
    return {};
  }
}

/**
 * Saves the user-to-saved-starIds map to localStorage
 */
function saveRawSavedMap(map: UserSavedMap): void {
  try {
    localStorage.setItem(SAVED_STARS_STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.error('Failed to persist saved stars map:', err);
  }
}

/**
 * Retrieves the array of saved star IDs for a given user (or 'guest' if none provided)
 */
export function getStoredSavedStarIds(userId?: string | null): string[] {
  const effectiveUserId = userId || 'guest';
  const map = getRawSavedMap();
  const list = map[effectiveUserId];
  return Array.isArray(list) ? list : [];
}

export const getSavedStarIds = getStoredSavedStarIds;

/**
 * Checks if a specific star is saved (stargazed) by a user
 */
export function isStarSavedByUser(starId: string, userId?: string | null): boolean {
  if (!starId) return false;
  const savedIds = getStoredSavedStarIds(userId);
  return savedIds.includes(starId);
}

/**
 * Toggles the saved/stargazed status of a star for a user.
 * Returns true if the star is now saved, false if removed.
 */
export function toggleSaveStar(starId: string, userId?: string | null): boolean {
  if (!starId) return false;
  const effectiveUserId = userId || 'guest';
  const map = getRawSavedMap();
  const currentList = Array.isArray(map[effectiveUserId]) ? [...map[effectiveUserId]] : [];
  
  const alreadySaved = currentList.includes(starId);
  let updatedList: string[];
  let isNowSaved: boolean;

  if (alreadySaved) {
    updatedList = currentList.filter((id) => id !== starId);
    isNowSaved = false;
  } else {
    updatedList = [starId, ...currentList];
    isNowSaved = true;
  }

  map[effectiveUserId] = updatedList;
  saveRawSavedMap(map);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(SAVED_STARS_UPDATED_EVENT, {
        detail: {
          starId,
          userId: effectiveUserId,
          isSaved: isNowSaved,
          savedStarIds: updatedList,
        },
      })
    );
  }

  return isNowSaved;
}

/**
 * Filters the list of all stars to return only those saved by the given user
 */
export function getSavedStars(allStars: StarNode[], userId?: string | null): StarNode[] {
  const savedIds = new Set(getStoredSavedStarIds(userId));
  if (savedIds.size === 0) return [];
  return allStars.filter((star) => savedIds.has(star.id));
}
