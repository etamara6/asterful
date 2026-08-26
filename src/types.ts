import { StarCluster } from './types/star';
export * from './types/star';
export * from './types/galaxy';
export * from './types/story';

export interface Universe {
  id: string;
  name: string;
  isPrivate: boolean;
  ownerId: string;
  memberIds: string[];
  glowColor: string;
  description?: string;
  createdAt?: string;
}

export interface ConstellationEdge {
  id: string;
  sourceId: string;
  targetId: string;
  sharedTags: string[];
  isRemix: boolean;
  strength: number; // Number of shared links or weight
}

export interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface AmbientParticle {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  alpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  color: string;
  speedX: number;
  speedY: number;
}

export interface PhotonPulse {
  edgeId: string;
  sourceId: string;
  targetId: string;
  progress: number; // 0 to 1
  speed: number;
  color: string;
}

export interface ClusterTheme {
  name: StarCluster;
  color: string;
  glow: string;
  bgBadge: string;
  borderColor: string;
  description: string;
}

export type ExplorerRole = 'ADMIN' | 'MODERATOR' | 'EXPLORER';

export interface User {
  id: string;
  email: string;
  displayName: string;
  handle: string;
  name?: string;
  username?: string;
  avatarUrl?: string;
  bannerUrl?: string; // Sky Cover 🌌 (Profile Banner / Cover Photo)
  bio?: string;
  quote?: string;
  websiteUrl?: string; // Star Link 🔗 / Portal 🌀
  portalUrl?: string;
  joinedAt?: string;
  glowColor?: string;
  isGuest?: boolean;
  isVerified?: boolean; // Guiding Star 🌟 (Verified Explorer Badge)
  role?: ExplorerRole; // Galaxy Keeper 🛡️ ('ADMIN') | Orbit Keeper 🛡️ ('MODERATOR') | 'EXPLORER'
  followers?: string[];
  following?: string[];
  age?: number;
  isOver18?: boolean;
  password?: string;
  eclipsedUserIds?: string[]; // Eclipsed 🌒 (blocked) user IDs
  isPrivateSky?: boolean; // Private Sky 🔒 mode enabled
  orbitRequests?: string[]; // Pending Orbit Requests (user IDs wanting to Enter Orbit)
  savedStarIds?: string[]; // Stargazed 🔖 (Saved Star IDs)
}

export type ReportReason = 
  | 'Cosmic Noise 📡 (Spam)'
  | 'Harassment & Hostility'
  | 'Inappropriate Celestial Content'
  | 'Cosmic Misinformation'
  | 'Other Cosmic Concern';

export interface StarReport {
  id: string;
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
  timestamp: string;
  status: 'pending' | 'reviewed' | 'resolved';
}

export * from './types/chat';
export * from './types/broadcast';
