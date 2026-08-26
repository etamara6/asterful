import { StarNode } from '../types/star';

export function isStarReignitedByUser(star?: StarNode | null, userId?: string | null): boolean {
  if (!star || !userId) return false;
  if (Array.isArray(star.reignitedBy)) {
    return star.reignitedBy.includes(userId);
  }
  return false;
}

export function getStarReigniteCount(star?: StarNode | null): number {
  if (!star) return 0;
  if (typeof star.reigniteCount === 'number') {
    return star.reigniteCount;
  }
  if (Array.isArray(star.reignitedBy)) {
    return star.reignitedBy.length;
  }
  return 0;
}

export function toggleStarReignite(star: StarNode, userId: string): StarNode {
  const currentReignitedBy = Array.isArray(star.reignitedBy) ? [...star.reignitedBy] : [];
  const isAlreadyReignited = currentReignitedBy.includes(userId);

  let updatedReignitedBy: string[];
  let updatedCount: number;

  if (isAlreadyReignited) {
    updatedReignitedBy = currentReignitedBy.filter((id) => id !== userId);
    updatedCount = Math.max(0, (star.reigniteCount || 1) - 1);
  } else {
    updatedReignitedBy = [...currentReignitedBy, userId];
    updatedCount = (star.reigniteCount || 0) + 1;
  }

  return {
    ...star,
    reignitedBy: updatedReignitedBy,
    reigniteCount: updatedCount,
  };
}
