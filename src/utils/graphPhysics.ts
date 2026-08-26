import { StarNode, ConstellationEdge, User, StarCluster } from '../types';
import { getUserForAuthor, getAllRegisteredUsers } from './userRegistry';

export interface PhysicsNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  cluster: StarCluster;
  universeName?: string;
  authorId: string;
  isFriend: boolean;
  isCurrentUser: boolean;
  isMutualFriendWithUser: boolean;
}

export interface PhysicsEdge {
  id: string;
  sourceId: string;
  targetId: string;
  isFriendLink: boolean;
  isMutualFriendLink: boolean;
  isOurUniverseLink: boolean;
  isRemix: boolean;
  linkDistance: number; // 40px to 60px for friends, 160px to 220px for non-friends
  strength: number;     // 0.8 for friends, 0.2 for non-friends
}

// Cluster regional quadrant centers
export const CLUSTER_ANCHORS: Record<string, { x: number; y: number }> = {
  'Digital Art': { x: -350, y: -200 },
  'Late Night Poetry': { x: 350, y: -180 },
  'Tech Futures': { x: -280, y: 260 },
  'Cosmic Philosophy': { x: 300, y: 250 },
  'Cybernetics': { x: 0, y: 0 },
  'Our Universe': { x: 0, y: -120 },
};

/**
 * Resolves author account ID for any star.
 */
export function getStarAuthorId(star: StarNode): string {
  if (star.authorId) return star.authorId;
  if (star.userId) return star.userId;
  const user = getUserForAuthor(star.author);
  return user.id;
}

/**
 * Determines if a star's author is followed by the current user or is the current user.
 */
export function isStarFriend(star: StarNode, currentUser: User | null): boolean {
  if (!currentUser) return false;
  const authorId = getStarAuthorId(star);
  if (authorId === currentUser.id) return true;
  const following = currentUser.following || [];
  return following.includes(authorId);
}

/**
 * Determines if author is mutually following the current user.
 */
export function isAuthorMutualFriend(
  authorId: string,
  currentUser: User | null,
  allUsersMap: Map<string, User>
): boolean {
  if (!currentUser) return false;
  if (authorId === currentUser.id) return true;
  const currentUserFollowing = currentUser.following || [];
  if (!currentUserFollowing.includes(authorId)) return false;

  const authorUser = allUsersMap.get(authorId);
  if (!authorUser) return false;
  const authorFollowing = authorUser.following || [];
  return authorFollowing.includes(currentUser.id);
}

/**
 * Evaluates whether an edge qualifies as a friend connection.
 */
export function evaluateEdgeFriendship(
  sourceStar: StarNode,
  targetStar: StarNode,
  currentUser: User | null
): { isFriendLink: boolean; linkDistance: number; strength: number } {
  const isFriendA = isStarFriend(sourceStar, currentUser);
  const isFriendB = isStarFriend(targetStar, currentUser);

  // If either or both nodes belong to friends or the user
  const isFriendLink = isFriendA || isFriendB;

  if (isFriendLink) {
    return {
      isFriendLink: true,
      linkDistance: 50, // tight 40px - 60px distance
      strength: 0.8,    // high attraction strength
    };
  }

  return {
    isFriendLink: false,
    linkDistance: 190, // wider 160px - 220px distance
    strength: 0.2,     // lower attraction strength
  };
}

/**
 * Initializes physics nodes from StarNode array with social attributes.
 */
export function initializePhysicsNodes(
  stars: StarNode[],
  currentUser: User | null
): Map<string, PhysicsNode> {
  const allUsers = getAllRegisteredUsers();
  const allUsersMap = new Map<string, User>(allUsers.map((u) => [u.id, u]));
  const nodesMap = new Map<string, PhysicsNode>();

  stars.forEach((star) => {
    const authorId = getStarAuthorId(star);
    const isFriend = isStarFriend(star, currentUser);
    const isCurrentUser = Boolean(currentUser && authorId === currentUser.id);
    const isMutualFriendWithUser = isAuthorMutualFriend(authorId, currentUser, allUsersMap);

    nodesMap.set(star.id, {
      id: star.id,
      x: star.x,
      y: star.y,
      vx: star.vx || 0,
      vy: star.vy || 0,
      radius: star.radius,
      cluster: star.cluster,
      universeName: star.universeName,
      authorId,
      isFriend,
      isCurrentUser,
      isMutualFriendWithUser,
    });
  });

  return nodesMap;
}

/**
 * Step function for the force-directed social graph simulation.
 * Applies:
 * 1. Friend vs Non-Friend Link spring attraction
 * 2. Gravitational Social Hub for friends & "Our Universe"
 * 3. Mutual friend binary gravitational pull
 * 4. Cluster regional anchor guidance
 * 5. Many-body collision avoidance and soft cosmic repulsion
 * 6. Velocity damping
 */
export function stepForceSimulation(
  nodesMap: Map<string, PhysicsNode>,
  edges: ConstellationEdge[],
  currentUser: User | null,
  selectedStarId: string | null,
  alpha = 1.0
): void {
  const nodes = Array.from(nodesMap.values());
  if (nodes.length === 0) return;

  // 1. Calculate Social Hub Centroid (Center of gravity for friends & user)
  let friendSumX = 0;
  let friendSumY = 0;
  let friendCount = 0;

  // Universe cluster centroids
  const universeCentroids = new Map<string, { sumX: number; sumY: number; count: number }>();

  nodes.forEach((node) => {
    if (node.isFriend || node.isCurrentUser) {
      friendSumX += node.x;
      friendSumY += node.y;
      friendCount++;
    }

    if (node.universeName || node.cluster === 'Our Universe') {
      const uKey = node.universeName || 'Our Universe';
      const entry = universeCentroids.get(uKey) || { sumX: 0, sumY: 0, count: 0 };
      entry.sumX += node.x;
      entry.sumY += node.y;
      entry.count++;
      universeCentroids.set(uKey, entry);
    }
  });

  const socialCenter = {
    x: friendCount > 0 ? friendSumX / friendCount : 0,
    y: friendCount > 0 ? friendSumY / friendCount : 0,
  };

  // 2. Apply Gravitational Social & Universe Clustering Forces
  nodes.forEach((node) => {
    // If it's a friend or current user star, apply attraction towards Social Hub
    if (node.isFriend || node.isCurrentUser) {
      const dx = socialCenter.x - node.x;
      const dy = socialCenter.y - node.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      
      // Pull friends inward toward dense hub
      const gravity = 0.045 * alpha;
      node.vx += (dx / dist) * Math.min(dist * gravity, 4.0);
      node.vy += (dy / dist) * Math.min(dist * gravity, 4.0);

      // Mutual friends get extra cohesion
      if (node.isMutualFriendWithUser) {
        node.vx += dx * 0.02 * alpha;
        node.vy += dy * 0.02 * alpha;
      }
    } else {
      // Non-friends float in outer cosmic space - gentle outward cosmic buoyancy
      const dx = node.x - socialCenter.x;
      const dy = node.y - socialCenter.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      if (dist < 180) {
        const push = ((180 - dist) / 180) * 0.8 * alpha;
        node.vx += (dx / dist) * push;
        node.vy += (dy / dist) * push;
      }
    }

    // Shared Universe Gravitational Pull (draws Our Universe & named universes into dense galaxy hubs)
    if (node.universeName || node.cluster === 'Our Universe') {
      const uKey = node.universeName || 'Our Universe';
      const uEntry = universeCentroids.get(uKey);
      if (uEntry && uEntry.count > 1) {
        const uCenterX = uEntry.sumX / uEntry.count;
        const uCenterY = uEntry.sumY / uEntry.count;
        const udx = uCenterX - node.x;
        const udy = uCenterY - node.y;
        const uDist = Math.sqrt(udx * udx + udy * udy) || 1;
        node.vx += (udx / uDist) * Math.min(uDist * 0.05 * alpha, 3.5);
        node.vy += (udy / uDist) * Math.min(uDist * 0.05 * alpha, 3.5);
      }
    }

    // Regional Cluster Anchor Pull
    const anchor = CLUSTER_ANCHORS[node.cluster];
    if (anchor) {
      const cdx = anchor.x - node.x;
      const cdy = anchor.y - node.y;
      // Weaker anchor pull for friends so social closeness takes precedence, stronger for non-friends
      const anchorWeight = node.isFriend ? 0.006 : 0.015;
      node.vx += cdx * anchorWeight * alpha;
      node.vy += cdy * anchorWeight * alpha;
    }
  });

  // 3. Link Spring Forces (Differentiating Friend Links vs Non-Friend Links)
  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    const nodeA = nodesMap.get(edge.sourceId);
    const nodeB = nodesMap.get(edge.targetId);
    if (!nodeA || !nodeB) continue;

    const dx = nodeB.x - nodeA.x;
    const dy = nodeB.y - nodeA.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;

    const isFriendLink = nodeA.isFriend || nodeB.isFriend;

    // Parameters from requirements:
    // Friend connections: linkDistance = 40px - 60px, strength = 0.8
    // Non-friend connections: linkDistance = 160px - 220px, strength = 0.2
    const targetDist = isFriendLink ? 50 : 190;
    const strength = isFriendLink ? 0.8 : 0.2;

    const delta = dist - targetDist;
    const force = delta * strength * 0.06 * alpha;

    const nx = dx / dist;
    const ny = dy / dist;

    // Distribute force to both endpoints
    nodeA.vx += nx * force;
    nodeA.vy += ny * force;
    nodeB.vx -= nx * force;
    nodeB.vy -= ny * force;
  }

  // 4. Many-Body Coulomb Repulsion & Hard Collision Avoidance
  const n = nodes.length;
  for (let i = 0; i < n; i++) {
    const nodeA = nodes[i];
    for (let j = i + 1; j < n; j++) {
      const nodeB = nodes[j];
      const dx = nodeB.x - nodeA.x;
      const dy = nodeB.y - nodeA.y;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq) || 0.01;

      // Minimum non-overlapping separation
      const minDist = nodeA.radius + nodeB.radius + 18;

      if (dist < minDist) {
        // Strong collision pushback
        const overlap = (minDist - dist) * 0.5;
        const nx = dx / dist;
        const ny = dy / dist;
        nodeA.vx -= nx * overlap * 0.4 * alpha;
        nodeA.vy -= ny * overlap * 0.4 * alpha;
        nodeB.vx += nx * overlap * 0.4 * alpha;
        nodeB.vy += ny * overlap * 0.4 * alpha;
      } else {
        // Soft electrostatic repulsion
        const repForce = Math.min(1200 / (distSq + 400), 2.5) * alpha;
        const nx = dx / dist;
        const ny = dy / dist;
        nodeA.vx -= nx * repForce;
        nodeA.vy -= ny * repForce;
        nodeB.vx += nx * repForce;
        nodeB.vy += ny * repForce;
      }
    }
  }

  // 5. Velocity Damping & Position Integration
  const damping = 0.86;
  const maxSpeed = 7.0;

  nodes.forEach((node) => {
    // Dampen velocities
    node.vx *= damping;
    node.vy *= damping;

    // Cap maximum velocity for smooth orbital motion
    const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
    if (speed > maxSpeed) {
      node.vx = (node.vx / speed) * maxSpeed;
      node.vy = (node.vy / speed) * maxSpeed;
    }

    // Stop micro-jitters
    if (Math.abs(node.vx) < 0.005) node.vx = 0;
    if (Math.abs(node.vy) < 0.005) node.vy = 0;

    node.x += node.vx;
    node.y += node.vy;
  });
}
