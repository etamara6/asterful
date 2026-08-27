import { ChatMessage, ChatRoom, User, ChatAttachment, StarLinkData } from '../types';
import { getAllRegisteredUsers } from './userRegistry';
import { isEclipseActiveBetween } from './safetyStorage';

const CHAT_ROOMS_KEY = 'constellation_chat_rooms_v1';
const CHAT_MESSAGES_KEY = 'constellation_chat_messages_v1';
const CHAT_READ_TIMESTAMPS_KEY = 'constellation_chat_read_timestamps_v1';

export const CHAT_UPDATE_EVENT = 'constellation_chat_updated';

function dispatchChatUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHAT_UPDATE_EVENT));
  }
}

// Initial seed rooms between default cosmic creators
export const SEED_ROOMS: ChatRoom[] = [];
export const SEED_MESSAGES: ChatMessage[] = [];

/**
 * Loads all raw rooms from storage, returning empty array if none.
 */
function loadAllStoredRooms(): ChatRoom[] {
  try {
    const raw = localStorage.getItem(CHAT_ROOMS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw || '[]');
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }

  return [];
}

/**
 * Loads all raw messages from storage, returning empty array if none.
 */
function loadAllStoredMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(CHAT_MESSAGES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw || '[]');
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }

  return [];
}

/**
 * Check if an Explorer is currently active (In Orbit 🪐 vs Out of Orbit)
 */
export function isUserInOrbit(userId: string, currentUserId?: string): boolean {
  if (!userId) return false;
  if (currentUserId && userId === currentUserId) return true;

  // Key active cosmic crew
  const activeStargazers = [
    'user-aria-chen',
    'user-lyra-solis',
    'user-marcus-vance',
    'user-elena-rostova',
    'user-eon-zero',
    'user-zara-novak'
  ];
  if (activeStargazers.includes(userId)) return true;

  // Stored state or recent transmission
  try {
    const allMessages = loadAllStoredMessages();
    const recentCutoff = Date.now() - 1000 * 60 * 60 * 24;
    return allMessages.some(
      (m) => m.senderId === userId && new Date(m.timestamp).getTime() > recentCutoff
    );
  } catch {
    return false;
  }
}

/**
 * Ensures user chat state is initialized cleanly.
 */
export function ensureUserWelcomeChats(_user: User): void {
  // No-op: all conversations are user-initiated and empty by default
}


/**
 * STRICT PRIVACY: Retrieves only rooms where the user's ID is in participantIds.
 */
export function getRoomsForUser(userId: string): ChatRoom[] {
  if (!userId) return [];
  const allRooms = loadAllStoredRooms();
  
  const userRooms = allRooms.filter((room) => Array.isArray(room.participantIds) && room.participantIds.includes(userId));

  return userRooms.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

/**
 * STRICT PRIVACY: Retrieves a room only if the requesting user is a participant.
 */
export function getRoomById(roomId: string, userId: string): ChatRoom | null {
  if (!roomId || !userId) return null;
  const allRooms = loadAllStoredRooms();
  const room = allRooms.find((r) => r.id === roomId);
  if (!room) return null;

  if (!room.participantIds.includes(userId)) {
    return null;
  }
  return room;
}

/**
 * STRICT PRIVACY: Retrieves messages for a room ONLY if the user is in participantIds.
 */
export function getMessagesForRoom(roomId: string, userId: string): ChatMessage[] {
  if (!roomId || !userId) return [];
  const room = getRoomById(roomId, userId);
  if (!room) {
    return [];
  }

  const allMessages = loadAllStoredMessages();
  return allMessages
    .filter((m) => m.roomId === roomId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/**
 * Sends a message in a room. Validates user is a participant and dispatches Cosmic Signal event.
 */
export function sendMessage(
  roomId: string,
  sender: { id: string; displayName?: string; username?: string; name?: string; avatarUrl?: string },
  text: string,
  attachments?: ChatAttachment[],
  starLink?: StarLinkData
): ChatMessage | null {
  const trimmed = text.trim();
  const validAttachments = Array.isArray(attachments) && attachments.length > 0 ? attachments : undefined;
  if (!roomId || !sender?.id || (!trimmed && !validAttachments && !starLink)) return null;

  const allRooms = loadAllStoredRooms();
  const roomIndex = allRooms.findIndex((r) => r.id === roomId);
  if (roomIndex === -1) return null;

  const room = allRooms[roomIndex];
  if (!room.participantIds.includes(sender.id)) {
    return null;
  }

  // Prevent sending DMs if eclipse is active between the two users
  if (!room.isGroup && room.participantIds.length === 2) {
    const otherUserId = room.participantIds.find((id) => id !== sender.id);
    if (otherUserId && isEclipseActiveBetween(sender.id, otherUserId)) {
      return null;
    }
  }

  const senderName = sender.displayName || sender.username || sender.name || 'Explorer';
  const now = new Date().toISOString();

  const newMessage: ChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    roomId,
    senderId: sender.id,
    senderName,
    senderAvatar: sender.avatarUrl,
    text: trimmed,
    timestamp: now,
    attachments: validAttachments,
    starLink: starLink || undefined,
  };

  const allMessages = loadAllStoredMessages();
  allMessages.push(newMessage);

  // Determine last message preview
  let snippet = trimmed;
  if (!snippet) {
    if (starLink) {
      snippet = `Shared Star Link 🔗: "${starLink.title}"`;
    } else if (validAttachments) {
      const hasImage = validAttachments.some((a) => a.type === 'image');
      snippet = hasImage ? 'Captured Star 📸⭐' : `[${validAttachments.length} Attachment${validAttachments.length > 1 ? 's' : ''}]`;
    } else {
      snippet = 'Transmitted a Signal 📡';
    }
  }

  room.lastMessage = `${senderName}: ${snippet}`;
  room.updatedAt = now;
  allRooms[roomIndex] = room;

  try {
    localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(allMessages));
    localStorage.setItem(CHAT_ROOMS_KEY, JSON.stringify(allRooms));
    markRoomAsRead(roomId, sender.id);
    dispatchChatUpdate();

    // Dispatch real-time Cosmic Signal for offline receivers & listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('cosmic_signal_received', {
          detail: {
            roomId,
            roomName: room.name || 'Direct Signal Flow',
            isGroup: room.isGroup,
            message: newMessage,
            sender,
            text: `📡 ${senderName}: ${snippet}`,
          },
        })
      );
    }
  } catch {
    // ignore
  }

  return newMessage;
}

/**
 * Starts or retrieves an existing 1-on-1 Direct Message room between two users.
 */
export function createOrGetDirectRoom(
  currentUser: User,
  targetUser: User | { id: string; displayName?: string; name?: string; handle?: string; avatarUrl?: string }
): ChatRoom {
  const allRooms = loadAllStoredRooms();

  const existing = allRooms.find(
    (r) =>
      !r.isGroup &&
      r.participantIds.length === 2 &&
      r.participantIds.includes(currentUser.id) &&
      r.participantIds.includes(targetUser.id)
  );

  if (existing) {
    return existing;
  }

  // Create new Direct Message room
  const targetName = (targetUser as any).displayName || (targetUser as any).username || (targetUser as any).name || 'Explorer';
  const newRoom: ChatRoom = {
    id: `room-dm-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    name: undefined,
    isGroup: false,
    participantIds: [currentUser.id, targetUser.id],
    lastMessage: 'Signal Flow established.',
    updatedAt: new Date().toISOString(),
  };

  allRooms.unshift(newRoom);

  try {
    localStorage.setItem(CHAT_ROOMS_KEY, JSON.stringify(allRooms));
    dispatchChatUpdate();
  } catch {
    // ignore
  }

  return newRoom;
}

/**
 * Creates a new private group chat room (Signal Cluster 📡✨).
 */
export function createGroupChatRoom(
  currentUser: User,
  participantIds: string[],
  groupName?: string,
  description?: string
): ChatRoom {
  const allRooms = loadAllStoredRooms();

  const uniqueParticipants = Array.from(new Set([currentUser.id, ...participantIds]));
  const finalName = (groupName || '').trim() || `✨ Signal Cluster (${uniqueParticipants.length})`;

  const newRoom: ChatRoom = {
    id: `room-grp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    name: finalName,
    isGroup: true,
    participantIds: uniqueParticipants,
    createdBy: currentUser.id,
    description: description?.trim() || undefined,
    lastMessage: `${currentUser.displayName || currentUser.username || 'Explorer'} ignited the cluster "${finalName}".`,
    updatedAt: new Date().toISOString(),
  };

  const initialMessage: ChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    roomId: newRoom.id,
    senderId: currentUser.id,
    senderName: currentUser.displayName || currentUser.username || 'Explorer',
    text: `🪐 Signal Cluster "${finalName}" formed across Asterful.`,
    timestamp: new Date().toISOString(),
  };

  allRooms.unshift(newRoom);
  const allMessages = loadAllStoredMessages();
  allMessages.push(initialMessage);

  try {
    localStorage.setItem(CHAT_ROOMS_KEY, JSON.stringify(allRooms));
    localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(allMessages));
    markRoomAsRead(newRoom.id, currentUser.id);
    dispatchChatUpdate();
  } catch {
    // ignore
  }

  return newRoom;
}

/**
 * Adds new Explorers to an existing Signal Cluster.
 */
export function addParticipantsToGroup(
  roomId: string,
  newParticipantIds: string[],
  currentUser: User
): boolean {
  if (!roomId || !newParticipantIds.length || !currentUser?.id) return false;

  const allRooms = loadAllStoredRooms();
  const roomIndex = allRooms.findIndex((r) => r.id === roomId);
  if (roomIndex === -1) return false;

  const room = allRooms[roomIndex];
  if (!room.isGroup || !room.participantIds.includes(currentUser.id)) return false;

  const existingSet = new Set(room.participantIds);
  const addedIds: string[] = [];

  newParticipantIds.forEach((id) => {
    if (!existingSet.has(id)) {
      room.participantIds.push(id);
      addedIds.push(id);
    }
  });

  if (addedIds.length === 0) return true;

  const addedUsers = resolveParticipants(addedIds);
  const addedNames = addedUsers.map((u) => u.displayName || u.username).join(', ');

  const noticeMsg: ChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    roomId: room.id,
    senderId: 'system',
    senderName: 'Asterful Orbit',
    text: `✨ ${currentUser.displayName || currentUser.username} linked ${addedNames} into this Signal Cluster.`,
    timestamp: new Date().toISOString(),
  };

  const allMessages = loadAllStoredMessages();
  allMessages.push(noticeMsg);
  room.lastMessage = noticeMsg.text;
  room.updatedAt = new Date().toISOString();
  allRooms[roomIndex] = room;

  try {
    localStorage.setItem(CHAT_ROOMS_KEY, JSON.stringify(allRooms));
    localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(allMessages));
    dispatchChatUpdate();
    return true;
  } catch {
    return false;
  }
}

/**
 * Removes a participant from a group (by group creator or self).
 */
export function removeParticipantFromGroup(
  roomId: string,
  targetUserId: string,
  currentUser: User
): boolean {
  if (!roomId || !targetUserId || !currentUser?.id) return false;

  const allRooms = loadAllStoredRooms();
  const roomIndex = allRooms.findIndex((r) => r.id === roomId);
  if (roomIndex === -1) return false;

  const room = allRooms[roomIndex];
  if (!room.isGroup || !room.participantIds.includes(targetUserId)) return false;

  // Only the creator or the user themselves can remove
  const isCreator = room.createdBy === currentUser.id;
  const isSelf = targetUserId === currentUser.id;
  if (!isCreator && !isSelf) return false;

  room.participantIds = room.participantIds.filter((id) => id !== targetUserId);

  const targetUsers = resolveParticipants([targetUserId]);
  const targetName = targetUsers[0]?.displayName || targetUsers[0]?.username || 'An Explorer';

  const noticeMsg: ChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    roomId: room.id,
    senderId: 'system',
    senderName: 'Asterful Orbit',
    text: isSelf 
      ? `🪐 ${targetName} left the Signal Cluster.` 
      : `🛡️ ${targetName} was disconnected from this Signal Cluster by ${currentUser.displayName || currentUser.username}.`,
    timestamp: new Date().toISOString(),
  };

  const allMessages = loadAllStoredMessages();
  allMessages.push(noticeMsg);
  room.lastMessage = noticeMsg.text;
  room.updatedAt = new Date().toISOString();
  allRooms[roomIndex] = room;

  try {
    localStorage.setItem(CHAT_ROOMS_KEY, JSON.stringify(allRooms));
    localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(allMessages));
    dispatchChatUpdate();
    return true;
  } catch {
    return false;
  }
}

/**
 * Updates group name and description.
 */
export function updateGroupDetails(
  roomId: string,
  name: string,
  description?: string
): boolean {
  if (!roomId || !name.trim()) return false;

  const allRooms = loadAllStoredRooms();
  const roomIndex = allRooms.findIndex((r) => r.id === roomId);
  if (roomIndex === -1) return false;

  allRooms[roomIndex].name = name.trim();
  if (description !== undefined) {
    allRooms[roomIndex].description = description.trim() || undefined;
  }
  allRooms[roomIndex].updatedAt = new Date().toISOString();

  try {
    localStorage.setItem(CHAT_ROOMS_KEY, JSON.stringify(allRooms));
    dispatchChatUpdate();
    return true;
  } catch {
    return false;
  }
}

/**
 * Marks a room as read for a given user.
 */
export function markRoomAsRead(roomId: string, userId: string): void {
  if (!roomId || !userId) return;
  try {
    const raw = localStorage.getItem(CHAT_READ_TIMESTAMPS_KEY);
    const readMap: Record<string, string> = raw ? JSON.parse(raw) : {};
    readMap[`${roomId}:${userId}`] = new Date().toISOString();
    localStorage.setItem(CHAT_READ_TIMESTAMPS_KEY, JSON.stringify(readMap));
    dispatchChatUpdate();
  } catch {
    // ignore
  }
}

/**
 * Calculates unread messages count for a specific room and user.
 */
export function getUnreadCountForRoom(roomId: string, userId: string): number {
  if (!roomId || !userId) return 0;
  const allMessages = loadAllStoredMessages();
  let readMap: Record<string, string> = {};
  try {
    const raw = localStorage.getItem(CHAT_READ_TIMESTAMPS_KEY);
    if (raw) readMap = JSON.parse(raw);
  } catch {
    // ignore
  }

  const lastReadIso = readMap[`${roomId}:${userId}`];
  const roomMessages = allMessages.filter((m) => m.roomId === roomId);

  if (!lastReadIso) {
    return roomMessages.filter((m) => m.senderId !== userId).length;
  }

  const lastReadTime = new Date(lastReadIso).getTime();
  return roomMessages.filter(
    (m) => m.senderId !== userId && new Date(m.timestamp).getTime() > lastReadTime
  ).length;
}

/**
 * Calculates total unread messages count for a user across all accessible rooms.
 */
export function getUnreadMessagesCount(userId: string): number {
  if (!userId) return 0;
  const userRooms = getRoomsForUser(userId);
  if (userRooms.length === 0) return 0;

  let totalUnread = 0;
  userRooms.forEach((room) => {
    totalUnread += getUnreadCountForRoom(room.id, userId);
  });

  return totalUnread;
}

/**
 * Helper to resolve participant user objects for a room.
 */
export function resolveParticipants(participantIds: string[]): User[] {
  const allUsers = getAllRegisteredUsers();
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  return participantIds.map((id) => {
    return (
      userMap.get(id) || {
        id,
        displayName: 'Explorer',
        username: 'explorer',
        handle: 'explorer',
        email: `${id}@cosmos.space`,
        avatarUrl: undefined,
        glowColor: '#FFD700',
      }
    );
  });
}

/**
 * Helper to get the display title and avatar for a room from the perspective of currentUser.
 */
export function getRoomDisplayInfo(
  room: ChatRoom,
  currentUserId: string
): { title: string; subtitle: string; avatarUrl?: string; isGroup: boolean; glowColor: string; otherUser?: User } {
  if (room.isGroup) {
    const participants = resolveParticipants(room.participantIds);
    return {
      title: room.name || 'Signal Cluster 📡✨',
      subtitle: `${participants.length} Explorers`,
      avatarUrl: undefined,
      isGroup: true,
      glowColor: '#FFD700',
    };
  }

  // 1-on-1: find the other participant
  const otherId = room.participantIds.find((id) => id !== currentUserId) || room.participantIds[0];
  const participants = resolveParticipants([otherId]);
  const otherUser = participants[0];

  return {
    title: otherUser?.displayName || otherUser?.username || 'Explorer',
    subtitle: `@${(otherUser?.handle || otherUser?.username || 'explorer').replace(/^@/, '')}`,
    avatarUrl: otherUser?.avatarUrl,
    isGroup: false,
    glowColor: otherUser?.glowColor || '#FFD700',
    otherUser,
  };
}

/**
 * Formats timestamps nicely for chat list and messages.
 */
export function formatChatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24 && now.getDate() === date.getDate()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

/**
 * Deletes an individual message from a room.
 */
export function deleteMessage(roomId: string, messageId: string, userId: string): boolean {
  if (!roomId || !messageId || !userId) return false;

  const allMessages = loadAllStoredMessages();
  const targetIndex = allMessages.findIndex((m) => m.id === messageId && m.roomId === roomId);
  if (targetIndex === -1) return false;

  const targetMsg = allMessages[targetIndex];
  if (targetMsg.senderId !== userId) return false;

  allMessages.splice(targetIndex, 1);

  // Update room lastMessage if necessary
  const allRooms = loadAllStoredRooms();
  const roomIndex = allRooms.findIndex((r) => r.id === roomId);
  if (roomIndex !== -1) {
    const remainingForRoom = allMessages
      .filter((m) => m.roomId === roomId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (remainingForRoom.length > 0) {
      const last = remainingForRoom[remainingForRoom.length - 1];
      allRooms[roomIndex].lastMessage = `${last.senderName}: ${last.text}`;
    } else {
      allRooms[roomIndex].lastMessage = 'No messages in thread.';
    }
  }

  try {
    localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(allMessages));
    localStorage.setItem(CHAT_ROOMS_KEY, JSON.stringify(allRooms));
    dispatchChatUpdate();
    return true;
  } catch {
    return false;
  }
}

/**
 * Leaves a group chat room for a user.
 */
export function leaveGroupChat(roomId: string, user: { id: string; displayName?: string; username?: string; name?: string }): boolean {
  if (!roomId || !user?.id) return false;

  const allRooms = loadAllStoredRooms();
  const roomIndex = allRooms.findIndex((r) => r.id === roomId);
  if (roomIndex === -1) return false;

  const room = allRooms[roomIndex];
  if (!room.isGroup) return false;

  if (!room.participantIds.includes(user.id)) return false;

  room.participantIds = room.participantIds.filter((id) => id !== user.id);

  const allMessages = loadAllStoredMessages();

  if (room.participantIds.length === 0) {
    allRooms.splice(roomIndex, 1);
    const filteredMsgs = allMessages.filter((m) => m.roomId !== roomId);
    try {
      localStorage.setItem(CHAT_ROOMS_KEY, JSON.stringify(allRooms));
      localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(filteredMsgs));
      dispatchChatUpdate();
      return true;
    } catch {
      return false;
    }
  } else {
    const departureMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      roomId: room.id,
      senderId: 'system',
      senderName: 'Asterful Orbit',
      text: `${user.displayName || user.username || 'An Explorer'} left the Signal Cluster.`,
      timestamp: new Date().toISOString(),
    };
    allMessages.push(departureMsg);
    room.lastMessage = departureMsg.text;
    room.updatedAt = new Date().toISOString();
    allRooms[roomIndex] = room;

    try {
      localStorage.setItem(CHAT_ROOMS_KEY, JSON.stringify(allRooms));
      localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(allMessages));
      dispatchChatUpdate();
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Check if a room is in Quiet Orbit 🤫 for a specific user.
 */
export function isRoomInQuietOrbit(roomId: string, userId: string): boolean {
  if (!roomId || !userId) return false;
  const room = getRoomById(roomId, userId);
  if (!room || !room.mutedUserIds) return false;
  return room.mutedUserIds.includes(userId);
}

/**
 * Toggles Quiet Orbit 🤫 (mute / restore orbit) for a specific user in a room.
 * Returns true if the room is now muted (in Quiet Orbit), false if unmuted (Restored).
 */
export function toggleRoomQuietOrbit(roomId: string, userId: string): boolean {
  if (!roomId || !userId) return false;

  const allRooms = loadAllStoredRooms();
  const roomIndex = allRooms.findIndex((r) => r.id === roomId);
  if (roomIndex === -1) return false;

  const room = allRooms[roomIndex];
  if (!room.participantIds.includes(userId)) return false;

  const mutedSet = new Set<string>(room.mutedUserIds || []);
  let isNowMuted = false;

  if (mutedSet.has(userId)) {
    mutedSet.delete(userId);
    isNowMuted = false;
  } else {
    mutedSet.add(userId);
    isNowMuted = true;
  }

  room.mutedUserIds = Array.from(mutedSet);
  allRooms[roomIndex] = room;

  try {
    localStorage.setItem(CHAT_ROOMS_KEY, JSON.stringify(allRooms));
    dispatchChatUpdate();
  } catch {
    // ignore
  }

  return isNowMuted;
}

/**
 * Deletes an entire chat room and its associated messages.
 */
export function deleteChatRoom(roomId: string, userId: string): boolean {
  if (!roomId || !userId) return false;

  const allRooms = loadAllStoredRooms();
  const roomIndex = allRooms.findIndex((r) => r.id === roomId);
  if (roomIndex === -1) return false;

  const room = allRooms[roomIndex];
  if (!room.participantIds.includes(userId)) return false;

  allRooms.splice(roomIndex, 1);

  const allMessages = loadAllStoredMessages();
  const filteredMessages = allMessages.filter((m) => m.roomId !== roomId);

  try {
    const raw = localStorage.getItem(CHAT_READ_TIMESTAMPS_KEY);
    if (raw) {
      const readMap: Record<string, string> = JSON.parse(raw);
      Object.keys(readMap).forEach((k) => {
        if (k.startsWith(`${roomId}:`)) {
          delete readMap[k];
        }
      });
      localStorage.setItem(CHAT_READ_TIMESTAMPS_KEY, JSON.stringify(readMap));
    }
  } catch {
    // ignore
  }

  try {
    localStorage.setItem(CHAT_ROOMS_KEY, JSON.stringify(allRooms));
    localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(filteredMessages));
    dispatchChatUpdate();
    return true;
  } catch {
    return false;
  }
}

