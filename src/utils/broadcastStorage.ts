import { LiveBroadcast, BroadcastComment } from '../types/broadcast';

const BROADCAST_STORAGE_KEY = 'asterful_live_broadcasts_v2';
export const COSMIC_BROADCAST_UPDATED_EVENT = 'asterful_broadcast_updated';

export const SEED_BROADCASTS: LiveBroadcast[] = [];
export const MOCK_BROADCASTS: LiveBroadcast[] = [];

function getRawBroadcasts(): LiveBroadcast[] {
  try {
    const raw = localStorage.getItem(BROADCAST_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch (err) {
    return [];
  }
}

function saveRawBroadcasts(broadcasts: LiveBroadcast[]): void {
  try {
    localStorage.setItem(BROADCAST_STORAGE_KEY, JSON.stringify(broadcasts));
  } catch (err) {
    console.error('Failed to save broadcasts to storage:', err);
  }
}

function dispatchBroadcastEvent(detail?: Record<string, unknown>): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(COSMIC_BROADCAST_UPDATED_EVENT, { detail }));
  }
}

export function getAllBroadcasts(): LiveBroadcast[] {
  return getRawBroadcasts();
}

export function getLiveBroadcasts(): LiveBroadcast[] {
  return getRawBroadcasts().filter((b) => b.isLive);
}

export function getBroadcastById(id: string): LiveBroadcast | null {
  const broadcasts = getRawBroadcasts();
  return broadcasts.find((b) => b.id === id) || null;
}

export function createBroadcast(params: {
  hostId: string;
  hostName: string;
  hostAvatar: string;
  title: string;
  privacy?: 'PUBLIC' | 'FRIENDS_ONLY';
}): LiveBroadcast {
  const broadcasts = getRawBroadcasts();
  const newBroadcast: LiveBroadcast = {
    id: `broadcast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    hostId: params.hostId,
    hostName: params.hostName,
    hostAvatar: params.hostAvatar,
    title: params.title.trim() || 'Live Star Stream 📡✨',
    privacy: params.privacy || 'PUBLIC',
    viewerCount: 1,
    isLive: true,
    startedAt: new Date().toISOString(),
    comments: [
      {
        id: `sys-com-${Date.now()}`,
        senderId: 'system-signal',
        senderName: 'Cosmic Hub 🌌',
        senderAvatar: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=100',
        text: 'Cosmic Broadcast initiated! Transmitting across galaxies. 📡✨',
        createdAt: new Date().toISOString(),
      },
    ],
  };

  const updated = [newBroadcast, ...broadcasts];
  saveRawBroadcasts(updated);
  dispatchBroadcastEvent({ action: 'create', broadcast: newBroadcast });
  return newBroadcast;
}

export function endBroadcast(broadcastId: string): void {
  const broadcasts = getRawBroadcasts();
  const updated = broadcasts.map((b) =>
    b.id === broadcastId ? { ...b, isLive: false } : b
  );
  saveRawBroadcasts(updated);
  dispatchBroadcastEvent({ action: 'end', broadcastId });
}

export function addBroadcastComment(
  broadcastId: string,
  comment: {
    senderId: string;
    senderName: string;
    senderAvatar: string;
    text: string;
  }
): BroadcastComment | null {
  if (!comment.text.trim()) return null;
  const broadcasts = getRawBroadcasts();
  const target = broadcasts.find((b) => b.id === broadcastId);
  if (!target) return null;

  const newComment: BroadcastComment = {
    id: `bc-com-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    senderId: comment.senderId,
    senderName: comment.senderName,
    senderAvatar: comment.senderAvatar,
    text: comment.text.trim(),
    createdAt: new Date().toISOString(),
  };

  const updated = broadcasts.map((b) => {
    if (b.id === broadcastId) {
      return {
        ...b,
        comments: [...b.comments, newComment],
      };
    }
    return b;
  });

  saveRawBroadcasts(updated);
  dispatchBroadcastEvent({ action: 'comment', broadcastId, comment: newComment });
  return newComment;
}

export function adjustViewerCount(broadcastId: string, delta: number): number {
  const broadcasts = getRawBroadcasts();
  let nextCount = 1;
  const updated = broadcasts.map((b) => {
    if (b.id === broadcastId) {
      nextCount = Math.max(1, (b.viewerCount || 1) + delta);
      return { ...b, viewerCount: nextCount };
    }
    return b;
  });
  saveRawBroadcasts(updated);
  dispatchBroadcastEvent({ action: 'viewers', broadcastId, viewerCount: nextCount });
  return nextCount;
}
