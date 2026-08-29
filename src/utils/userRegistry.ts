import { User } from '../types';
import { DEFAULT_COSMIC_AVATAR } from './colorPalette';
import { 
  saveUserToCloud, 
  updateUserInCloud, 
  findUserInCloud, 
  getCachedUsers, 
  cacheUsers 
} from '../services/cloudDatabase';

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

/**
 * Saves a newly registered user to the persistent registry in localStorage and Cloud Firestore.
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
    saveUserToCloud(updatedUser);
  } catch {
    // Ignore storage errors
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
