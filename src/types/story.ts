export type StoryPrivacy = 'PUBLIC' | 'FRIENDS_ONLY'; // Public = Open Sky 🌌, Friends = Constellation Mates ✨

export interface StarStory {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  mediaUrl: string;
  mediaType: 'image' | 'video'; // Captured Star 📸⭐ or Moving Star ⭐
  caption?: string;
  privacy: StoryPrivacy;
  createdAt: string; // ISO date string
  expiresAt: string; // 24 hours after createdAt
  viewers: string[]; // List of Explorer IDs who viewed (Star Gazes 👀)
}

export interface AuthorStoryGroup {
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorHandle?: string;
  stories: StarStory[];
  hasUnviewed: boolean;
  latestCreatedAt: string;
}
