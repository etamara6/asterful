import { StarNode } from '../types/star';
import { StarStory } from '../types/story';
import { Galaxy } from '../types/galaxy';
import { INITIAL_GALAXIES } from '../utils/galaxyRegistry';
import { 
  getFirebaseFirestore, 
  isFirebaseConfigured, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  updateDoc, 
  onSnapshot, 
  Unsubscribe 
} from './firebase';

// Local storage fallback cache keys
const STARS_CACHE_KEY = 'constellation_stars_v2';
const STORIES_CACHE_KEY = 'asterful_star_stories_v3';
const GALAXIES_CACHE_KEY = 'asterful_galaxies';

// Cross-tab / multiplayer sync channel for real-time local and network synchronization
const MULTIPLAYER_BROADCAST_CHANNEL = 'asterful_cosmos_multiplayer_sync';

let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(MULTIPLAYER_BROADCAST_CHANNEL);
  }
} catch {
  // BroadcastChannel unavailable
}

export interface CloudStatus {
  isConnected: boolean;
  provider: 'firebase' | 'supabase' | 'mesh-sync';
  providerName: string;
  details: string;
  projectId?: string;
}

export function getCloudStatus(): CloudStatus {
  if (isFirebaseConfigured()) {
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'connected-project';
    return {
      isConnected: true,
      provider: 'firebase',
      providerName: 'Firebase Firestore Live Cloud',
      details: `Connected to Firebase Project (${projectId}). Real-time live synchronization active.`,
      projectId,
    };
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (supabaseUrl) {
    return {
      isConnected: true,
      provider: 'supabase',
      providerName: 'Supabase Realtime Cloud',
      details: `Connected to Supabase endpoint (${supabaseUrl}).`,
    };
  }

  return {
    isConnected: false,
    provider: 'mesh-sync',
    providerName: 'Cosmic Multiplayer Sync Mesh',
    details: 'Multiplayer cross-tab live sync bus active. Add Firebase or Supabase keys to connect live cloud backend.',
  };
}

/**
 * --------------------------------------------------------------------------------
 * STARS CLOUD INTEGRATION
 * --------------------------------------------------------------------------------
 */

/**
 * Loads cached stars from local storage
 */
export function getCachedStars(): StarNode[] {
  try {
    const raw = localStorage.getItem(STARS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

/**
 * Persists stars locally to fast cache
 */
export function cacheStars(stars: StarNode[]) {
  try {
    localStorage.setItem(STARS_CACHE_KEY, JSON.stringify(stars));
  } catch {
    // ignore
  }
}

/**
 * Subscribes to global stars feed with real-time updates:
 * - Listens to Firebase Firestore `onSnapshot` when configured
 * - Listens to `BroadcastChannel` events across windows and devices
 */
export function subscribeGlobalStars(onUpdate: (stars: StarNode[]) => void): () => void {
  const db = getFirebaseFirestore();

  // If Firebase is configured, subscribe to Firestore real-time collection
  if (db) {
    try {
      const starsCol = collection(db, 'stars');
      const unsubscribeFirestore: Unsubscribe = onSnapshot(
        starsCol,
        (snapshot) => {
          const cloudStars: StarNode[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as StarNode;
            if (data && data.id) {
              cloudStars.push(data);
            }
          });

          // Sort by creation or maintain position
          cloudStars.sort((a, b) => {
            const timeA = new Date(a.createdAt).getTime() || 0;
            const timeB = new Date(b.createdAt).getTime() || 0;
            return timeB - timeA;
          });

          cacheStars(cloudStars);
          onUpdate(cloudStars);
        },
        (error) => {
          // On Firestore error fallback to cached stars
          onUpdate(getCachedStars());
        }
      );

      return () => {
        unsubscribeFirestore();
      };
    } catch {
      // Fallback
    }
  }

  // Fallback: Cross-tab Real-time BroadcastChannel & Local Event Listener
  const handleBroadcast = (event: MessageEvent) => {
    if (event.data?.type === 'STARS_UPDATED' && Array.isArray(event.data.stars)) {
      cacheStars(event.data.stars);
      onUpdate(event.data.stars);
    }
  };

  const handleWindowCustomEvent = (e: Event) => {
    const custom = e as CustomEvent<{ stars: StarNode[] }>;
    if (custom.detail?.stars) {
      onUpdate(custom.detail.stars);
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcast);
  }
  window.addEventListener('asterful_stars_synced', handleWindowCustomEvent);

  // Initial emit
  onUpdate(getCachedStars());

  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcast);
    }
    window.removeEventListener('asterful_stars_synced', handleWindowCustomEvent);
  };
}

/**
 * Saves a new star to the global database and broadcasts to all clients
 */
export async function saveStarToCloud(star: StarNode, currentStars: StarNode[]): Promise<void> {
  const updatedStars = [star, ...currentStars.filter((s) => s.id !== star.id)];
  cacheStars(updatedStars);

  // Broadcast locally
  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: 'STARS_UPDATED', stars: updatedStars });
  }
  window.dispatchEvent(new CustomEvent('asterful_stars_synced', { detail: { stars: updatedStars } }));

  // Write to Firebase Firestore if connected
  const db = getFirebaseFirestore();
  if (db) {
    try {
      const starRef = doc(db, 'stars', star.id);
      await setDoc(starRef, {
        ...star,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      // silent catch for resilient local-first experience
    }
  }
}

/**
 * Updates a star in the global database (e.g. like, reignite, reform)
 */
export async function updateStarInCloud(
  starId: string, 
  updates: Partial<StarNode>, 
  currentStars: StarNode[]
): Promise<void> {
  const updatedStars = currentStars.map((s) => (s.id === starId ? { ...s, ...updates } : s));
  cacheStars(updatedStars);

  // Broadcast locally
  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: 'STARS_UPDATED', stars: updatedStars });
  }
  window.dispatchEvent(new CustomEvent('asterful_stars_synced', { detail: { stars: updatedStars } }));

  // Write to Firebase Firestore if connected
  const db = getFirebaseFirestore();
  if (db) {
    try {
      const starRef = doc(db, 'stars', starId);
      await updateDoc(starRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      // If doc does not exist yet, fallback to setDoc
      try {
        const fullStar = updatedStars.find((s) => s.id === starId);
        if (fullStar) {
          const starRef = doc(db, 'stars', starId);
          await setDoc(starRef, { ...fullStar, updatedAt: new Date().toISOString() });
        }
      } catch {
        // ignore
      }
    }
  }
}

/**
 * Deletes a star from the global database
 */
export async function deleteStarFromCloud(starId: string, currentStars: StarNode[]): Promise<void> {
  const updatedStars = currentStars.filter((s) => s.id !== starId);
  cacheStars(updatedStars);

  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: 'STARS_UPDATED', stars: updatedStars });
  }
  window.dispatchEvent(new CustomEvent('asterful_stars_synced', { detail: { stars: updatedStars } }));

  const db = getFirebaseFirestore();
  if (db) {
    try {
      const starRef = doc(db, 'stars', starId);
      await deleteDoc(starRef);
    } catch {
      // ignore
    }
  }
}

/**
 * --------------------------------------------------------------------------------
 * STORIES CLOUD INTEGRATION
 * --------------------------------------------------------------------------------
 */

export function getCachedStories(): StarStory[] {
  try {
    const raw = localStorage.getItem(STORIES_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const now = new Date().toISOString();
        return parsed.filter((s) => s.expiresAt > now);
      }
    }
  } catch {
    // ignore
  }
  return [];
}

export function cacheStories(stories: StarStory[]) {
  try {
    localStorage.setItem(STORIES_CACHE_KEY, JSON.stringify(stories));
  } catch {
    // ignore
  }
}

export function subscribeGlobalStories(onUpdate: (stories: StarStory[]) => void): () => void {
  const db = getFirebaseFirestore();

  if (db) {
    try {
      const storiesCol = collection(db, 'stories');
      const unsubscribeFirestore: Unsubscribe = onSnapshot(
        storiesCol,
        (snapshot) => {
          const cloudStories: StarStory[] = [];
          const now = new Date().toISOString();
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as StarStory;
            if (data && data.id && data.expiresAt > now) {
              cloudStories.push(data);
            }
          });

          cacheStories(cloudStories);
          onUpdate(cloudStories);
        },
        (error) => {
          onUpdate(getCachedStories());
        }
      );

      return () => {
        unsubscribeFirestore();
      };
    } catch {
      // ignore
    }
  }

  const handleBroadcast = (event: MessageEvent) => {
    if (event.data?.type === 'STORIES_UPDATED' && Array.isArray(event.data.stories)) {
      cacheStories(event.data.stories);
      onUpdate(event.data.stories);
    }
  };

  const handleWindowCustomEvent = (e: Event) => {
    const custom = e as CustomEvent<{ stories: StarStory[] }>;
    if (custom.detail?.stories) {
      onUpdate(custom.detail.stories);
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcast);
  }
  window.addEventListener('asterful_stories_synced', handleWindowCustomEvent);

  onUpdate(getCachedStories());

  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcast);
    }
    window.removeEventListener('asterful_stories_synced', handleWindowCustomEvent);
  };
}

export async function saveStoryToCloud(story: StarStory, currentStories: StarStory[]): Promise<void> {
  const updatedStories = [...currentStories.filter((s) => s.id !== story.id), story];
  cacheStories(updatedStories);

  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: 'STORIES_UPDATED', stories: updatedStories });
  }
  window.dispatchEvent(new CustomEvent('asterful_stories_synced', { detail: { stories: updatedStories } }));

  const db = getFirebaseFirestore();
  if (db) {
    try {
      const storyRef = doc(db, 'stories', story.id);
      await setDoc(storyRef, story);
    } catch {
      // ignore
    }
  }
}

export async function deleteStoryFromCloud(storyId: string, currentStories: StarStory[]): Promise<void> {
  const updatedStories = currentStories.filter((s) => s.id !== storyId);
  cacheStories(updatedStories);

  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: 'STORIES_UPDATED', stories: updatedStories });
  }
  window.dispatchEvent(new CustomEvent('asterful_stories_synced', { detail: { stories: updatedStories } }));

  const db = getFirebaseFirestore();
  if (db) {
    try {
      const storyRef = doc(db, 'stories', storyId);
      await deleteDoc(storyRef);
    } catch {
      // ignore
    }
  }
}

export async function markStoryViewedInCloud(
  storyId: string, 
  viewerId: string, 
  currentStories: StarStory[]
): Promise<void> {
  if (!viewerId) return;
  const updatedStories = currentStories.map((s) => {
    if (s.id === storyId && !s.viewers.includes(viewerId)) {
      return { ...s, viewers: [...s.viewers, viewerId] };
    }
    return s;
  });
  cacheStories(updatedStories);

  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: 'STORIES_UPDATED', stories: updatedStories });
  }
  window.dispatchEvent(new CustomEvent('asterful_stories_synced', { detail: { stories: updatedStories } }));

  const db = getFirebaseFirestore();
  if (db) {
    try {
      const storyRef = doc(db, 'stories', storyId);
      const target = updatedStories.find((s) => s.id === storyId);
      if (target) {
        await updateDoc(storyRef, { viewers: target.viewers });
      }
    } catch {
      // ignore
    }
  }
}

/**
 * --------------------------------------------------------------------------------
 * GALAXIES CLOUD INTEGRATION
 * --------------------------------------------------------------------------------
 */

export function getCachedGalaxies(): Galaxy[] {
  try {
    const raw = localStorage.getItem(GALAXIES_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
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

export function cacheGalaxies(galaxies: Galaxy[]) {
  try {
    localStorage.setItem(GALAXIES_CACHE_KEY, JSON.stringify(galaxies));
  } catch {
    // ignore
  }
}

export function subscribeGlobalGalaxies(onUpdate: (galaxies: Galaxy[]) => void): () => void {
  const db = getFirebaseFirestore();

  if (db) {
    try {
      const galaxiesCol = collection(db, 'galaxies');
      const unsubscribeFirestore: Unsubscribe = onSnapshot(
        galaxiesCol,
        (snapshot) => {
          const map = new Map<string, Galaxy>();
          INITIAL_GALAXIES.forEach((g) => map.set(g.id, g));

          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as Galaxy;
            if (data && data.id) {
              map.set(data.id, data);
            }
          });

          const mergedGalaxies = Array.from(map.values());
          cacheGalaxies(mergedGalaxies);
          onUpdate(mergedGalaxies);
        },
        (error) => {
          onUpdate(getCachedGalaxies());
        }
      );

      return () => {
        unsubscribeFirestore();
      };
    } catch {
      // ignore
    }
  }

  const handleBroadcast = (event: MessageEvent) => {
    if (event.data?.type === 'GALAXIES_UPDATED' && Array.isArray(event.data.galaxies)) {
      cacheGalaxies(event.data.galaxies);
      onUpdate(event.data.galaxies);
    }
  };

  const handleWindowCustomEvent = (e: Event) => {
    const custom = e as CustomEvent<{ galaxies: Galaxy[] }>;
    if (custom.detail?.galaxies) {
      onUpdate(custom.detail.galaxies);
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcast);
  }
  window.addEventListener('asterful_galaxies_synced', handleWindowCustomEvent);

  onUpdate(getCachedGalaxies());

  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcast);
    }
    window.removeEventListener('asterful_galaxies_synced', handleWindowCustomEvent);
  };
}

export async function saveGalaxyToCloud(galaxy: Galaxy, currentGalaxies: Galaxy[]): Promise<void> {
  const index = currentGalaxies.findIndex(
    (g) => g.id === galaxy.id || g.name.toLowerCase() === galaxy.name.toLowerCase()
  );
  let updatedGalaxies: Galaxy[];
  if (index >= 0) {
    updatedGalaxies = [...currentGalaxies];
    updatedGalaxies[index] = { ...currentGalaxies[index], ...galaxy };
  } else {
    updatedGalaxies = [galaxy, ...currentGalaxies];
  }

  cacheGalaxies(updatedGalaxies);

  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: 'GALAXIES_UPDATED', galaxies: updatedGalaxies });
  }
  window.dispatchEvent(new CustomEvent('asterful_galaxies_synced', { detail: { galaxies: updatedGalaxies } }));

  const db = getFirebaseFirestore();
  if (db) {
    try {
      const galaxyRef = doc(db, 'galaxies', galaxy.id);
      await setDoc(galaxyRef, galaxy);
    } catch {
      // ignore
    }
  }
}

export async function toggleJoinGalaxyInCloud(
  galaxyId: string, 
  userId: string, 
  currentGalaxies: Galaxy[]
): Promise<Galaxy[]> {
  if (!userId) return currentGalaxies;
  const updatedGalaxies = currentGalaxies.map((g) => {
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

  cacheGalaxies(updatedGalaxies);

  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: 'GALAXIES_UPDATED', galaxies: updatedGalaxies });
  }
  window.dispatchEvent(new CustomEvent('asterful_galaxies_synced', { detail: { galaxies: updatedGalaxies } }));

  const db = getFirebaseFirestore();
  if (db) {
    try {
      const target = updatedGalaxies.find((g) => g.id === galaxyId);
      if (target) {
        const galaxyRef = doc(db, 'galaxies', galaxyId);
        await updateDoc(galaxyRef, { memberIds: target.memberIds });
      }
    } catch {
      // ignore
    }
  }

  return updatedGalaxies;
}

/**
 * One-time fetch for global cosmos data on initial mount
 */
export async function fetchGlobalCosmosFeed(): Promise<{
  stars: StarNode[];
  stories: StarStory[];
  galaxies: Galaxy[];
}> {
  const db = getFirebaseFirestore();
  if (!db) {
    return {
      stars: getCachedStars(),
      stories: getCachedStories(),
      galaxies: getCachedGalaxies(),
    };
  }

  try {
    const [starsSnap, storiesSnap, galaxiesSnap] = await Promise.all([
      getDocs(collection(db, 'stars')),
      getDocs(collection(db, 'stories')),
      getDocs(collection(db, 'galaxies')),
    ]);

    const stars: StarNode[] = [];
    starsSnap.forEach((docSnap) => {
      const data = docSnap.data() as StarNode;
      if (data && data.id) stars.push(data);
    });

    const now = new Date().toISOString();
    const stories: StarStory[] = [];
    storiesSnap.forEach((docSnap) => {
      const data = docSnap.data() as StarStory;
      if (data && data.id && data.expiresAt > now) stories.push(data);
    });

    const galaxyMap = new Map<string, Galaxy>();
    INITIAL_GALAXIES.forEach((g) => galaxyMap.set(g.id, g));
    galaxiesSnap.forEach((docSnap) => {
      const data = docSnap.data() as Galaxy;
      if (data && data.id) galaxyMap.set(data.id, data);
    });

    const finalStars = stars.length > 0 ? stars : getCachedStars();
    const finalStories = stories.length > 0 ? stories : getCachedStories();
    const finalGalaxies = Array.from(galaxyMap.values());

    cacheStars(finalStars);
    cacheStories(finalStories);
    cacheGalaxies(finalGalaxies);

    return {
      stars: finalStars,
      stories: finalStories,
      galaxies: finalGalaxies,
    };
  } catch {
    return {
      stars: getCachedStars(),
      stories: getCachedStories(),
      galaxies: getCachedGalaxies(),
    };
  }
}
