export interface Glowback {
  id: string;
  starId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  timestamp: string;
  glowCount: number;
  isGlowing?: boolean;
  glowers?: string[];
}

export type StarCluster = 
  | 'Digital Art' 
  | 'Late Night Poetry' 
  | 'Tech Futures' 
  | 'Cosmic Philosophy'
  | 'Cybernetics'
  | 'Our Universe'
  | (string & {});

export type StarVisibility = 'public' | 'private';

export interface Author {
  name: string;
  handle: string;
  avatarUrl?: string;
  bannerUrl?: string;
  isVerified?: boolean;
  role?: 'ADMIN' | 'MODERATOR' | 'EXPLORER';
}

export interface UnlitStarDraft {
  id: string;
  userId?: string;
  title: string;
  content: string;
  cluster: StarCluster;
  universeName?: string;
  universes?: string[];
  galaxyId?: string;
  galaxyName?: string;
  tags: string[];
  visibility: StarVisibility;
  allowedUserIds?: string[];
  imageUrl?: string;
  isNsfw?: boolean;
  fontFamily?: string; // Custom font selection e.g. 'bentos', 'flywheel', 'stars', 'daisy', 'earwig', 'glamorous'
  savedAt: string;
}

export interface StarNode {
  id: string;
  userId?: string; // Authenticated account id
  authorId?: string; // Authenticated account id
  title: string;
  author: Author;
  createdAt: string;
  visibility: StarVisibility;
  allowedUserIds?: string[]; // Specific follower/user IDs permitted to view this private star
  cluster: StarCluster;
  universeName?: string; // Custom universe name e.g. Quantum Research, Poetry Club, Personal Journal
  universes?: string[]; // Array of selected universe names/tags for multi-universe tagging
  galaxyId?: string; // Galaxy community topic hub id
  galaxyName?: string; // Galaxy community topic hub name e.g. Coding, AstroPhotography, Bioinformatics
  content: string;
  fontFamily?: string; // Custom font selection e.g. 'bentos', 'flywheel', 'stars', 'daisy', 'earwig', 'glamorous'
  tags: string[];
  glowColor: string; // Hex color e.g. #38bdf8
  x: number; // World coordinates
  y: number; // World coordinates
  vx?: number; // Physics drift velocity
  vy?: number;
  radius: number; // Node visual radius
  parentId?: string; // If this is a remix of another star
  parentTitle?: string;
  remixCount: number;
  likes: string[]; // Array of user IDs who liked this star
  imageUrl?: string;
  isUserCreated?: boolean;
  isNsfw?: boolean; // Adult / Sensitive 18+ content flag
  glowbacks?: Glowback[]; // Comments / Glowbacks on this star
  glowbackCount?: number; // Total count of glowbacks
  isPinned?: boolean; // North Star ⭐ (Pinned post, max 3)
  reigniteCount?: number; // Reignite 🔥⭐ count
  reignitedBy?: string[]; // Array of user IDs who reignited this star
  isReformed?: boolean; // Reform Star ⭐ (Edited post)
  reformedAt?: string; // Timestamp when post was reformed
}

export type Star = StarNode;
