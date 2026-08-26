import { StarNode } from '../types';

/**
 * Normalizes a star's likes field to ensure it is always an array of user IDs (string[])
 */
export function normalizeLikes(likes: string[] | number | undefined, starId?: string): string[] {
  if (Array.isArray(likes)) {
    return likes;
  }
  if (typeof likes === 'number' && likes > 0) {
    // Generate synthetic seed IDs for initial stars
    return Array.from({ length: likes }, (_, i) => `seed-${starId || 'star'}-liker-${i + 1}`);
  }
  return [];
}

/**
 * Checks if a specific user has liked a star
 */
export function isStarLikedByUser(star: StarNode | null | undefined, userId?: string | null): boolean {
  if (!star || !userId) return false;
  const likesArr = normalizeLikes(star.likes, star.id);
  return likesArr.includes(userId);
}

/**
 * Returns the total number of likes on a star
 */
export function getStarLikesCount(star: StarNode | null | undefined): number {
  if (!star) return 0;
  const likesArr = normalizeLikes(star.likes, star.id);
  return likesArr.length;
}

/**
 * Pure function to toggle a user's like on a star
 * - If user already liked: removes user ID from star.likes (decrements total count)
 * - If not liked: adds user ID to star.likes (increments total count)
 */
export function toggleStarLike(star: StarNode, userId: string): StarNode {
  const currentLikes = normalizeLikes(star.likes, star.id);
  const alreadyLiked = currentLikes.includes(userId);

  const updatedLikes = alreadyLiked
    ? currentLikes.filter((id) => id !== userId)
    : [...currentLikes, userId];

  return {
    ...star,
    likes: updatedLikes,
  };
}
