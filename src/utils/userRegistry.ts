import { User } from '../types';
import { DEFAULT_COSMIC_AVATAR } from './colorPalette';
import { 
  saveUserToCloud, 
  updateUserInCloud, 
  deleteUserFromCloud,
  findUserInCloud, 
  checkUserUniquenessInCloud,
  getCachedUsers, 
  cacheUsers 
} from '../services/cloudDatabase';
import {
  db,
  getFirebaseFirestore,
  doc,
  setDoc,
  getFirebaseAuth,
  deleteUser as firebaseDeleteUser,
  signInWithEmailAndPassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  signOut as firebaseSignOut
} from '../services/firebase';

export { checkUserUniquenessInCloud };


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

export const INITIAL_CREATORS: User[] = [];

/**
 * Updates the in-memory cache and localStorage when cloud data changes
 */
export function setRegisteredUsersFromCloud(users: User[]): void {
  if (!Array.isArray(users)) return;
  cachedUsersList = users;
  cacheUsers(users);
}

/**
 * Retrieves all registered users and creators from localStorage and memory cache.
 */
export function getAllRegisteredUsers(): User[] {
  if (cachedUsersList && cachedUsersList.length > 0) {
    return cachedUsersList;
  }
  const usersMap = new Map<string, User>();

  // 1. Load initial creators (empty by default)
  INITIAL_CREATORS.forEach((creator) => {
    usersMap.set(creator.id, { age: 24, isOver18: true, ...creator });
  });

  // 2. Load stored users from cloud cached localStorage
  try {
    const cached = getCachedUsers();
    if (Array.isArray(cached)) {
      cached.forEach((u) => {
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

export interface RegisterResult {
  success: boolean;
  user?: User;
  error?: string;
  field?: 'email' | 'username' | 'handle' | 'displayName';
}

/**
 * Asynchronously registers a new user after verifying database uniqueness in Firestore and local cache.
 * Blocks duplicate email, username/handle, and display name across all accounts.
 */
export async function registerUserAsync(user: User): Promise<RegisterResult> {
  if (!user || user.isGuest) {
    return { success: false, error: 'Invalid user registration payload.' };
  }

  const email = (user.email || '').trim().toLowerCase();
  const username = (user.username || '').trim().toLowerCase().replace(/^@/, '');
  const handle = (user.handle || '').trim().toLowerCase().replace(/^@/, '');
  const displayName = (user.displayName || '').trim();

  try {
    // 1. Database & Cache uniqueness check
    const uniquenessCheck = await checkUserUniquenessInCloud({
      email,
      username,
      handle,
      displayName,
      excludeUserId: user.id,
    });

    if (!uniquenessCheck.isUnique) {
      return {
        success: false,
        field: uniquenessCheck.field,
        error: uniquenessCheck.error || 'An account with these credentials already exists in the database.',
      };
    }

    // 2. Persist directly to Cloud Firestore 'users' collection and local cache
    const firestoreDb = db || getFirebaseFirestore();
    const userId = (user as any).uid || user.id;
    if (firestoreDb) {
      console.log('[Firebase] Registering user in Firestore "users" collection (setDoc) for UID:', userId);
      const userRef = doc(firestoreDb, 'users', userId);
      const userPayload = {
        id: userId,
        uid: userId,
        email: (user.email || '').trim().toLowerCase(),
        displayName: user.displayName || user.username || '',
        username: (user.username || '').replace(/^@/, ''),
        handle: user.handle ? (user.handle.startsWith('@') ? user.handle : `@${user.handle}`) : `@${user.username}`,
        bio: user.bio || '',
        avatarUrl: user.avatarUrl || '',
        bannerUrl: user.bannerUrl || '',
        joinedAt: user.joinedAt || new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        glowColor: user.glowColor || '#FFD700',
        followers: user.followers || [],
        following: user.following || [],
        savedStarIds: user.savedStarIds || [],
        isPrivateSky: Boolean(user.isPrivateSky),
        eclipsedUserIds: user.eclipsedUserIds || [],
        orbitRequests: user.orbitRequests || [],
        age: user.age,
        isOver18: user.isOver18,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(userRef, userPayload, { merge: true });
      console.log('[Firebase] User registration saved to Firestore "users" collection successfully:', userId);
    } else {
      console.warn('[Firebase] Firestore db is not initialized. Please verify Firebase environment variables in .env.');
    }

    registerUser(user);
    await saveUserToCloud(user);

    return {
      success: true,
      user,
    };
  } catch (err) {
    console.error('[Firebase] Failed to write user profile during registration to Firestore "users" collection:', err);
    // Still save locally
    registerUser(user);
    return {
      success: true,
      user,
    };
  }
}

/**
 * Saves a newly registered or updated user to the persistent registry in localStorage and Cloud Firestore.
 */
export function registerUser(user: User): void {
  if (!user || user.isGuest) return;

  try {
    const allUsers = getAllRegisteredUsers();
    const normalizedNewName = (user.displayName || user.username || '').trim().toLowerCase();
    const existingIndex = allUsers.findIndex(
      (u) => u.id === user.id || (u.displayName || u.username || '').trim().toLowerCase() === normalizedNewName
    );

    let updatedUser: User;
    if (existingIndex >= 0) {
      updatedUser = {
        ...allUsers[existingIndex],
        ...user,
        followers: user.followers !== undefined ? user.followers : allUsers[existingIndex].followers || [],
        following: user.following !== undefined ? user.following : allUsers[existingIndex].following || [],
        eclipsedUserIds: user.eclipsedUserIds !== undefined ? user.eclipsedUserIds : allUsers[existingIndex].eclipsedUserIds || [],
        isPrivateSky: user.isPrivateSky !== undefined ? user.isPrivateSky : allUsers[existingIndex].isPrivateSky || false,
        orbitRequests: user.orbitRequests !== undefined ? user.orbitRequests : allUsers[existingIndex].orbitRequests || [],
      };
      allUsers[existingIndex] = updatedUser;
    } else {
      updatedUser = {
        ...user,
        followers: user.followers || [],
        following: user.following || [],
        eclipsedUserIds: user.eclipsedUserIds || [],
        isPrivateSky: user.isPrivateSky || false,
        orbitRequests: user.orbitRequests || [],
      };
      allUsers.push(updatedUser);
    }

    cachedUsersList = allUsers;
    cacheUsers(allUsers);

    // Save to Cloud Firestore
    saveUserToCloud(updatedUser).catch((err) => {
      console.error('[UserRegistry] Error in saveUserToCloud background promise:', err);
    });
  } catch (err) {
    console.error('[UserRegistry] Failed to register user:', err);
  }
}

/**
 * Toggles the follow status between currentUser and targetUser.
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

  // Persist both locally and in cloud
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
 * Validates sign-in credentials against registered users (synchronous cache + local storage).
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
 * Validates sign-in credentials with async Firestore cloud lookup fallback.
 * Guarantees cross-device sign-in works immediately even if the user registered on another device.
 */
export async function validateUserCredentialsAsync(
  identifier: string,
  passwordInput: string
): Promise<AuthValidationResult> {
  // 1. Try local cache first
  const localResult = validateUserCredentials(identifier, passwordInput);
  if (localResult.success) {
    return localResult;
  }

  // 2. If user not found locally, query Firestore directly
  if (localResult.error === 'NO_ACCOUNT') {
    const cloudUser = await findUserInCloud(identifier);
    if (!cloudUser) {
      return { success: false, error: 'NO_ACCOUNT' };
    }

    const trimmedPassword = passwordInput.trim();
    const storedPassword = cloudUser.password || 'password123';

    if (storedPassword !== trimmedPassword) {
      return { success: false, error: 'WRONG_PASSWORD' };
    }

    // Save to local cache
    registerUser(cloudUser);
    return { success: true, user: cloudUser };
  }

  return localResult;
}

/**
 * Updates a registered user's account password in localStorage and Cloud Firestore.
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
  cachedUsersList = allUsers;
  cacheUsers(allUsers);

  // Cloud Firestore update
  updateUserInCloud(updatedUser.id, { password: newPassword.trim() });

  return { success: true, user: updatedUser };
}

export interface AccountDeletionResult {
  success: boolean;
  requiresRecentLogin?: boolean;
  error?: string;
}

/**
 * Performs full deletion of an account across Firebase Authentication,
 * Cloud Firestore documents, and local session storage.
 */
export async function deleteAccountComplete(
  user: User,
  passwordForReauth?: string
): Promise<AccountDeletionResult> {
  if (!user || user.isGuest) {
    return { success: false, error: 'Invalid user account.' };
  }

  // 1. Firebase Authentication Deletion
  const auth = getFirebaseAuth();
  if (auth) {
    try {
      let firebaseUser = auth.currentUser;

      // If no active currentUser in auth instance but user has email/password, attempt sign in first
      if (!firebaseUser && user.email) {
        const passwordToUse = passwordForReauth || user.password;
        if (passwordToUse) {
          try {
            const credentialResult = await signInWithEmailAndPassword(auth, user.email, passwordToUse);
            firebaseUser = credentialResult.user;
          } catch (signInErr: any) {
            console.warn('[Firebase] signIn before deletion error:', signInErr);
          }
        }
      }

      if (firebaseUser) {
        // If password was provided for re-authentication, re-authenticate first
        if (passwordForReauth && firebaseUser.email) {
          try {
            const credential = EmailAuthProvider.credential(firebaseUser.email, passwordForReauth);
            await reauthenticateWithCredential(firebaseUser, credential);
          } catch (reauthErr: any) {
            console.warn('[Firebase] Reauthentication error:', reauthErr);
            return {
              success: false,
              requiresRecentLogin: true,
              error: 'Invalid password. Please re-enter your password to confirm account collapse.',
            };
          }
        }

        // Call deleteUser(auth.currentUser)
        try {
          await firebaseDeleteUser(firebaseUser);
        } catch (delErr: any) {
          console.warn('[Firebase] deleteUser error:', delErr);
          if (
            delErr.code === 'auth/requires-recent-login' ||
            (delErr.message && delErr.message.includes('requires-recent-login'))
          ) {
            return {
              success: false,
              requiresRecentLogin: true,
              error: 'This action requires recent authentication. Please enter your password to collapse your account.',
            };
          }
        }
      }
    } catch (authErr: any) {
      console.warn('[Firebase Auth] General deletion error:', authErr);
      if (
        authErr.code === 'auth/requires-recent-login' ||
        (authErr.message && authErr.message.includes('requires-recent-login'))
      ) {
        return {
          success: false,
          requiresRecentLogin: true,
          error: 'This action requires recent authentication. Please enter your password to collapse your account.',
        };
      }
    }
  }

  // 2. Cloud Firestore & Local Cache Cleanup
  try {
    await deleteUserFromCloud(user.id, user.email, user.handle);
  } catch (cloudErr) {
    console.warn('[Firebase] deleteUserFromCloud error:', cloudErr);
  }

  // 3. Remove user from local registries
  try {
    const normEmail = (user.email || '').trim().toLowerCase();
    const normHandle = (user.handle || user.username || '').trim().toLowerCase().replace(/^@/, '');
    const currentUsers = getAllRegisteredUsers().filter(u => {
      if (u.id === user.id) return false;
      const uEmail = (u.email || '').trim().toLowerCase();
      const uHandle = (u.handle || u.username || '').trim().toLowerCase().replace(/^@/, '');
      if (normEmail && uEmail && uEmail === normEmail) return false;
      if (normHandle && uHandle && uHandle === normHandle) return false;
      return true;
    });
    cachedUsersList = currentUsers;
    cacheUsers(currentUsers);
  } catch {
    // ignore
  }

  // 4. State & Storage Reset: Purge all session keys and user-specific storage
  const storageKeysToRemove = [
    'asterful_auth_user_v2',
    'constellation_auth_user_v1',
    'asterful_auth_token',
    'asterful_current_user',
    `asterful_unlit_drafts_${user.id}`,
    'asterful_unlit_drafts',
    'constellation_unlit_drafts',
    `asterful_bookmarks_${user.id}`,
    `asterful_liked_stars_${user.id}`,
    `asterful_reignited_stars_${user.id}`,
    `asterful_notifications_${user.id}`,
    `asterful_saved_stars_${user.id}`,
    'asterful_recent_searches',
  ];

  storageKeysToRemove.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  });

  if (auth) {
    try {
      await firebaseSignOut(auth);
    } catch {
      // ignore
    }
  }

  return { success: true };
}

