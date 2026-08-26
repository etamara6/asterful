import { StarStory, AuthorStoryGroup, StoryPrivacy } from '../types/story';

const STORIES_STORAGE_KEY = 'asterful_star_stories_v3';

// Seed initial cosmic stories (empty by default for user-generated stories)
export const SEED_STORIES: StarStory[] = [];
export const MOCK_STORIES: StarStory[] = [];


export const COSMIC_STORY_PRESETS = [
  {
    title: 'Deep Space Nebula 🌫️✨',
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1080&auto=format&fit=crop&q=80',
    type: 'image' as const,
    caption: 'Deep space nebula glowing in vibrant cosmic hues 🌌',
  },
  {
    title: 'Stellar Nursery ⭐',
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1080&auto=format&fit=crop&q=80',
    type: 'image' as const,
    caption: 'Witnessing the birth of new stars in the cluster 🌟',
  },
  {
    title: 'Auroral Orbit 🪐',
    url: 'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=1080&auto=format&fit=crop&q=80',
    type: 'image' as const,
    caption: 'Aurora dance across the planetary horizon 🌠',
  },
  {
    title: 'Quantum Cosmic Horizon 🌌',
    url: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1080&auto=format&fit=crop&q=80',
    type: 'image' as const,
    caption: 'Gazing into the infinite expanse from orbit 🛰️',
  },
  {
    title: 'Stargazer Observatory 🔭',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1080&auto=format&fit=crop&q=80',
    type: 'image' as const,
    caption: 'Midnight sky scanning for supernova signals 📡⭐',
  }
];

/**
 * Loads all stories from storage, filtering out expired ones.
 * Automatically seeds defaults if no stories exist.
 */
export function getAllStories(): StarStory[] {
  try {
    const raw = localStorage.getItem(STORIES_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const stories: StarStory[] = JSON.parse(raw || '[]');
    if (!Array.isArray(stories)) {
      return [];
    }

    const now = new Date().toISOString();
    // Filter out expired stories (>24h)
    const validStories = stories.filter((story) => story.expiresAt > now);

    if (validStories.length !== stories.length) {
      localStorage.setItem(STORIES_STORAGE_KEY, JSON.stringify(validStories));
    }

    return validStories;
  } catch {
    return [];
  }
}

/**
 * Gets stories visible to a specific explorer according to privacy rules:
 * - Public stories (Open Sky 🌌) are visible to all
 * - Friends-only stories (Constellation Mates ✨) are visible if:
 *   - Current user is the author
 *   - Current user follows/is in orbit with the author
 */
export function getVisibleStories(currentUserId?: string, followingIds: string[] = []): StarStory[] {
  const all = getAllStories();
  if (!currentUserId) {
    return all.filter((s) => s.privacy === 'PUBLIC');
  }

  return all.filter((story) => {
    if (story.authorId === currentUserId) return true;
    if (story.privacy === 'PUBLIC') return true;
    if (story.privacy === 'FRIENDS_ONLY') {
      return followingIds.includes(story.authorId);
    }
    return true;
  });
}

/**
 * Groups active stories by author, ordering:
 * 1. Current user (if they have stories)
 * 2. Authors with unviewed stories
 * 3. Authors with all viewed stories
 */
export function groupStoriesByAuthor(
  stories: StarStory[],
  currentUserId?: string
): AuthorStoryGroup[] {
  const authorMap = new Map<string, StarStory[]>();

  // Sort chronologically ascending within each author's collection
  const sortedStories = [...stories].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  for (const story of sortedStories) {
    const list = authorMap.get(story.authorId) || [];
    list.push(story);
    authorMap.set(story.authorId, list);
  }

  const groups: AuthorStoryGroup[] = [];

  authorMap.forEach((authorStories, authorId) => {
    const first = authorStories[0];
    const latest = authorStories[authorStories.length - 1];
    const hasUnviewed = currentUserId
      ? authorStories.some((s) => !s.viewers.includes(currentUserId) && s.authorId !== currentUserId)
      : true;

    groups.push({
      authorId,
      authorName: first.authorName,
      authorAvatar: first.authorAvatar,
      stories: authorStories,
      hasUnviewed,
      latestCreatedAt: latest.createdAt,
    });
  });

  // Sort groups:
  // - Own stories first
  // - Then unviewed stories by newest creation
  // - Then viewed stories by newest creation
  return groups.sort((a, b) => {
    if (currentUserId && a.authorId === currentUserId) return -1;
    if (currentUserId && b.authorId === currentUserId) return 1;

    if (a.hasUnviewed && !b.hasUnviewed) return -1;
    if (!a.hasUnviewed && b.hasUnviewed) return 1;

    return new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime();
  });
}

/**
 * Creates and persists a new Star Story (expires in 24 hours).
 */
export function createStarStory(params: {
  authorId: string;
  authorName: string;
  authorAvatar: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  privacy: StoryPrivacy;
}): StarStory {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const newStory: StarStory = {
    id: `story-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    authorId: params.authorId,
    authorName: params.authorName,
    authorAvatar: params.authorAvatar,
    mediaUrl: params.mediaUrl,
    mediaType: params.mediaType,
    caption: params.caption?.trim(),
    privacy: params.privacy,
    createdAt: now.toISOString(),
    expiresAt,
    viewers: [],
  };

  const stories = getAllStories();
  stories.push(newStory);
  try {
    localStorage.setItem(STORIES_STORAGE_KEY, JSON.stringify(stories));
  } catch {
    // quota fallback
  }

  return newStory;
}

/**
 * Marks a story as viewed by the explorer (Star Gazes 👀).
 */
export function markStoryAsViewed(storyId: string, viewerId: string): StarStory[] {
  if (!viewerId) return getAllStories();

  const stories = getAllStories();
  const updated = stories.map((story) => {
    if (story.id === storyId && !story.viewers.includes(viewerId)) {
      return {
        ...story,
        viewers: [...story.viewers, viewerId],
      };
    }
    return story;
  });

  try {
    localStorage.setItem(STORIES_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // quota fallback
  }

  return updated;
}

/**
 * Deletes a story by ID if authored by the current user (or admin/owner).
 */
export function deleteStarStory(storyId: string, currentUserId?: string): boolean {
  const stories = getAllStories();
  const target = stories.find((s) => s.id === storyId);
  if (!target) return false;

  // Allow author to delete if currentUserId provided
  if (currentUserId && target.authorId !== currentUserId) return false;

  const filtered = stories.filter((s) => s.id !== storyId);
  try {
    localStorage.setItem(STORIES_STORAGE_KEY, JSON.stringify(filtered));
  } catch {
    // quota fallback
  }

  return true;
}
