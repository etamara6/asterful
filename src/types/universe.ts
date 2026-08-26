import { StarCluster } from '../types';

export interface Universe {
  id: string;
  name: string;
  isPrivate: boolean;
  ownerId: string;
  memberIds: string[];
  glowColor: string; // Thematic Aura Color hex e.g. #FFD700, #FF70A6, #3A86FF
  description?: string;
  createdAt?: string;
}

export type { StarCluster };
