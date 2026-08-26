export interface Galaxy {
  id: string;
  name: string;
  tag: string; // e.g. "#Coding", "#AstroPhotography"
  description: string;
  icon: string; // Emoji e.g. "🔭", "💻", "🧬", "🌌", "🎨"
  category: 'Science & Cosmos' | 'Code & Dev' | 'Art & Creation' | 'Philosophy & Writing' | 'General';
  glowColor: string;
  memberIds: string[]; // List of user IDs who joined
  membersCount?: number;
  creatorId: string;
  createdAt: string;
  rules?: string[];
  bannerUrl?: string;
}
