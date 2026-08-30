import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { StarNode, ConstellationEdge, CanvasViewport, AmbientParticle, PhotonPulse, StarCluster, User, Universe } from '../types';
import { CLUSTER_THEMES, hexToRgba, getDefaultUniverseGlow, DEFAULT_UNIVERSE_GLOW } from '../utils/colorPalette';
import { getStoredUniverses } from '../utils/universeRegistry';
import { useTheme } from '../context/ThemeContext';
import {
  PhysicsNode,
  stepForceSimulation,
  isStarFriend,
  getStarAuthorId,
  isAuthorMutualFriend
} from '../utils/graphPhysics';
import { getAllRegisteredUsers } from '../utils/userRegistry';

interface ConstellationCanvasProps {
  stars: StarNode[];
  edges: ConstellationEdge[];
  selectedStarId: string | null;
  activeCluster: StarCluster | 'All';
  searchQuery: string;
  highlightedTag: string | null;
  viewport: CanvasViewport;
  onViewportChange: (viewport: CanvasViewport | ((prev: CanvasViewport) => CanvasViewport)) => void;
  onSelectStar: (star: StarNode | null) => void;
  onDoubleCanvasClick?: (worldPos: { x: number; y: number }) => void;
  showLabels: boolean;
  showLines: boolean;
  currentUser?: User | null;
  universes?: Universe[];
  children?: React.ReactNode;
}

const NUM_PARTICLES = 360;

export const ConstellationCanvas: React.FC<ConstellationCanvasProps> = ({
  stars,
  edges,
  selectedStarId,
  activeCluster,
  searchQuery,
  highlightedTag,
  viewport,
  onViewportChange,
  onSelectStar,
  onDoubleCanvasClick,
  showLabels,
  showLines,
  currentUser,
  children,
}) => {
  const { theme, isDark } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Interaction tracking refs
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  const hoveredStarIdRef = useRef<string | null>(null);
  const mouseScreenPosRef = useRef<{ x: number; y: number } | null>(null);
  const hasDraggedRef = useRef(false);
  const panStartRef = useRef<{ startX: number; startY: number; scrollLeft: number; scrollTop: number }>({
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });
  const panRafIdRef = useRef<number | null>(null);

  // Touch tracking for pinch-zoom
  const touchStartDistRef = useRef<number | null>(null);
  const touchStartCenterRef = useRef<{ x: number; y: number } | null>(null);

  // Ambient particles state
  const particlesRef = useRef<AmbientParticle[]>([]);
  const pulsesRef = useRef<PhotonPulse[]>([]);
  const animationFrameIdRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const physicsNodesRef = useRef<Map<string, PhysicsNode>>(new Map());

  // Initialize and synchronize physics simulation nodes
  useEffect(() => {
    const currentMap = physicsNodesRef.current;
    const allUsers = getAllRegisteredUsers();
    const allUsersMap = new Map<string, User>(allUsers.map((u) => [u.id, u]));
    const nextMap = new Map<string, PhysicsNode>();

    stars.forEach((star) => {
      const existing = currentMap.get(star.id);
      const authorId = getStarAuthorId(star);
      const isFriend = isStarFriend(star, currentUser || null);
      const isCurrentUser = Boolean(currentUser && authorId === currentUser.id);
      const isMutualFriendWithUser = isAuthorMutualFriend(authorId, currentUser || null, allUsersMap);

      if (existing) {
        nextMap.set(star.id, {
          ...existing,
          baseX: star.x,
          baseY: star.y,
          radius: star.radius,
          cluster: star.cluster,
          universeName: star.universeName,
          authorId,
          isFriend,
          isCurrentUser,
          isMutualFriendWithUser,
        });
      } else {
        let hash = 0;
        for (let i = 0; i < star.id.length; i++) {
          hash = (hash << 5) - hash + star.id.charCodeAt(i);
          hash |= 0;
        }
        const absHash = Math.abs(hash);
        const floatPhase = ((absHash % 1000) / 1000) * Math.PI * 2;
        const floatSpeed = 0.0010 + (((absHash >> 3) % 100) / 100) * 0.0008;
        const floatRadius = 3.0 + (((absHash >> 5) % 50) / 50) * 2.5;

        nextMap.set(star.id, {
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
      }
    });

    physicsNodesRef.current = nextMap;
  }, [stars, currentUser]);

  // Initialize particles with theme-reactive palette
  useEffect(() => {
    const darkColors = [
      '#ffffff',
      '#fff8e1', // Champagne starlight
      '#ffe57f', // Pale gold
      '#ffd700', // Warm gold
      '#ffecb3', // Soft amber dust
      '#c7d2fe', // Celestial indigo
      '#93c5fd', // Deep starlight blue
    ];
    const lightColors = [
      '#6366f1', // Celestial Indigo
      '#d97706', // Warm Amber Gold
      '#b45309', // Deep Bronze Topaz
      '#8b5cf6', // Starlight Violet
      '#3b82f6', // Sapphire Blue
      '#f59e0b', // Solar Amber
      '#0284c7', // Sky Cyan
    ];
    const colors = isDark ? darkColors : lightColors;

    const particles: AmbientParticle[] = [];
    for (let i = 0; i < NUM_PARTICLES; i++) {
      particles.push({
        x: (Math.random() - 0.5) * 3600,
        y: (Math.random() - 0.5) * 3600,
        size: 0.6 + Math.random() * 2.2,
        baseAlpha: (isDark ? 0.15 : 0.25) + Math.random() * (isDark ? 0.65 : 0.55),
        alpha: 0.5,
        twinkleSpeed: 0.0012 + Math.random() * 0.0035,
        twinklePhase: Math.random() * Math.PI * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedX: (Math.random() - 0.5) * 0.05,
        speedY: (Math.random() - 0.5) * 0.05,
      });
    }
    particlesRef.current = particles;
  }, [isDark]);

  // Update photon pulses whenever edges change or theme changes
  useEffect(() => {
    const activeEdges = edges.filter(e => e.isRemix || Math.random() > 0.35);
    pulsesRef.current = activeEdges.map((e, idx) => {
      const isSelectedRelated = selectedStarId && (e.sourceId === selectedStarId || e.targetId === selectedStarId);
      const defaultColor = isDark ? (isSelectedRelated ? '#FFD700' : '#FFE57F') : (isSelectedRelated ? '#D97706' : '#F59E0B');
      const remixColor = isDark ? '#FFA726' : '#EA580C';
      return {
        edgeId: e.id,
        sourceId: e.sourceId,
        targetId: e.targetId,
        progress: (idx * 0.23) % 1,
        speed: 0.0025 + (e.isRemix ? 0.0035 : 0.0018),
        color: e.isRemix ? remixColor : defaultColor,
      };
    });
  }, [edges, selectedStarId, isDark]);

  // Coordinate transforms
  const screenToWorld = useCallback((screenX: number, screenY: number, vp: CanvasViewport) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    return {
      x: (screenX - cx - vp.x) / vp.zoom,
      y: (screenY - cy - vp.y) / vp.zoom,
    };
  }, []);

  const worldToScreen = useCallback((worldX: number, worldY: number, vp: CanvasViewport) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    return {
      x: worldX * vp.zoom + cx + vp.x,
      y: worldY * vp.zoom + cy + vp.y,
    };
  }, []);

  // Find star under screen position
  const findStarAtScreenPos = useCallback((screenX: number, screenY: number) => {
    const vp = viewportRef.current;
    const worldPos = screenToWorld(screenX, screenY, vp);
    
    // Effective hit radius accounts for zoom level
    for (let i = stars.length - 1; i >= 0; i--) {
      const star = stars[i];
      const pNode = physicsNodesRef.current.get(star.id);
      const posX = pNode ? pNode.renderX : star.x;
      const posY = pNode ? pNode.renderY : star.y;
      const dx = posX - worldPos.x;
      const dy = posY - worldPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const hitRadius = Math.max(star.radius + 8, 24 / vp.zoom);
      if (dist <= hitRadius) {
        return star;
      }
    }
    return null;
  }, [stars, screenToWorld]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;
    let isIntersecting = true;

    // 60 FPS Frame Rate Capping (1000ms / 60 = 16.66ms)
    const FRAME_MIN_TIME = 1000 / 60;
    let lastRenderTime = performance.now();

    // Cache layout dimensions on resize/init to decouple from animation loop
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let cachedWidth = 2000;
    let cachedHeight = 2000;

    const updateCanvasDimensions = () => {
      if (!canvas) return;
      cachedWidth = canvas.clientWidth || 2000;
      cachedHeight = canvas.clientHeight || 2000;
      const targetW = Math.floor(cachedWidth * dpr);
      const targetH = Math.floor(cachedHeight * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
    };

    updateCanvasDimensions();
    window.addEventListener('resize', updateCanvasDimensions, { passive: true });

    // Cache stored universes outside per-frame loop to prevent storage parsing overhead
    const universeList = getStoredUniverses();

    const render = (now: number) => {
      if (!isRunning || document.hidden || !isIntersecting) {
        animationFrameIdRef.current = 0;
        return;
      }

      // Delta time check to cap to 60 FPS on 120Hz/144Hz displays
      const elapsed = now - lastRenderTime;
      if (elapsed < FRAME_MIN_TIME) {
        animationFrameIdRef.current = requestAnimationFrame(render);
        return;
      }
      lastRenderTime = now - (elapsed % FRAME_MIN_TIME);

      const dt = Math.min(now - lastTimeRef.current, 64);
      lastTimeRef.current = now;

      // 1. Step Force-Directed Graph Simulation & Social Clustering Physics
      stepForceSimulation(
        physicsNodesRef.current,
        edges,
        currentUser || null,
        selectedStarId,
        Math.min(dt / 16, 1.8),
        now
      );

      const width = cachedWidth;
      const height = cachedHeight;

      ctx.save();
      ctx.scale(dpr, dpr);

      // 1. Cosmic Background (#020713 base in dark, #f8fafc base in light)
      ctx.fillStyle = isDark ? '#020713' : '#f8fafc';
      ctx.fillRect(0, 0, width, height);

      // Space radial gradient cosmic indigo & navy ambient washes (Dark) / ethereal lavender & soft amber (Light)
      const cx = width / 2;
      const cy = height / 2;
      const vp = viewportRef.current;

      // Broad celestial viewport background gradient
      const bgGradient1 = ctx.createRadialGradient(
        cx + vp.x * 0.15, cy + vp.y * 0.15, 60,
        cx + vp.x * 0.15, cy + vp.y * 0.15, Math.max(width, height) * 0.9
      );
      if (isDark) {
        bgGradient1.addColorStop(0, 'rgba(14, 42, 74, 0.35)');
        bgGradient1.addColorStop(0.35, 'rgba(10, 26, 58, 0.25)');
        bgGradient1.addColorStop(0.7, 'rgba(4, 14, 32, 0.15)');
        bgGradient1.addColorStop(1, 'rgba(2, 7, 19, 0)');
      } else {
        bgGradient1.addColorStop(0, 'rgba(224, 231, 255, 0.50)');
        bgGradient1.addColorStop(0.35, 'rgba(241, 245, 249, 0.40)');
        bgGradient1.addColorStop(0.7, 'rgba(254, 243, 199, 0.20)');
        bgGradient1.addColorStop(1, 'rgba(248, 250, 252, 0)');
      }
      ctx.fillStyle = bgGradient1;
      ctx.fillRect(0, 0, width, height);

      const bgGradient2 = ctx.createRadialGradient(
        cx + vp.x * 0.25 - 180, cy + vp.y * 0.25 - 120, 80,
        cx + vp.x * 0.25 - 180, cy + vp.y * 0.25 - 120, Math.max(width, height) * 0.65
      );
      if (isDark) {
        bgGradient2.addColorStop(0, 'rgba(21, 58, 102, 0.22)');
        bgGradient2.addColorStop(0.5, 'rgba(10, 26, 58, 0.12)');
        bgGradient2.addColorStop(1, 'rgba(2, 7, 19, 0)');
      } else {
        bgGradient2.addColorStop(0, 'rgba(219, 234, 254, 0.40)');
        bgGradient2.addColorStop(0.5, 'rgba(254, 240, 138, 0.18)');
        bgGradient2.addColorStop(1, 'rgba(248, 250, 252, 0)');
      }
      ctx.fillStyle = bgGradient2;
      ctx.fillRect(0, 0, width, height);

      // Transform coordinate space for celestial world objects
      ctx.save();
      ctx.translate(cx + vp.x, cy + vp.y);
      ctx.scale(vp.zoom, vp.zoom);

      // 1.5 World-Space Cluster Nebula Clouds
      const clusterCenters: Array<{ x: number; y: number; r: number; color1: string; color2: string }> = isDark ? [
        { x: -300, y: -200, r: 420, color1: 'rgba(14, 42, 74, 0.42)', color2: 'rgba(255, 215, 0, 0.035)' }, // Digital Art
        { x: 360, y: -200, r: 380, color1: 'rgba(21, 50, 90, 0.38)', color2: 'rgba(255, 183, 77, 0.04)' },  // Late Night Poetry
        { x: -310, y: 240, r: 400, color1: 'rgba(12, 38, 70, 0.36)', color2: 'rgba(255, 229, 127, 0.03)' }, // Tech Futures
        { x: 360, y: 240, r: 390, color1: 'rgba(16, 44, 80, 0.40)', color2: 'rgba(255, 193, 7, 0.035)' },  // Cosmic Philosophy
        { x: 20, y: -10, r: 340, color1: 'rgba(18, 52, 92, 0.45)', color2: 'rgba(255, 215, 0, 0.045)' },   // Cybernetics Core
      ] : [
        { x: -300, y: -200, r: 420, color1: 'rgba(199, 210, 254, 0.35)', color2: 'rgba(251, 191, 36, 0.05)' },
        { x: 360, y: -200, r: 380, color1: 'rgba(233, 213, 255, 0.30)', color2: 'rgba(245, 158, 11, 0.05)' },
        { x: -310, y: 240, r: 400, color1: 'rgba(186, 230, 253, 0.28)', color2: 'rgba(217, 119, 6, 0.05)' },
        { x: 360, y: 240, r: 390, color1: 'rgba(254, 215, 170, 0.35)', color2: 'rgba(99, 102, 241, 0.05)' },
        { x: 20, y: -10, r: 340, color1: 'rgba(224, 231, 255, 0.38)', color2: 'rgba(245, 158, 11, 0.06)' },
      ];

      for (let i = 0; i < clusterCenters.length; i++) {
        const c = clusterCenters[i];
        const nebGrad = ctx.createRadialGradient(c.x, c.y, 20, c.x, c.y, c.r);
        nebGrad.addColorStop(0, c.color1);
        nebGrad.addColorStop(0.35, c.color2);
        nebGrad.addColorStop(0.7, isDark ? 'rgba(10, 26, 58, 0.18)' : 'rgba(224, 231, 255, 0.10)');
        nebGrad.addColorStop(1, isDark ? 'rgba(2, 7, 19, 0)' : 'rgba(248, 250, 252, 0)');
        ctx.fillStyle = nebGrad;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Render Ambient Particles (twinkling star dust in soft white & warm gold)
      const particles = particlesRef.current;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.speedX;
        p.y += p.speedY;
        p.twinklePhase += p.twinkleSpeed * dt;
        const currentAlpha = p.baseAlpha + Math.sin(p.twinklePhase) * 0.32;
        const clampedAlpha = Math.max(0.06, Math.min(0.95, currentAlpha));

        ctx.fillStyle = p.color;
        ctx.globalAlpha = clampedAlpha;
        ctx.beginPath();
        const pRadius = p.size / Math.max(0.7, vp.zoom * 0.5);
        ctx.arc(p.x, p.y, pRadius, 0, Math.PI * 2);
        ctx.fill();

        // Subtle miniature 4-point glint on select bright stardust particles
        if (p.size > 2.0 && clampedAlpha > 0.6) {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 0.5 / Math.max(0.7, vp.zoom);
          const flareLen = pRadius * 2.2;
          ctx.beginPath();
          ctx.moveTo(p.x - flareLen, p.y);
          ctx.lineTo(p.x + flareLen, p.y);
          ctx.moveTo(p.x, p.y - flareLen);
          ctx.lineTo(p.x, p.y + flareLen);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1.0;

      // Determine matching and active elements for highlighting
      const starMap = new Map<string, StarNode>();
      stars.forEach(s => starMap.set(s.id, s));

      const getNodePos = (star: StarNode) => {
        const pNode = physicsNodesRef.current.get(star.id);
        return {
          x: pNode ? pNode.renderX : star.x,
          y: pNode ? pNode.renderY : star.y,
        };
      };

      const isSearchActive = searchQuery.trim().length > 0;
      const lowerQuery = searchQuery.toLowerCase().trim();

      const isMatching = (star: StarNode) => {
        if (activeCluster !== 'All') {
          const target = activeCluster.toLowerCase();
          if (activeCluster === 'Our Universe') {
            const inUniverses = Boolean(
              (star.universes && star.universes.some((u) => u && u.toLowerCase() === target)) ||
              (star.cluster && star.cluster.toLowerCase() === target) ||
              (star.universeName && star.universeName.toLowerCase() === target) ||
              star.visibility === 'private'
            );
            if (!inUniverses) {
              return false;
            }
          } else {
            const matchesCluster = star.cluster && star.cluster.toLowerCase() === target;
            const matchesUniverse =
              Boolean(star.universeName) &&
              star.universeName!.toLowerCase() === target;
            const matchesUniversesArray = Boolean(
              star.universes && star.universes.some((u) => u && u.toLowerCase() === target)
            );
            if (!matchesCluster && !matchesUniverse && !matchesUniversesArray) {
              return false;
            }
          }
        }
        if (highlightedTag && !star.tags.some(t => t.toLowerCase() === highlightedTag.toLowerCase())) return false;
        if (isSearchActive) {
          const matchTitle = star.title.toLowerCase().includes(lowerQuery);
          const matchAuthor = star.author.name.toLowerCase().includes(lowerQuery) || star.author.handle.toLowerCase().includes(lowerQuery);
          const matchContent = star.content.toLowerCase().includes(lowerQuery);
          const matchTag = star.tags.some(t => t.toLowerCase().includes(lowerQuery));
          const matchUniverse = Boolean(
            (star.universeName && star.universeName.toLowerCase().includes(lowerQuery)) ||
            (star.universes && star.universes.some((u) => u && u.toLowerCase().includes(lowerQuery)))
          );
          return matchTitle || matchAuthor || matchContent || matchTag || matchUniverse;
        }
        return true;
      };

      const selectedStar = selectedStarId ? starMap.get(selectedStarId) : null;
      const connectedStarIds = new Set<string>();
      if (selectedStarId) {
        connectedStarIds.add(selectedStarId);
        edges.forEach(e => {
          if (e.sourceId === selectedStarId) connectedStarIds.add(e.targetId);
          if (e.targetId === selectedStarId) connectedStarIds.add(e.sourceId);
        });
      }

      // 3. Render Constellation Edges (Visual Distinction: Friend Links vs Non-Friend Links)
      if (showLines) {
        for (let i = 0; i < edges.length; i++) {
          const edge = edges[i];
          const starA = starMap.get(edge.sourceId);
          const starB = starMap.get(edge.targetId);
          if (!starA || !starB) continue;

          const posA = getNodePos(starA);
          const posB = getNodePos(starB);

          const isConnectedToSelected = selectedStarId && (edge.sourceId === selectedStarId || edge.targetId === selectedStarId);

          // Calculate friendship status for edge endpoints
          const isFriendA = isStarFriend(starA, currentUser || null);
          const isFriendB = isStarFriend(starB, currentUser || null);
          const isFriendLink = isFriendA || isFriendB;

          // Friend links: Bright, glowing gold beam, thicker stroke width (2px), higher opacity
          // Non-friend links: Faint, thin (0.5px), semi-transparent line (opacity: 0.2)
          let strokeColor = isDark ? 'rgba(255, 223, 128, 0.35)' : 'rgba(180, 83, 9, 0.30)';
          let lineWidth = 0.5;
          let alpha = 0.2;
          let hasGlow = false;

          const friendColor = isDark ? '#FFD700' : '#D97706';
          const remixColor = isDark ? '#FFA726' : '#EA580C';

          if (isFriendLink) {
            lineWidth = 2.0;
            strokeColor = edge.isRemix ? remixColor : friendColor;
            alpha = 0.90;
            hasGlow = true;
          } else if (edge.isRemix) {
            lineWidth = 1.0;
            strokeColor = isDark ? 'rgba(255, 183, 77, 0.5)' : 'rgba(234, 88, 12, 0.45)';
            alpha = 0.35;
          } else if (edge.strength > 1) {
            lineWidth = 0.7;
            strokeColor = isDark ? 'rgba(255, 215, 0, 0.35)' : 'rgba(217, 119, 6, 0.35)';
            alpha = 0.25;
          }

          if (selectedStarId) {
            if (isConnectedToSelected) {
              lineWidth = isFriendLink ? (edge.isRemix ? 2.8 : 2.2) : (edge.isRemix ? 1.8 : 1.2);
              strokeColor = edge.isRemix ? remixColor : friendColor;
              alpha = 0.95;
              hasGlow = true;
            } else {
              alpha = isFriendLink ? 0.22 : 0.05;
              lineWidth = isFriendLink ? 0.9 : 0.4;
            }
          } else if (activeCluster !== 'All' || isSearchActive || highlightedTag) {
            const matchA = isMatching(starA);
            const matchB = isMatching(starB);
            if (matchA && matchB) {
              alpha = isFriendLink ? 0.92 : 0.4;
              lineWidth = isFriendLink ? 2.0 : 0.8;
              strokeColor = isDark ? '#FFE57F' : '#D97706';
              if (isFriendLink) hasGlow = true;
            } else {
              alpha = isFriendLink ? 0.15 : 0.04;
            }
          }

          ctx.save();
          ctx.globalAlpha = alpha;
          if (hasGlow) {
            ctx.shadowColor = isDark ? '#FFD700' : '#F59E0B';
            ctx.shadowBlur = 8;
          }
          ctx.beginPath();
          ctx.moveTo(posA.x, posA.y);

          // If it's a remix connection, draw with a subtle arched curvature
          if (edge.isRemix) {
            const midX = (posA.x + posB.x) / 2 + (posB.y - posA.y) * 0.12;
            const midY = (posA.y + posB.y) / 2 - (posA.x - posB.x) * 0.12;
            ctx.quadraticCurveTo(midX, midY, posB.x, posB.y);
          } else {
            ctx.lineTo(posB.x, posB.y);
          }

          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = lineWidth / Math.max(0.5, vp.zoom);
          
          if (edge.isRemix && isConnectedToSelected) {
            ctx.setLineDash([6, 4]);
            ctx.lineDashOffset = -now * 0.015;
          }

          ctx.stroke();
          ctx.restore();
        }

        // 4. Render Photon Pulses (Energy particles moving along golden edges)
        const pulses = pulsesRef.current;
        for (let i = 0; i < pulses.length; i++) {
          const pulse = pulses[i];
          pulse.progress += pulse.speed * (dt / 16);
          if (pulse.progress > 1) pulse.progress = 0;

          const starA = starMap.get(pulse.sourceId);
          const starB = starMap.get(pulse.targetId);
          if (!starA || !starB) continue;

          const posA = getNodePos(starA);
          const posB = getNodePos(starB);

          const isSelectedRelated = selectedStarId && (pulse.sourceId === selectedStarId || pulse.targetId === selectedStarId);
          if (selectedStarId && !isSelectedRelated) continue;

          const isFriendEdge = isStarFriend(starA, currentUser || null) || isStarFriend(starB, currentUser || null);

          // Linear interpolation for pulse coordinates
          const px = posA.x + (posB.x - posA.x) * pulse.progress;
          const py = posA.y + (posB.y - posA.y) * pulse.progress;

          ctx.save();
          const pulseAlpha = isSelectedRelated ? 0.95 : (isFriendEdge ? 0.85 : 0.35);
          const activePulseColor = isFriendEdge ? (isDark ? '#FFD700' : '#D97706') : pulse.color;
          ctx.globalAlpha = pulseAlpha;
          ctx.fillStyle = activePulseColor;
          ctx.shadowColor = activePulseColor;
          ctx.shadowBlur = isFriendEdge ? 12 : 6;
          ctx.beginPath();
          const pulseSize = isFriendEdge ? 3.0 : 1.8;
          ctx.arc(px, py, pulseSize / Math.max(0.6, vp.zoom), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // 5. Render Celestial Star Nodes
      const hoveredId = hoveredStarIdRef.current;

      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        const pos = getNodePos(star);
        const isSelected = star.id === selectedStarId;
        const isHovered = star.id === hoveredId;
        const isConnected = connectedStarIds.has(star.id);
        const matchesFilter = isMatching(star);
        const isFriend = isStarFriend(star, currentUser || null);
        const isMyStar = Boolean(
          currentUser && (
            (star.authorId && star.authorId === currentUser.id) ||
            (star.userId && star.userId === currentUser.id) ||
            (star.author?.handle && star.author.handle.toLowerCase().replace(/^@/, '') === currentUser.handle.toLowerCase().replace(/^@/, ''))
          )
        );

        let nodeAlpha = 1.0;
        if (selectedStarId) {
          nodeAlpha = isSelected ? 1.0 : (isConnected ? 0.92 : 0.25);
        } else if (activeCluster !== 'All' || isSearchActive || highlightedTag) {
          nodeAlpha = matchesFilter ? 1.0 : 0.22;
        }

        // Determine star universes
        const starUniverses = (star.universes && star.universes.length > 0)
          ? star.universes
          : (star.universeName ? [star.universeName] : (star.cluster ? [star.cluster] : []));

        // Exact User Specification:
        // - If star belongs to exactly ONE universe (star.universes.length === 1), retrieve that universe's specific glowColor
        // - If star belongs to MULTIPLE universes (star.universes.length > 1), automatically fallback to the neutral warm gold glow (#FFC300)
        const activeUniv = starUniverses.length === 1
          ? universeList.find((u) => u.name.toLowerCase().trim() === starUniverses[0]?.toLowerCase().trim())
          : null;

        const resolvedUniverseGlow = starUniverses.length === 1
          ? (activeUniv?.glowColor || getDefaultUniverseGlow(starUniverses[0]))
          : DEFAULT_UNIVERSE_GLOW;

        const clusterTheme = CLUSTER_THEMES[star.cluster] || CLUSTER_THEMES['Digital Art'];
        const glowColor = isMyStar
          ? (isDark ? '#38BDF8' : '#0284C7')
          : (isFriend
              ? (isDark ? '#FFD700' : '#D97706')
              : (starUniverses.length === 1
                  ? (activeUniv?.glowColor || star.glowColor || resolvedUniverseGlow || clusterTheme.color || '#FFC300')
                  : '#FFC300'));

        const pulseFactor = Math.sin(now * 0.0025 + pos.x * 0.01) * 0.12 + 1;
        const baseRadius = star.radius;
        const currentRadius = baseRadius * (isHovered ? 1.25 : (isSelected ? 1.2 : pulseFactor));

        ctx.save();
        ctx.globalAlpha = nodeAlpha;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 14;

        // Multi-Layered Soft Golden / Cyan Radial Halo Glows
        const glowRadius = currentRadius * (isSelected ? 3.8 : (isHovered ? 3.0 : (isMyStar ? 3.2 : (isFriend ? 2.8 : 2.2))));
        const glowGrad = ctx.createRadialGradient(
          pos.x, pos.y, currentRadius * 0.15,
          pos.x, pos.y, glowRadius
        );
        if (isDark) {
          if (isMyStar) {
            glowGrad.addColorStop(0, 'rgba(56, 189, 248, 0.65)');
            glowGrad.addColorStop(0.35, 'rgba(14, 165, 233, 0.35)');
            glowGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.12)');
            glowGrad.addColorStop(1, 'rgba(2, 7, 19, 0)');
          } else {
            glowGrad.addColorStop(0, isFriend ? 'rgba(255, 215, 0, 0.55)' : 'rgba(255, 215, 0, 0.35)');
            glowGrad.addColorStop(0.35, hexToRgba(glowColor, isSelected ? 0.45 : (isHovered ? 0.35 : (isFriend ? 0.28 : 0.18))));
            glowGrad.addColorStop(0.7, isFriend ? 'rgba(255, 229, 127, 0.12)' : 'rgba(255, 229, 127, 0.05)');
            glowGrad.addColorStop(1, 'rgba(2, 7, 19, 0)');
          }
        } else {
          if (isMyStar) {
            glowGrad.addColorStop(0, 'rgba(2, 132, 199, 0.55)');
            glowGrad.addColorStop(0.35, 'rgba(14, 165, 233, 0.30)');
            glowGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.10)');
            glowGrad.addColorStop(1, 'rgba(244, 245, 250, 0)');
          } else {
            glowGrad.addColorStop(0, isFriend ? 'rgba(217, 119, 6, 0.45)' : 'rgba(217, 119, 6, 0.28)');
            glowGrad.addColorStop(0.35, hexToRgba(glowColor, isSelected ? 0.35 : (isHovered ? 0.28 : (isFriend ? 0.22 : 0.15))));
            glowGrad.addColorStop(0.7, isFriend ? 'rgba(245, 158, 11, 0.10)' : 'rgba(245, 158, 11, 0.04)');
            glowGrad.addColorStop(1, 'rgba(244, 245, 250, 0)');
          }
        }

        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Distinctive Author Orbital Ring for User-Authored Stars
        if (isMyStar) {
          ctx.save();
          ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.75)' : 'rgba(2, 132, 199, 0.8)';
          ctx.lineWidth = 1.2 / Math.max(0.5, vp.zoom);
          ctx.setLineDash([2 / Math.max(0.5, vp.zoom), 2 / Math.max(0.5, vp.zoom)]);
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, currentRadius * 1.75, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // 4-Point Celestial Starburst Diffraction Spikes
        const isBrightStar = baseRadius >= 9.5 || isSelected || isHovered || star.remixCount >= 2 || isFriend || isMyStar;
        if (isBrightStar) {
          const flareLength = currentRadius * (isSelected ? 4.2 : (isHovered ? 3.5 : (isMyStar ? 3.6 : (isFriend ? 3.2 : 2.8))));
          const flareWidth = (isSelected ? 2.0 : (isMyStar ? 1.6 : (isFriend ? 1.5 : 1.2))) / Math.max(0.5, vp.zoom);

          ctx.save();
          // Horizontal & Vertical Primary Rays
          const flareGradH = ctx.createLinearGradient(pos.x - flareLength, pos.y, pos.x + flareLength, pos.y);
          if (isDark) {
            flareGradH.addColorStop(0, 'rgba(255, 223, 128, 0)');
            flareGradH.addColorStop(0.5, isSelected ? '#ffffff' : (isMyStar ? '#BAE6FD' : 'rgba(255, 248, 225, 0.9)'));
            flareGradH.addColorStop(1, 'rgba(255, 223, 128, 0)');
          } else {
            flareGradH.addColorStop(0, 'rgba(217, 119, 6, 0)');
            flareGradH.addColorStop(0.5, isSelected ? '#ffffff' : (isMyStar ? '#0284C7' : 'rgba(217, 119, 6, 0.85)'));
            flareGradH.addColorStop(1, 'rgba(217, 119, 6, 0)');
          }

          ctx.strokeStyle = flareGradH;
          ctx.lineWidth = flareWidth;
          ctx.beginPath();
          ctx.moveTo(pos.x - flareLength, pos.y);
          ctx.lineTo(pos.x + flareLength, pos.y);
          ctx.stroke();

          const flareGradV = ctx.createLinearGradient(pos.x, pos.y - flareLength, pos.x, pos.y + flareLength);
          if (isDark) {
            flareGradV.addColorStop(0, 'rgba(255, 223, 128, 0)');
            flareGradV.addColorStop(0.5, isSelected ? '#ffffff' : (isMyStar ? '#BAE6FD' : 'rgba(255, 248, 225, 0.9)'));
            flareGradV.addColorStop(1, 'rgba(255, 223, 128, 0)');
          } else {
            flareGradV.addColorStop(0, 'rgba(217, 119, 6, 0)');
            flareGradV.addColorStop(0.5, isSelected ? '#ffffff' : (isMyStar ? '#0284C7' : 'rgba(217, 119, 6, 0.85)'));
            flareGradV.addColorStop(1, 'rgba(217, 119, 6, 0)');
          }

          ctx.strokeStyle = flareGradV;
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y - flareLength);
          ctx.lineTo(pos.x, pos.y + flareLength);
          ctx.stroke();

          // Soft diagonal secondary flares for selected/extra bright/friend stars
          if (isSelected || isHovered || isMyStar || baseRadius >= 11 || (isFriend && baseRadius >= 8)) {
            const diagLen = flareLength * 0.55;
            ctx.strokeStyle = isDark 
              ? (isMyStar ? 'rgba(56, 189, 248, 0.4)' : 'rgba(255, 223, 128, 0.35)') 
              : (isMyStar ? 'rgba(2, 132, 199, 0.4)' : 'rgba(217, 119, 6, 0.35)');
            ctx.lineWidth = flareWidth * 0.7;
            ctx.beginPath();
            ctx.moveTo(pos.x - diagLen * 0.7, pos.y - diagLen * 0.7);
            ctx.lineTo(pos.x + diagLen * 0.7, pos.y + diagLen * 0.7);
            ctx.moveTo(pos.x - diagLen * 0.7, pos.y + diagLen * 0.7);
            ctx.lineTo(pos.x + diagLen * 0.7, pos.y - diagLen * 0.7);
            ctx.stroke();
          }
          ctx.restore();
        }

        // Pulsing Orbital Ring for Selected or Hovered Star
        if (isSelected || isHovered) {
          ctx.strokeStyle = isDark
            ? (isSelected ? 'rgba(255, 215, 0, 0.85)' : 'rgba(255, 229, 127, 0.55)')
            : (isSelected ? 'rgba(217, 119, 6, 0.85)' : 'rgba(245, 158, 11, 0.55)');
          ctx.lineWidth = (isSelected ? 1.8 : 1.2) / Math.max(0.5, vp.zoom);
          ctx.beginPath();
          const ringRadius = currentRadius * (isSelected ? 1.8 + Math.sin(now * 0.004) * 0.2 : 1.5);
          ctx.arc(pos.x, pos.y, ringRadius, 0, Math.PI * 2);
          ctx.stroke();

          // Orbital crosshair ticks for selected star
          if (isSelected) {
            const tickLength = 5 / Math.max(0.5, vp.zoom);
            const rot = now * 0.001;
            for (let a = 0; a < 4; a++) {
              const angle = rot + (a * Math.PI) / 2;
              const tx1 = pos.x + Math.cos(angle) * (ringRadius + 2);
              const ty1 = pos.y + Math.sin(angle) * (ringRadius + 2);
              const tx2 = pos.x + Math.cos(angle) * (ringRadius + 2 + tickLength);
              const ty2 = pos.y + Math.sin(angle) * (ringRadius + 2 + tickLength);
              ctx.beginPath();
              ctx.moveTo(tx1, ty1);
              ctx.lineTo(tx2, ty2);
              ctx.stroke();
            }
          }
        }

        // Inner Core Star Body
        ctx.fillStyle = isDark
          ? (isSelected ? '#FFF8E1' : (star.glowColor || '#FFD700'))
          : (isSelected ? '#FFFBEB' : (star.glowColor || '#D97706'));
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, currentRadius, 0, Math.PI * 2);
        ctx.fill();

        // White-hot center spark
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, currentRadius * 0.45, 0, Math.PI * 2);
        ctx.fill();

        // Remix Indicator Badge (small cosmic halo if it's a remix parent or child)
        if (star.remixCount > 0 || star.parentId) {
          ctx.fillStyle = star.parentId ? (isDark ? '#FFA726' : '#EA580C') : (isDark ? '#FFD700' : '#D97706');
          ctx.beginPath();
          const badgeX = pos.x + currentRadius * 0.8;
          const badgeY = pos.y - currentRadius * 0.8;
          ctx.arc(badgeX, badgeY, 2.5 / Math.max(0.6, vp.zoom), 0, Math.PI * 2);
          ctx.fill();
        }

        // 18+ Sensitive Content Indicator Ring / Badge
        if (star.isNsfw) {
          ctx.save();
          ctx.strokeStyle = 'rgba(244, 63, 94, 0.7)';
          ctx.lineWidth = 1.4 / Math.max(0.5, vp.zoom);
          ctx.setLineDash([3 / Math.max(0.5, vp.zoom), 2 / Math.max(0.5, vp.zoom)]);
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, currentRadius * 1.55, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // 6. Typography Star Labels
        if (showLabels || isSelected || isHovered || (matchesFilter && isSearchActive)) {
          ctx.font = `${Math.max(11, 12 / Math.max(0.6, vp.zoom))}px system-ui, -apple-system, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';

          const labelY = pos.y + currentRadius + (6 / Math.max(0.5, vp.zoom));
          const rawTitle = isMyStar ? `✦ ${star.title}` : star.title;
          const title = star.isNsfw
            ? `🔞 ${rawTitle.length > 20 ? rawTitle.substring(0, 18) + '…' : rawTitle}`
            : (rawTitle.length > 24 ? rawTitle.substring(0, 22) + '…' : rawTitle);

          // Pill Background with deep indigo & golden/rose/cyan border
          const textMetrics = ctx.measureText(title);
          const bgPaddingH = 6 / Math.max(0.5, vp.zoom);
          const bgHeight = 16 / Math.max(0.5, vp.zoom);
          const bgY = labelY - 2;

          if (isDark) {
            ctx.fillStyle = isSelected 
              ? (star.isNsfw ? 'rgba(24, 6, 12, 0.94)' : (isMyStar ? 'rgba(8, 28, 48, 0.94)' : 'rgba(6, 14, 32, 0.92)'))
              : (star.isNsfw ? 'rgba(20, 4, 10, 0.85)' : (isMyStar ? 'rgba(4, 20, 36, 0.88)' : 'rgba(3, 8, 20, 0.82)'));
            ctx.strokeStyle = isSelected 
              ? (star.isNsfw ? 'rgba(244, 63, 94, 0.85)' : (isMyStar ? 'rgba(56, 189, 248, 0.9)' : 'rgba(255, 215, 0, 0.7)'))
              : (star.isNsfw ? 'rgba(244, 63, 94, 0.45)' : (isMyStar ? 'rgba(56, 189, 248, 0.65)' : (isFriend ? 'rgba(255, 215, 0, 0.55)' : 'rgba(255, 223, 128, 0.25)')));
          } else {
            ctx.fillStyle = isMyStar ? '#F0F9FF' : 'rgba(255, 255, 255, 0.95)';
            ctx.strokeStyle = isMyStar ? '#0284C7' : '#64748B';
          }
          ctx.lineWidth = 1 / Math.max(0.5, vp.zoom);

          ctx.beginPath();
          const cornerR = 3 / Math.max(0.5, vp.zoom);
          const bgX = pos.x - textMetrics.width / 2 - bgPaddingH;
          const bgW = textMetrics.width + bgPaddingH * 2;
          ctx.roundRect(bgX, bgY, bgW, bgHeight, cornerR);
          ctx.fill();
          ctx.stroke();

          // Title text in starlight (Dark mode) or crisp dark slate (Light mode)
          if (isDark) {
            ctx.fillStyle = star.isNsfw 
              ? (isSelected ? '#FDA4AF' : (isHovered ? '#FECDD3' : '#F43F5E'))
              : (isSelected ? '#FFE57F' : (isHovered ? '#FFFFFF' : (isMyStar ? '#BAE6FD' : (isFriend ? '#FFF8E1' : '#E2E8F0'))));
          } else {
            ctx.fillStyle = isMyStar ? '#0369A1' : '#0F172A';
          }
          ctx.fillText(title, pos.x, labelY);
        }

        ctx.restore();
      }

      ctx.restore(); // Restore world transform

      // 7. Screen-Space Hover Tooltip when labels are off
      if (!showLabels && hoveredId && mouseScreenPosRef.current) {
        const hoveredStar = starMap.get(hoveredId);
        if (hoveredStar && hoveredStar.id !== selectedStarId) {
          const { x: sx, y: sy } = mouseScreenPosRef.current;
          ctx.save();
          ctx.font = '12px system-ui, -apple-system, sans-serif';
          const titleText = hoveredStar.isNsfw ? `🔞 [18+] ${hoveredStar.title}` : hoveredStar.title;
          const authorText = `by ${hoveredStar.author.name} • ${hoveredStar.cluster}`;
          const titleW = ctx.measureText(titleText).width;
          const authorW = ctx.measureText(authorText).width;
          const cardW = Math.max(titleW, authorW) + 24;
          const cardH = 46;

          const cardX = Math.min(Math.max(12, sx + 14), width - cardW - 12);
          const cardY = Math.min(Math.max(12, sy - cardH - 12), height - cardH - 12);

          if (isDark) {
            ctx.fillStyle = hoveredStar.isNsfw ? 'rgba(20, 4, 10, 0.95)' : 'rgba(4, 10, 24, 0.94)';
            ctx.strokeStyle = hoveredStar.isNsfw ? 'rgba(244, 63, 94, 0.65)' : 'rgba(255, 215, 0, 0.45)';
          } else {
            ctx.fillStyle = hoveredStar.isNsfw ? 'rgba(255, 241, 242, 0.98)' : 'rgba(255, 255, 255, 0.98)';
            ctx.strokeStyle = hoveredStar.isNsfw ? '#E11D48' : '#94A3B8';
          }
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(cardX, cardY, cardW, cardH, 8);
          ctx.fill();
          ctx.stroke();

          if (isDark) {
            ctx.fillStyle = hoveredStar.isNsfw ? '#FDA4AF' : '#FFE57F';
          } else {
            ctx.fillStyle = hoveredStar.isNsfw ? '#BE123C' : '#0F172A';
          }
          ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText(titleText, cardX + 12, cardY + 8);

          ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
          ctx.font = '11px system-ui, -apple-system, sans-serif';
          ctx.fillText(authorText, cardX + 12, cardY + 26);
          ctx.restore();
        }
      }

      ctx.restore(); // Restore devicePixelRatio
      if (isRunning && !document.hidden && isIntersecting) {
        animationFrameIdRef.current = requestAnimationFrame(render);
      }
    };

    // IntersectionObserver to pause rendering when canvas is scrolled out of viewport
    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined' && canvas) {
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          isIntersecting = entry ? entry.isIntersecting : true;
          if (isIntersecting && !document.hidden && isRunning && !animationFrameIdRef.current) {
            lastTimeRef.current = performance.now();
            lastRenderTime = performance.now();
            animationFrameIdRef.current = requestAnimationFrame(render);
          }
        },
        { threshold: 0.05 }
      );
      observer.observe(canvas);
    }

    // Tab Visibility Handler to pause animation when tab is inactive
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (animationFrameIdRef.current) {
          cancelAnimationFrame(animationFrameIdRef.current);
          animationFrameIdRef.current = 0;
        }
      } else {
        if (isRunning && isIntersecting && !animationFrameIdRef.current) {
          lastTimeRef.current = performance.now();
          lastRenderTime = performance.now();
          animationFrameIdRef.current = requestAnimationFrame(render);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    if (!document.hidden && isIntersecting) {
      animationFrameIdRef.current = requestAnimationFrame(render);
    }

    return () => {
      isRunning = false;
      window.removeEventListener('resize', updateCanvasDimensions);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (observer) {
        observer.disconnect();
      }
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = 0;
      }
    };
  }, [
    stars,
    edges,
    selectedStarId,
    activeCluster,
    searchQuery,
    highlightedTag,
    showLabels,
    showLines,
    isDark,
    theme,
  ]);

  // Pointer Interaction Handlers (Mouse & Touch)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    const container = containerRef.current;
    if (!container) return;

    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    
    if (containerRef.current) {
      containerRef.current.classList.add('cursor-grabbing');
      containerRef.current.classList.remove('cursor-grab');
    }

    panStartRef.current = {
      startX: e.pageX - container.offsetLeft,
      startY: e.pageY - container.offsetTop,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
    };

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    mouseScreenPosRef.current = { x: screenX, y: screenY };

    if (isDraggingRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasDraggedRef.current = true;
      }
      
      const currentX = e.pageX - container.offsetLeft;
      const currentY = e.pageY - container.offsetTop;
      const startX = panStartRef.current.startX;
      const startY = panStartRef.current.startY;
      const startScrollLeft = panStartRef.current.scrollLeft;
      const startScrollTop = panStartRef.current.scrollTop;

      if (panRafIdRef.current) {
        cancelAnimationFrame(panRafIdRef.current);
      }

      panRafIdRef.current = requestAnimationFrame(() => {
        if (!container || !isDraggingRef.current) return;
        container.scrollLeft = startScrollLeft - (currentX - startX) * 1.8;
        container.scrollTop = startScrollTop - (currentY - startY) * 1.8;
      });
    } else {
      // Check hover
      const hovered = findStarAtScreenPos(screenX, screenY);
      hoveredStarIdRef.current = hovered ? hovered.id : null;
      if (canvas) {
        canvas.style.cursor = hovered ? 'pointer' : 'grab';
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const wasDragging = hasDraggedRef.current;
    isDraggingRef.current = false;
    hasDraggedRef.current = false;
    
    if (panRafIdRef.current) {
      cancelAnimationFrame(panRafIdRef.current);
      panRafIdRef.current = null;
    }
    if (containerRef.current) {
      containerRef.current.classList.remove('cursor-grabbing');
      containerRef.current.classList.add('cursor-grab');
    }

    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (!wasDragging) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      const clickedStar = findStarAtScreenPos(screenX, screenY);
      if (clickedStar) {
        onSelectStar(clickedStar);
      } else {
        onSelectStar(null);
      }
    }
  };

  // Wheel zoom (when holding Ctrl/Cmd/Alt, otherwise allowing natural trackpad/mouse multi-directional scrolling)
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;

      const zoomFactor = e.deltaY < 0 ? 1.14 : 0.88;

      onViewportChange(prev => {
        const newZoom = Math.min(3.2, Math.max(0.25, prev.zoom * zoomFactor));
        if (newZoom === prev.zoom) return prev;

        // Maintain world point under cursor
        const worldX = (screenX - cx - prev.x) / prev.zoom;
        const worldY = (screenY - cy - prev.y) / prev.zoom;

        const newX = screenX - cx - worldX * newZoom;
        const newY = screenY - cy - worldY * newZoom;

        return {
          x: newX,
          y: newY,
          zoom: newZoom,
        };
      });
    }
  };

  // Double click to spawn
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onDoubleCanvasClick) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPos = screenToWorld(screenX, screenY, viewportRef.current);
    onDoubleCanvasClick(worldPos);
  };

  // Touch Pinch-Zoom Handling for Mobile
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      touchStartDistRef.current = dist;
      touchStartCenterRef.current = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2 && touchStartDistRef.current !== null && touchStartCenterRef.current) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const scale = dist / touchStartDistRef.current;
      touchStartDistRef.current = dist;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const screenX = touchStartCenterRef.current.x - rect.left;
      const screenY = touchStartCenterRef.current.y - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;

      onViewportChange(prev => {
        const newZoom = Math.min(3.2, Math.max(0.25, prev.zoom * scale));
        const worldX = (screenX - cx - prev.x) / prev.zoom;
        const worldY = (screenY - cy - prev.y) / prev.zoom;

        return {
          x: screenX - cx - worldX * newZoom,
          y: screenY - cy - worldY * newZoom,
          zoom: newZoom,
        };
      });
    }
  };

  const handleTouchEnd = () => {
    touchStartDistRef.current = null;
    touchStartCenterRef.current = null;
  };

  // Center the scroll position on initial load
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.scrollLeft = (container.scrollWidth - container.clientWidth) / 2;
      container.scrollTop = (container.scrollHeight - container.clientHeight) / 2;
    }
    return () => {
      if (panRafIdRef.current) {
        cancelAnimationFrame(panRafIdRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      id="constellation-canvas-container"
      className={`w-full h-full overflow-auto relative scrollbar-thin scrollbar-thumb-purple-500/20 scrollbar-track-transparent select-none cursor-grab ${
        isDark ? 'bg-[#020713]' : 'bg-[#f4f5fa]'
      }`}
    >
      <div className="relative min-w-[2000px] min-h-[2000px] w-[2000px] h-[2000px]">
        <canvas
          ref={canvasRef}
          id="constellation-main-canvas"
          className="w-full h-full block touch-none select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onWheel={handleWheel}
          onDoubleClick={handleDoubleClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
        {children}
      </div>
    </div>
  );
};
