import { StarNode } from '../types/star';
import { StarStory } from '../types/story';
import { Galaxy } from '../types/galaxy';
import { User } from '../types';
import { INITIAL_GALAXIES } from '../utils/galaxyRegistry';
import { 
  getFirebaseFirestore, 
  isFirebaseConfigured, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  getDoc,
  deleteDoc, 
  updateDoc, 
  onSnapshot, 
  query,
  where,
  Unsubscribe 
} from './firebase';

// Local storage fallback cache keys
const STARS_CACHE_KEY = 'constellation_stars_v2';
const LEGACY_STARS_CACHE_KEY = 'constellation_stars_v1';
const STORIES_CACHE_KEY = 'asterful_star_stories_v3';
const LEGACY_STORIES_CACHE_KEY = 'asterful_star_stories_v2';
const GALAXIES_CACHE_KEY = 'asterful_galaxies';
const USERS_CACHE_KEY = 'asterful_registered_users';
const LEGACY_USERS_CACHE_KEY = 'constellation_registered_users_v1';

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
 * USERS CLOUD INTEGRATION & MULTIPLAYER SYNC
 * --------------------------------------------------------------------------------
 */

export function getCachedUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_CACHE_KEY) || localStorage.getItem(LEGACY_USERS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

export function cacheUsers(users: User[]) {
  try {
    const payload = JSON.stringify(users);
    localStorage.setItem(USERS_CACHE_KEY, payload);
    localStorage.setItem(LEGACY_USERS_CACHE_KEY, payload);
  } catch {
    // ignore
  }
}

export function subscribeGlobalUsers(onUpdate: (users: User[]) => void): () => void {
  let unsubscribeFirestore: Unsubscribe | null = null;
  const db = getFirebaseFirestore();

  if (db) {
    try {
      const usersCol = collection(db, 'users');
      unsubscribeFirestore = onSnapshot(
        usersCol,
        (snapshot) => {
          const cloudUsers: User[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as User;
            if (data && data.id) {
              cloudUsers.push(data);
            }
          });

          if (cloudUsers.length > 0) {
            // Merge with any cached users that may not have synced yet
            const localUsers = getCachedUsers();
            const mergedMap = new Map<string, User>();
            localUsers.forEach(u => mergedMap.set(u.id, u));
            cloudUsers.forEach(u => mergedMap.set(u.id, u));
            const merged = Array.from(mergedMap.values());
            cacheUsers(merged);
            onUpdate(merged);
          }
        },
        (error) => {
          console.warn('[Firebase] users onSnapshot error:', error);
          onUpdate(getCachedUsers());
        }
      );
    } catch {
      // Fallback
    }
  }

  // Cross-tab broadcast listener
  const handleBroadcast = (event: MessageEvent) => {
    if (event.data?.type === 'USERS_UPDATED' && Array.isArray(event.data.users)) {
      cacheUsers(event.data.users);
      onUpdate(event.data.users);
    }
  };

  const handleWindowCustomEvent = (e: Event) => {
    const custom = e as CustomEvent<{ users: User[] }>;
    if (custom.detail?.users) {
      onUpdate(custom.detail.users);
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcast);
  }
  window.addEventListener('asterful_users_synced', handleWindowCustomEvent);

  onUpdate(getCachedUsers());

  return () => {
    if (unsubscribeFirestore) {
      unsubscribeFirestore();
    }
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcast);
    }
    window.removeEventListener('asterful_users_synced', handleWindowCustomEvent);
  };
}

export async function saveUserToCloud(user: User): Promise<void> {
  if (!user || user.isGuest) return;

  const currentUsers = getCachedUsers();
  const index = currentUsers.findIndex(u => u.id === user.id);
  let updatedUsers: User[];
  if (index >= 0) {
    updatedUsers = [...currentUsers];
    updatedUsers[index] = { ...updatedUsers[index], ...user };
  } else {
    updatedUsers = [...currentUsers, user];
  }

  cacheUsers(updatedUsers);

  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: 'USERS_UPDATED', users: updatedUsers });
  }
  window.dispatchEvent(new CustomEvent('asterful_users_synced', { detail: { users: updatedUsers } }));

  const db = getFirebaseFirestore();
  if (db) {
    try {
      const userRef = doc(db, 'users', user.id);
      await setDoc(userRef, {
        ...user,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[Firebase] saveUserToCloud error:', err);
    }
  }
}

export async function updateUserInCloud(userId: string, updates: Partial<User>): Promise<void> {
  if (!userId) return;

  const currentUsers = getCachedUsers();
  const updatedUsers = currentUsers.map(u => u.id === userId ? { ...u, ...updates } : u);
  cacheUsers(updatedUsers);

  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: 'USERS_UPDATED', users: updatedUsers });
  }
  window.dispatchEvent(new CustomEvent('asterful_users_synced', { detail: { users: updatedUsers } }));

  const db = getFirebaseFirestore();
  if (db) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      // If doc does not exist yet, fallback to setDoc
      try {
        const fullUser = updatedUsers.find(u => u.id === userId);
        if (fullUser) {
          const userRef = doc(db, 'users', userId);
          await setDoc(userRef, { ...fullUser, updatedAt: new Date().toISOString() });
        }
      } catch (err) {
        console.warn('[Firebase] updateUserInCloud fallback error:', err);
      }
    }
  }
}

export async function deleteUserFromCloud(
  userId: string, 
  userEmail?: string, 
  userHandle?: string
): Promise<void> {
  if (!userId) return;

  const normEmail = (userEmail || '').trim().toLowerCase();
  const normHandle = (userHandle || '').trim().toLowerCase().replace(/^@/, '');

  // 1. Clean local users cache and broadcast
  const currentUsers = getCachedUsers();
  const updatedUsers = currentUsers.filter(u => {
    if (u.id === userId) return false;
    const uEmail = (u.email || '').trim().toLowerCase();
    const uHandle = (u.handle || u.username || '').trim().toLowerCase().replace(/^@/, '');
    if (normEmail && uEmail && uEmail === normEmail) return false;
    if (normHandle && uHandle && uHandle === normHandle) return false;
    return true;
  });
  cacheUsers(updatedUsers);

  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: 'USERS_UPDATED', users: updatedUsers });
  }
  window.dispatchEvent(new CustomEvent('asterful_users_synced', { detail: { users: updatedUsers } }));

  // 2. Clean up from Firestore database
  const db = getFirebaseFirestore();
  if (db) {
    try {
      // 2a. Delete direct user doc
      const userRef = doc(db, 'users', userId);
      await deleteDoc(userRef).catch(() => {});

      // 2b. Delete any other matching user docs (e.g. by email or handle)
      const usersCol = collection(db, 'users');
      const userSnapshots = await getDocs(usersCol);
      for (const docSnap of userSnapshots.docs) {
        const uData = docSnap.data() as User;
        if (!uData) continue;
        const uEmail = (uData.email || '').trim().toLowerCase();
        const uHandle = (uData.handle || uData.username || '').trim().toLowerCase().replace(/^@/, '');
        if (
          docSnap.id === userId ||
          (normEmail && uEmail === normEmail) ||
          (normHandle && uHandle === normHandle)
        ) {
          await deleteDoc(doc(db, 'users', docSnap.id)).catch(() => {});
        }
      }

      // 2c. Delete user's authored stars from Firestore
      const starsCol = collection(db, 'stars');
      const starSnapshots = await getDocs(starsCol);
      for (const starDoc of starSnapshots.docs) {
        const s = starDoc.data() as StarNode;
        if (!s) continue;
        const authorId = s.authorId || s.userId;
        const authorHandle = (s.author?.handle || '').trim().toLowerCase().replace(/^@/, '');
        if (
          authorId === userId ||
          (normHandle && authorHandle === normHandle)
        ) {
          await deleteDoc(doc(db, 'stars', starDoc.id)).catch(() => {});
        }
      }

      // 2d. Delete user's active stories from Firestore
      const storiesCol = collection(db, 'stories');
      const storySnapshots = await getDocs(storiesCol);
      for (const storyDoc of storySnapshots.docs) {
        const st = storyDoc.data() as StarStory;
        if (!st) continue;
        const authorId = st.authorId || (st as any).userId;
        const authorHandle = ((st as any).author?.handle || '').trim().toLowerCase().replace(/^@/, '');
        if (
          authorId === userId ||
          (normHandle && authorHandle === normHandle)
        ) {
          await deleteDoc(doc(db, 'stories', storyDoc.id)).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('[Firebase] deleteUserFromCloud database cleanup error:', err);
    }
  }

  // 3. Clean user's stars from local cache & broadcast
  const currentStars = getCachedStars();
  const updatedStars = currentStars.filter(s => {
    const authorId = s.authorId || s.userId;
    const authorHandle = (s.author?.handle || '').trim().toLowerCase().replace(/^@/, '');
    return authorId !== userId && (!normHandle || authorHandle !== normHandle);
  });
  cacheStars(updatedStars);
  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: 'STARS_UPDATED', stars: updatedStars });
  }
  window.dispatchEvent(new CustomEvent('asterful_stars_synced', { detail: { stars: updatedStars } }));

  // 4. Clean user's stories from local cache & broadcast
  const currentStories = getCachedStories();
  const updatedStories = currentStories.filter(st => {
    const authorId = st.authorId || (st as any).userId;
    const authorHandle = ((st as any).author?.handle || '').trim().toLowerCase().replace(/^@/, '');
    return authorId !== userId && (!normHandle || authorHandle !== normHandle);
  });

  cacheStories(updatedStories);
  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: 'STORIES_UPDATED', stories: updatedStories });
  }
  window.dispatchEvent(new CustomEvent('asterful_stories_synced', { detail: { stories: updatedStories } }));
}


export async function checkUserUniquenessInCloud(params: {
  email?: string;
  username?: string;
  handle?: string;
  displayName?: string;
  excludeUserId?: string;
}): Promise<{ isUnique: boolean; field?: 'email' | 'username' | 'handle' | 'displayName'; error?: string }> {
  const normEmail = (params.email || '').trim().toLowerCase();
  const normUsername = (params.username || '').trim().toLowerCase().replace(/^@/, '');
  const normHandle = (params.handle || '').trim().toLowerCase().replace(/^@/, '');
  const normDisplayName = (params.displayName || '').trim().toLowerCase();

  // 1. Check local cache first
  const localUsers = getCachedUsers();
  for (const u of localUsers) {
    if (params.excludeUserId && u.id === params.excludeUserId) continue;

    const uEmail = (u.email || '').trim().toLowerCase();
    const uUsername = (u.username || '').trim().toLowerCase().replace(/^@/, '');
    const uHandle = (u.handle || '').trim().toLowerCase().replace(/^@/, '');
    const uDisplayName = (u.displayName || '').trim().toLowerCase();

    if (normEmail && uEmail && uEmail === normEmail) {
      return { isUnique: false, field: 'email', error: 'An account with this email address already exists. Please sign in.' };
    }
    if (normHandle && ((uHandle && uHandle === normHandle) || (uUsername && uUsername === normHandle))) {
      return { isUnique: false, field: 'handle', error: `The username @${params.handle?.replace(/^@/, '')} is already taken. Please choose another.` };
    }
    if (normUsername && ((uUsername && uUsername === normUsername) || (uHandle && uHandle === normUsername))) {
      return { isUnique: false, field: 'username', error: `The username @${params.username?.replace(/^@/, '')} is already taken. Please choose another.` };
    }
    if (normDisplayName && uDisplayName && uDisplayName === normDisplayName) {
      return { isUnique: false, field: 'displayName', error: 'This Display Name is already taken. Please choose a unique Display Name.' };
    }
  }

  // 2. Query Firestore Database directly
  const db = getFirebaseFirestore();
  if (db) {
    try {
      const usersCol = collection(db, 'users');
      const snapshot = await getDocs(usersCol);
      for (const docSnap of snapshot.docs) {
        const u = docSnap.data() as User;
        if (!u) continue;
        const uId = u.id || docSnap.id;
        if (params.excludeUserId && uId === params.excludeUserId) continue;

        const uEmail = (u.email || '').trim().toLowerCase();
        const uUsername = (u.username || '').trim().toLowerCase().replace(/^@/, '');
        const uHandle = (u.handle || '').trim().toLowerCase().replace(/^@/, '');
        const uDisplayName = (u.displayName || '').trim().toLowerCase();

        if (normEmail && uEmail && uEmail === normEmail) {
          return { isUnique: false, field: 'email', error: 'An account with this email address already exists. Please sign in.' };
        }
        if (normHandle && ((uHandle && uHandle === normHandle) || (uUsername && uUsername === normHandle))) {
          return { isUnique: false, field: 'handle', error: `The username @${params.handle?.replace(/^@/, '')} is already taken. Please choose another.` };
        }
        if (normUsername && ((uUsername && uUsername === normUsername) || (uHandle && uHandle === normUsername))) {
          return { isUnique: false, field: 'username', error: `The username @${params.username?.replace(/^@/, '')} is already taken. Please choose another.` };
        }
        if (normDisplayName && uDisplayName && uDisplayName === normDisplayName) {
          return { isUnique: false, field: 'displayName', error: 'This Display Name is already taken. Please choose a unique Display Name.' };
        }
      }
    } catch (err) {
      console.warn('[Firebase] checkUserUniquenessInCloud query error:', err);
    }
  }

  return { isUnique: true };
}

export async function findUserInCloud(identifier: string): Promise<User | null> {
  const normalized = identifier.trim().toLowerCase().replace(/^@/, '');
  if (!normalized) return null;

  // Check local cache first
  const localUsers = getCachedUsers();
  const localMatch = localUsers.find(u => {
    const uEmail = (u.email || '').trim().toLowerCase();
    const uUsername = (u.username || '').trim().toLowerCase();
    const uHandle = (u.handle || '').replace(/^@/, '').trim().toLowerCase();
    const uDisplayName = (u.displayName || '').trim().toLowerCase();
    return uEmail === normalized || uUsername === normalized || uHandle === normalized || uDisplayName === normalized;
  });
  if (localMatch) return localMatch;

  // Check Firestore directly
  const db = getFirebaseFirestore();
  if (!db) return null;

  try {
    const usersCol = collection(db, 'users');
    const snapshot = await getDocs(usersCol);
    for (const docSnap of snapshot.docs) {
      const u = docSnap.data() as User;
      if (u) {
        const uEmail = (u.email || '').trim().toLowerCase();
        const uUsername = (u.username || '').trim().toLowerCase();
        const uHandle = (u.handle || '').replace(/^@/, '').trim().toLowerCase();
        const uDisplayName = (u.displayName || '').trim().toLowerCase();
        if (uEmail === normalized || uUsername === normalized || uHandle === normalized || uDisplayName === normalized) {
          // Cache the found user locally
          saveUserToCloud(u);
          return u;
        }
      }
    }
  } catch (err) {
    console.warn('[Firebase] findUserInCloud error:', err);
  }

  return null;
}

/**
 * --------------------------------------------------------------------------------
 * STARS CLOUD INTEGRATION & MULTIPLAYER SYNC
 * --------------------------------------------------------------------------------
 */

export function getCachedStars(): StarNode[] {
  try {
    const raw = localStorage.getItem(STARS_CACHE_KEY) || localStorage.getItem(LEGACY_STARS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

export function cacheStars(stars: StarNode[]) {
  try {
    const payload = JSON.stringify(stars);
    localStorage.setItem(STARS_CACHE_KEY, payload);
    localStorage.setItem(LEGACY_STARS_CACHE_KEY, payload);
  } catch {
    // ignore
  }
}

export function subscribeGlobalStars(onUpdate: (stars: StarNode[]) => void): () => void {
  let unsubscribeFirestore: Unsubscribe | null = null;
  const db = getFirebaseFirestore();

  if (db) {
    try {
      const starsCol = collection(db, 'stars');
      unsubscribeFirestore = onSnapshot(
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

          // Merge with any local unsynced stars
          const localStars = getCachedStars();
          const starMap = new Map<string, StarNode>();
          localStars.forEach(s => starMap.set(s.id, s));
          cloudStars.forEach(s => starMap.set(s.id, s));
          const merged = Array.from(starMap.values());

          cacheStars(merged);
          onUpdate(merged);
        },
        (error) => {
          console.warn('[Firebase] stars onSnapshot error:', error);
          onUpdate(getCachedStars());
        }
      );
    } catch {
      // Fallback
    }
  }

  // Cross-tab Real-time BroadcastChannel & Local Event Listener
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
    if (unsubscribeFirestore) {
      unsubscribeFirestore();
    }
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcast);
    }
    window.removeEventListener('asterful_stars_synced', handleWindowCustomEvent);
  };
}

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
    } catch (err) {
      console.warn('[Firebase] saveStarToCloud error:', err);
    }
  }
}

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
      } catch (err) {
        console.warn('[Firebase] updateStarInCloud error:', err);
      }
    }
  }
}

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
    } catch (err) {
      console.warn('[Firebase] deleteStarFromCloud error:', err);
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
    const raw = localStorage.getItem(STORIES_CACHE_KEY) || localStorage.getItem(LEGACY_STORIES_CACHE_KEY);
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
    const payload = JSON.stringify(stories);
    localStorage.setItem(STORIES_CACHE_KEY, payload);
    localStorage.setItem(LEGACY_STORIES_CACHE_KEY, payload);
  } catch {
    // ignore
  }
}

export function subscribeGlobalStories(onUpdate: (stories: StarStory[]) => void): () => void {
  let unsubscribeFirestore: Unsubscribe | null = null;
  const db = getFirebaseFirestore();

  if (db) {
    try {
      const storiesCol = collection(db, 'stories');
      unsubscribeFirestore = onSnapshot(
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
          console.warn('[Firebase] stories onSnapshot error:', error);
          onUpdate(getCachedStories());
        }
      );
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
    if (unsubscribeFirestore) {
      unsubscribeFirestore();
    }
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
    } catch (err) {
      console.warn('[Firebase] saveStoryToCloud error:', err);
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
    } catch (err) {
      console.warn('[Firebase] deleteStoryFromCloud error:', err);
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
    } catch (err) {
      console.warn('[Firebase] markStoryViewedInCloud error:', err);
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
  let unsubscribeFirestore: Unsubscribe | null = null;
  const db = getFirebaseFirestore();

  if (db) {
    try {
      const galaxiesCol = collection(db, 'galaxies');
      unsubscribeFirestore = onSnapshot(
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
          console.warn('[Firebase] galaxies onSnapshot error:', error);
          onUpdate(getCachedGalaxies());
        }
      );
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
    if (unsubscribeFirestore) {
      unsubscribeFirestore();
    }
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
    } catch (err) {
      console.warn('[Firebase] saveGalaxyToCloud error:', err);
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
    } catch (err) {
      console.warn('[Firebase] toggleJoinGalaxyInCloud error:', err);
    }
  }

  return updatedGalaxies;
}

/**
 * --------------------------------------------------------------------------------
 * CLOUD DATA MIGRATION & BIDIRECTIONAL SYNC ON STARTUP
 * --------------------------------------------------------------------------------
 * Automatically pushes pre-existing local storage stars and users up to Firestore
 * and downloads any new remote stars/users so no data is isolated or stuck locally.
 */
export async function syncLocalDataToCloud(): Promise<{
  stars: StarNode[];
  stories: StarStory[];
  galaxies: Galaxy[];
  users: User[];
}> {
  const localStars = getCachedStars();
  const localStories = getCachedStories();
  const localGalaxies = getCachedGalaxies();
  const localUsers = getCachedUsers();

  const db = getFirebaseFirestore();
  if (!db) {
    return {
      stars: localStars,
      stories: localStories,
      galaxies: localGalaxies,
      users: localUsers,
    };
  }

  try {
    // 1. Fetch all Firestore documents
    const [starsSnap, storiesSnap, galaxiesSnap, usersSnap] = await Promise.all([
      getDocs(collection(db, 'stars')),
      getDocs(collection(db, 'stories')),
      getDocs(collection(db, 'galaxies')),
      getDocs(collection(db, 'users')),
    ]);

    const cloudStarsMap = new Map<string, StarNode>();
    starsSnap.forEach((docSnap) => {
      const data = docSnap.data() as StarNode;
      if (data && data.id) cloudStarsMap.set(data.id, data);
    });

    const now = new Date().toISOString();
    const cloudStoriesMap = new Map<string, StarStory>();
    storiesSnap.forEach((docSnap) => {
      const data = docSnap.data() as StarStory;
      if (data && data.id && data.expiresAt > now) cloudStoriesMap.set(data.id, data);
    });

    const cloudGalaxiesMap = new Map<string, Galaxy>();
    INITIAL_GALAXIES.forEach((g) => cloudGalaxiesMap.set(g.id, g));
    galaxiesSnap.forEach((docSnap) => {
      const data = docSnap.data() as Galaxy;
      if (data && data.id) cloudGalaxiesMap.set(data.id, data);
    });

    const cloudUsersMap = new Map<string, User>();
    usersSnap.forEach((docSnap) => {
      const data = docSnap.data() as User;
      if (data && data.id) cloudUsersMap.set(data.id, data);
    });

    // 2. Upload any local stars that are missing from cloud (Pre-backend creations)
    const uploadStarPromises: Promise<void>[] = [];
    localStars.forEach((star) => {
      if (!cloudStarsMap.has(star.id)) {
        cloudStarsMap.set(star.id, star);
        uploadStarPromises.push(
          setDoc(doc(db, 'stars', star.id), {
            ...star,
            updatedAt: new Date().toISOString(),
          }).catch((e) => console.warn('Star upload error:', e))
        );
      }
    });

    // 3. Upload any local users that are missing from cloud (Pre-backend accounts)
    const uploadUserPromises: Promise<void>[] = [];
    localUsers.forEach((user) => {
      if (user && user.id && !user.isGuest && !cloudUsersMap.has(user.id)) {
        cloudUsersMap.set(user.id, user);
        uploadUserPromises.push(
          setDoc(doc(db, 'users', user.id), {
            ...user,
            updatedAt: new Date().toISOString(),
          }).catch((e) => console.warn('User upload error:', e))
        );
      }
    });

    // 4. Upload any local stories that are missing from cloud
    const uploadStoryPromises: Promise<void>[] = [];
    localStories.forEach((story) => {
      if (story && story.id && story.expiresAt > now && !cloudStoriesMap.has(story.id)) {
        cloudStoriesMap.set(story.id, story);
        uploadStoryPromises.push(
          setDoc(doc(db, 'stories', story.id), story).catch((e) => console.warn('Story upload error:', e))
        );
      }
    });

    // Run background uploads
    Promise.all([...uploadStarPromises, ...uploadUserPromises, ...uploadStoryPromises]).catch(() => {});

    // 5. Build merged results
    const finalStars = Array.from(cloudStarsMap.values()).sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime() || 0;
      const timeB = new Date(b.createdAt).getTime() || 0;
      return timeB - timeA;
    });
    const finalStories = Array.from(cloudStoriesMap.values());
    const finalGalaxies = Array.from(cloudGalaxiesMap.values());
    const finalUsers = Array.from(cloudUsersMap.values());

    // 6. Update local caches
    cacheStars(finalStars);
    cacheStories(finalStories);
    cacheGalaxies(finalGalaxies);
    cacheUsers(finalUsers);

    return {
      stars: finalStars,
      stories: finalStories,
      galaxies: finalGalaxies,
      users: finalUsers,
    };
  } catch (err) {
    console.warn('[Firebase] syncLocalDataToCloud error:', err);
    return {
      stars: localStars,
      stories: localStories,
      galaxies: localGalaxies,
      users: localUsers,
    };
  }
}

/**
 * One-time fetch for global cosmos data on initial mount
 */
export async function fetchGlobalCosmosFeed(): Promise<{
  stars: StarNode[];
  stories: StarStory[];
  galaxies: Galaxy[];
  users: User[];
}> {
  return syncLocalDataToCloud();
}
