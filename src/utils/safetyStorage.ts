import { User, StarReport, ReportReason } from '../types';
import { getAllRegisteredUsers, registerUser, getUserForAuthor } from './userRegistry';

const REPORTS_STORAGE_KEY = 'asterful_reports_v1';
export const SAFETY_UPDATE_EVENT = 'asterful_safety_updated';

function dispatchSafetyUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SAFETY_UPDATE_EVENT));
  }
}

// ----------------------------------------------------
// 1. Eclipse 🌒 / End Eclipse (Block / Unblock)
// ----------------------------------------------------

/**
 * Checks if targetUserId is eclipsed by currentUserId
 */
export function isUserEclipsed(currentUserId?: string, targetUserId?: string): boolean {
  if (!currentUserId || !targetUserId) return false;
  const allUsers = getAllRegisteredUsers();
  const currentUser = allUsers.find((u) => u.id === currentUserId);
  if (!currentUser || !currentUser.eclipsedUserIds) return false;
  return currentUser.eclipsedUserIds.includes(targetUserId);
}

/**
 * Checks if there is a mutual eclipse or either party has eclipsed the other
 */
export function isEclipseActiveBetween(userAId?: string, userBId?: string): boolean {
  if (!userAId || !userBId) return false;
  return isUserEclipsed(userAId, userBId) || isUserEclipsed(userBId, userAId);
}

/**
 * Eclipses (blocks) an explorer:
 * - Adds targetUserId to currentUser's eclipsedUserIds
 * - Removes following/follower links between the two
 */
export function eclipseUser(
  currentUser: User,
  targetUserId: string
): { updatedCurrentUser: User; targetUser?: User } {
  const allUsers = getAllRegisteredUsers();
  const targetUser = allUsers.find((u) => u.id === targetUserId);

  const eclipsedSet = new Set<string>(currentUser.eclipsedUserIds || []);
  eclipsedSet.add(targetUserId);

  // Automatically remove following / followers
  const myFollowing = new Set<string>(currentUser.following || []);
  myFollowing.delete(targetUserId);
  const myFollowers = new Set<string>(currentUser.followers || []);
  myFollowers.delete(targetUserId);

  // Also remove from any pending orbit requests
  const myOrbitRequests = (currentUser.orbitRequests || []).filter((id) => id !== targetUserId);

  const updatedCurrentUser: User = {
    ...currentUser,
    eclipsedUserIds: Array.from(eclipsedSet),
    following: Array.from(myFollowing),
    followers: Array.from(myFollowers),
    orbitRequests: myOrbitRequests,
  };

  registerUser(updatedCurrentUser);

  let updatedTargetUser: User | undefined;
  if (targetUser) {
    const targetFollowing = new Set<string>(targetUser.following || []);
    targetFollowing.delete(currentUser.id);
    const targetFollowers = new Set<string>(targetUser.followers || []);
    targetFollowers.delete(currentUser.id);
    const targetRequests = (targetUser.orbitRequests || []).filter((id) => id !== currentUser.id);

    updatedTargetUser = {
      ...targetUser,
      following: Array.from(targetFollowing),
      followers: Array.from(targetFollowers),
      orbitRequests: targetRequests,
    };
    registerUser(updatedTargetUser);
  }

  dispatchSafetyUpdate();

  return { updatedCurrentUser, targetUser: updatedTargetUser };
}

/**
 * Ends Eclipse (unblocks) an explorer
 */
export function endEclipseUser(
  currentUser: User,
  targetUserId: string
): { updatedCurrentUser: User } {
  const eclipsedSet = new Set<string>(currentUser.eclipsedUserIds || []);
  eclipsedSet.delete(targetUserId);

  const updatedCurrentUser: User = {
    ...currentUser,
    eclipsedUserIds: Array.from(eclipsedSet),
  };

  registerUser(updatedCurrentUser);
  dispatchSafetyUpdate();

  return { updatedCurrentUser };
}

/**
 * Returns full User objects for all explorers eclipsed by the user
 */
export function getEclipsedExplorers(currentUserId: string): User[] {
  const allUsers = getAllRegisteredUsers();
  const currentUser = allUsers.find((u) => u.id === currentUserId);
  if (!currentUser || !currentUser.eclipsedUserIds || currentUser.eclipsedUserIds.length === 0) {
    return [];
  }

  const map = new Map<string, User>(allUsers.map((u) => [u.id, u]));
  return currentUser.eclipsedUserIds
    .map((id) => map.get(id))
    .filter((u): u is User => Boolean(u));
}

// ----------------------------------------------------
// 2. Private Sky 🔒 & Orbit Requests 🪐
// ----------------------------------------------------

/**
 * Toggles Private Sky setting for currentUser
 */
export function setPrivateSkyStatus(currentUser: User, isPrivate: boolean): User {
  const updatedUser: User = {
    ...currentUser,
    isPrivateSky: isPrivate,
  };
  registerUser(updatedUser);
  dispatchSafetyUpdate();
  return updatedUser;
}

/**
 * Checks if target user has enabled Private Sky 🔒
 */
export function isUserPrivateSky(targetUserId?: string): boolean {
  if (!targetUserId) return false;
  const allUsers = getAllRegisteredUsers();
  const user = allUsers.find((u) => u.id === targetUserId);
  return Boolean(user?.isPrivateSky);
}

/**
 * Checks if current user has an active pending Orbit Request for target user
 */
export function hasRequestedOrbit(currentUserId?: string, targetUserId?: string): boolean {
  if (!currentUserId || !targetUserId) return false;
  const allUsers = getAllRegisteredUsers();
  const targetUser = allUsers.find((u) => u.id === targetUserId);
  if (!targetUser || !targetUser.orbitRequests) return false;
  return targetUser.orbitRequests.includes(currentUserId);
}

/**
 * Sends or toggles an Orbit Request to a Private Sky user
 */
export function toggleOrbitRequest(
  currentUser: User,
  targetUser: User
): { hasRequested: boolean; updatedTargetUser: User } {
  const allUsers = getAllRegisteredUsers();
  const freshTarget = allUsers.find((u) => u.id === targetUser.id) || targetUser;

  const requests = new Set<string>(freshTarget.orbitRequests || []);
  let hasRequested = false;

  if (requests.has(currentUser.id)) {
    requests.delete(currentUser.id);
    hasRequested = false;
  } else {
    requests.add(currentUser.id);
    hasRequested = true;
  }

  const updatedTargetUser: User = {
    ...freshTarget,
    orbitRequests: Array.from(requests),
  };

  registerUser(updatedTargetUser);
  dispatchSafetyUpdate();

  return { hasRequested, updatedTargetUser };
}

/**
 * Approves an Orbit Request ("Join Orbit"):
 * Adds requester to target user's followers, and target user to requester's following.
 */
export function approveOrbitRequest(
  currentUser: User,
  requesterId: string
): { updatedCurrentUser: User; updatedRequester?: User } {
  const allUsers = getAllRegisteredUsers();
  const requester = allUsers.find((u) => u.id === requesterId);

  // Remove from orbitRequests
  const requests = (currentUser.orbitRequests || []).filter((id) => id !== requesterId);
  const myFollowers = new Set<string>(currentUser.followers || []);
  myFollowers.add(requesterId);

  const updatedCurrentUser: User = {
    ...currentUser,
    orbitRequests: requests,
    followers: Array.from(myFollowers),
  };

  registerUser(updatedCurrentUser);

  let updatedRequester: User | undefined;
  if (requester) {
    const requesterFollowing = new Set<string>(requester.following || []);
    requesterFollowing.add(currentUser.id);
    updatedRequester = {
      ...requester,
      following: Array.from(requesterFollowing),
    };
    registerUser(updatedRequester);
  }

  dispatchSafetyUpdate();

  return { updatedCurrentUser, updatedRequester };
}

/**
 * Rejects an Orbit Request ("Pass Orbit"):
 * Removes requester from currentUser's orbitRequests without following.
 */
export function rejectOrbitRequest(currentUser: User, requesterId: string): User {
  const requests = (currentUser.orbitRequests || []).filter((id) => id !== requesterId);
  const updatedCurrentUser: User = {
    ...currentUser,
    orbitRequests: requests,
  };
  registerUser(updatedCurrentUser);
  dispatchSafetyUpdate();
  return updatedCurrentUser;
}

/**
 * Retrieves full User objects for all pending orbit requests
 */
export function getPendingOrbitRequests(currentUserId: string): User[] {
  const allUsers = getAllRegisteredUsers();
  const currentUser = allUsers.find((u) => u.id === currentUserId);
  if (!currentUser || !currentUser.orbitRequests || currentUser.orbitRequests.length === 0) {
    return [];
  }

  const map = new Map<string, User>(allUsers.map((u) => [u.id, u]));
  return currentUser.orbitRequests
    .map((id) => map.get(id))
    .filter((u): u is User => Boolean(u));
}

// ----------------------------------------------------
// 3. Flag a Star 🚩 (Reporting System)
// ----------------------------------------------------

/**
 * Loads all stored reports from localStorage
 */
export function getAllReports(): StarReport[] {
  try {
    const raw = localStorage.getItem(REPORTS_STORAGE_KEY);
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
 * Submits a new moderation report for a star, glowback, or explorer
 */
export function submitReport(reportData: {
  targetType: 'star' | 'glowback' | 'explorer';
  targetId: string;
  targetTitle?: string;
  targetSnippet?: string;
  authorId?: string;
  authorName?: string;
  authorHandle?: string;
  reporterId: string;
  reporterName: string;
  reason: ReportReason;
  details?: string;
}): StarReport {
  const newReport: StarReport = {
    id: `report-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    ...reportData,
    timestamp: new Date().toISOString(),
    status: 'pending',
  };

  const currentReports = getAllReports();
  currentReports.unshift(newReport);

  try {
    localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(currentReports));
  } catch {
    // ignore storage quota
  }

  return newReport;
}
