import { StarNode, ConstellationEdge, User, StarCluster } from '../types';
import { getUserForAuthor, getAllRegisteredUsers } from './userRegistry';

export interface PhysicsNode {
  id: string;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  renderX: number;
  renderY: number;
  vx: number;
  vy: number;
  radius: number;
  cluster: StarCluster;
  universeName?: string;
  authorId: string;
  isFriend: boolean;
  isCurrentUser: boolean;
  isMutualFriendWithUser: boolean;
  floatPhase: number;
  floatSpeed: number;
  floatRadius: number;
}

export interface PhysicsEdge {
  id: string;
  sourceId: string;
  targetId: string;
  isFriendLink: boolean;
  isMutualFriendLink: boolean;
  isOurUniverseLink: boolean;
  isRemix: boolean;
  linkDistance: number;
  strength: number;
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

// Canvas World Space Limits
export const WORLD_BOUNDS_X = 850;
export const WORLD_BOUNDS_Y = 850;
export const MAX_HOME_DISPLACEMENT = 90; // Maximum allowed distance from resting home anchor

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

  const isFriendLink = isFriendA || isFriendB;

  if (isFriendLink) {
    return {
      isFriendLink: true,
      linkDistance: 50,
      strength: 0.5,
    };
  }

  return {
    isFriendLink: false,
    linkDistance: 160,
    strength: 0.15,
  };
}

/**
 * Generates a pseudo-random hash value from a string ID for consistent phase generation.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Initializes physics nodes from StarNode array with social attributes and resting anchors.
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

    const hash = hashString(star.id);
    const floatPhase = (hash % 1000) / 1000 * Math.PI * 2;
    const floatSpeed = 0.0010 + ((hash >> 3) % 100) / 100 * 0.0008;
    const floatRadius = 3.0 + ((hash >> 5) % 50) / 50 * 2.5;

    nodesMap.set(star.id, {
      id: star.id,
      x: star.x,
      y: star.y,
      baseX: star.x,
      baseY: star.y,
      renderX: star.x,
      renderY: star.y,
      vx: star.vx || 0,
      vy: star.vy || 0,
      radius: star.radius,
      cluster: star.cluster,
      universeName: star.universeName,
      authorId,
      isFriend,
      isCurrentUser,
      isMutualFriendWithUser,
      floatPhase,
      floatSpeed,
      floatRadius,
    });
  });

  return nodesMap;
}

/**
 * Step function for the stable, bounded force-directed social graph simulation.
 * Applies:
 * 1. Hooke's Home Restoring Spring to preserve equilibrium & designated quadrants
 * 2. Gentle friend / mutual friend clustering springs
 * 3. Bounded link attraction forces
 * 4. Localized soft collision avoidance (strictly non-overlapping)
 * 5. Strong velocity damping to stop infinite acceleration
 * 6. Hard canvas bounding box & maximum displacement constraints
 * 7. Harmonic floating breathing calculation
 */
export function stepForceSimulation(
  nodesMap: Map<string, PhysicsNode>,
  edges: ConstellationEdge[],
  currentUser: User | null,
  selectedStarId: string | null,
  alpha = 1.0,
  time = performance.now()
): void {
  const nodes = Array.from(nodesMap.values());
  if (nodes.length === 0) return;

  // 1. Social Hub Centroid Calculation
  let friendSumX = 0;
  let friendSumY = 0;
  let friendCount = 0;

  nodes.forEach((node) => {
    if (node.isFriend || node.isCurrentUser) {
      friendSumX += node.baseX;
      friendSumY += node.baseY;
      friendCount++;
    }
  });

  const socialCenter = {
    x: friendCount > 0 ? friendSumX / friendCount : 0,
    y: friendCount > 0 ? friendSumY / friendCount : 0,
  };

  // 2. Equilibrium Home Spring & Subtle Social Forces
  nodes.forEach((node) => {
    // A. Strong Hooke's Home Restoring Spring: pull node towards its base anchor
    const homeDx = node.baseX - node.x;
    const homeDy = node.baseY - node.y;
    const homeSpringStrength = 0.05 * alpha;
    node.vx += homeDx * homeSpringStrength;
    node.vy += homeDy * homeSpringStrength;

    // B. Subtle Social Pull for Friends (Gentle nudge towards friend hub)
    if (node.isFriend || node.isCurrentUser) {
      const dx = socialCenter.x - node.x;
      const dy = socialCenter.y - node.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist > 60) {
        const pull = Math.min((dist - 60) * 0.004, 0.4) * alpha;
        node.vx += (dx / dist) * pull;
        node.vy += (dy / dist) * pull;
      }
    }
  });

  // 3. Link Spring Forces (Bounded to prevent stretching or explosive forces)
  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    const nodeA = nodesMap.get(edge.sourceId);
    const nodeB = nodesMap.get(edge.targetId);
    if (!nodeA || !nodeB) continue;

    const dx = nodeB.x - nodeA.x;
    const dy = nodeB.y - nodeA.y;
    const dist = Math.hypot(dx, dy) || 0.001;

    const isFriendLink = nodeA.isFriend || nodeB.isFriend;
    const targetDist = isFriendLink ? 55 : 160;
    const strength = isFriendLink ? 0.35 : 0.1;

    const delta = dist - targetDist;
    // Cap spring force to prevent abrupt jumps
    const maxSpringForce = 0.6;
    const force = Math.max(-maxSpringForce, Math.min(maxSpringForce, delta * strength * 0.02 * alpha));

    const nx = dx / dist;
    const ny = dy / dist;

    nodeA.vx += nx * force;
    nodeA.vy += ny * force;
    nodeB.vx -= nx * force;
    nodeB.vy -= ny * force;
  }

  // 4. Localized Soft Collision Avoidance (ONLY for nearby / overlapping nodes)
  const n = nodes.length;
  for (let i = 0; i < n; i++) {
    const nodeA = nodes[i];
    for (let j = i + 1; j < n; j++) {
      const nodeB = nodes[j];
      const dx = nodeB.x - nodeA.x;
      const dy = nodeB.y - nodeA.y;
      const distSq = dx * dx + dy * dy;
      
      const minDist = nodeA.radius + nodeB.radius + 14;
      const minDistSq = minDist * minDist;

      // Only apply force if they are actually colliding or very close
      if (distSq < minDistSq && distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        const overlap = (minDist - dist);
        const push = Math.min(overlap * 0.12, 0.8) * alpha;
        const nx = dx / dist;
        const ny = dy / dist;

        nodeA.vx -= nx * push;
        nodeA.vy -= ny * push;
        nodeB.vx += nx * push;
        nodeB.vy += ny * push;
      }
    }
  }

  // 5. Velocity Damping, Max Speed Cap, & Position Integration
  const damping = 0.80; // High damping ensures rapid stabilization
  const maxSpeed = 2.5;  // Strict speed cap

  nodes.forEach((node) => {
    // Apply friction / damping
    node.vx *= damping;
    node.vy *= damping;

    // Cap velocity
    const speed = Math.hypot(node.vx, node.vy);
    if (speed > maxSpeed) {
      node.vx = (node.vx / speed) * maxSpeed;
      node.vy = (node.vy / speed) * maxSpeed;
    }

    // Stop micro-jitter
    if (Math.abs(node.vx) < 0.001) node.vx = 0;
    if (Math.abs(node.vy) < 0.001) node.vy = 0;

    // Step position
    node.x += node.vx;
    node.y += node.vy;

    // 6. Displacement Constraint: Limit distance from original home anchor
    const dispX = node.x - node.baseX;
    const dispY = node.y - node.baseY;
    const dispDist = Math.hypot(dispX, dispY);
    if (dispDist > MAX_HOME_DISPLACEMENT) {
      node.x = node.baseX + (dispX / dispDist) * MAX_HOME_DISPLACEMENT;
      node.y = node.baseY + (dispY / dispDist) * MAX_HOME_DISPLACEMENT;
      node.vx *= 0.3;
      node.vy *= 0.3;
    }

    // 7. Hard Canvas Bounding Box Constraints
    if (node.x < -WORLD_BOUNDS_X) {
      node.x = -WORLD_BOUNDS_X;
      node.vx = 0;
    } else if (node.x > WORLD_BOUNDS_X) {
      node.x = WORLD_BOUNDS_X;
      node.vx = 0;
    }

    if (node.y < -WORLD_BOUNDS_Y) {
      node.y = -WORLD_BOUNDS_Y;
      node.vy = 0;
    } else if (node.y > WORLD_BOUNDS_Y) {
      node.y = WORLD_BOUNDS_Y;
      node.vy = 0;
    }

    // 8. Gentle Harmonic Floating & Breathing Offset (Zero coordinate mutation)
    const floatOffsetX = Math.sin(time * node.floatSpeed + node.floatPhase) * node.floatRadius;
    const floatOffsetY = Math.cos(time * (node.floatSpeed * 0.8) + node.floatPhase) * (node.floatRadius * 0.8);
    node.renderX = node.x + floatOffsetX;
    node.renderY = node.y + floatOffsetY;
  });
}

