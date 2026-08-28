import React, { useEffect, useRef } from 'react';

// Complete vibrant cosmic palette: Cyan, Magenta, Yellow, Purple, Green, and Pure White
const COSMIC_TRAIL_PALETTE = [
  '#00F0FF', // Cyan
  '#06B6D4', // Deep Cyan
  '#FF007F', // Magenta
  '#EC4899', // Hot Pink / Magenta
  '#FFE600', // Electric Yellow
  '#FFD700', // Gold Yellow
  '#A855F7', // Vivid Purple
  '#8B5CF6', // Royal Purple
  '#00FF9D', // Cosmic Green
  '#10B981', // Emerald Green
  '#FFFFFF', // Starlight White
];

type ParticleShape = 'point' | 'starburst' | 'sparkle' | 'orb' | 'diamond';

interface PooledParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  swirlAngle: number;
  swirlSpeed: number;
  swirlDelta: number;
  size: number;
  initialSize: number;
  life: number;
  maxLife: number;
  color: string;
  shape: ParticleShape;
  rotation: number;
  rotSpeed: number;
}

interface PooledTrailPoint {
  active: boolean;
  x: number;
  y: number;
  alpha: number;
  size: number;
  color: string;
}

const MAX_TRAIL_POINTS = 32;
const MAX_PARTICLES = 160;
const LERP_SMOOTHING = 0.24;
const SPRITE_SIZE = 64;
const HALF_SPRITE = SPRITE_SIZE / 2;

// Offscreen sprite cache: shape -> color -> HTMLCanvasElement
type SpriteMap = Record<ParticleShape, Record<string, HTMLCanvasElement>>;

/**
 * Pre-renders all particle variations (shapes x colors) onto offscreen canvases ONCE.
 * Bakes glowing auras, multi-point starbursts, diamond facets, and radial gradients
 * directly into static bitmapped sprites to eliminate vector recalculations during animation.
 */
function createPreRenderedSprites(): SpriteMap {
  const shapes: ParticleShape[] = ['point', 'starburst', 'sparkle', 'orb', 'diamond'];
  const sprites = {} as SpriteMap;

  const drawPolygonStar = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    spikes: number,
    outerRadius: number,
    innerRadius: number
  ) => {
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      let x = cx + Math.cos(rot) * outerRadius;
      let y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  };

  for (const shape of shapes) {
    sprites[shape] = {};
    for (const color of COSMIC_TRAIL_PALETTE) {
      const offCanvas = document.createElement('canvas');
      offCanvas.width = SPRITE_SIZE;
      offCanvas.height = SPRITE_SIZE;
      const ctx = offCanvas.getContext('2d', { alpha: true });
      if (!ctx) continue;

      const cx = HALF_SPRITE;
      const cy = HALF_SPRITE;

      if (shape === 'starburst') {
        // Baked radial aura glow
        const auraGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 26);
        auraGrad.addColorStop(0, color);
        auraGrad.addColorStop(0.6, color);
        auraGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, 26, 0, Math.PI * 2);
        ctx.fill();

        // 4-Point Core Starburst
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = color;
        drawPolygonStar(ctx, cx, cy, 4, 20, 3.5);

        // White Center Glint
        ctx.fillStyle = '#FFFFFF';
        ctx.globalAlpha = 0.95;
        drawPolygonStar(ctx, cx, cy, 4, 10, 2.0);
      } else if (shape === 'sparkle') {
        // 4-Point cross sparkle
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = color;
        drawPolygonStar(ctx, cx, cy, 4, 18, 3.0);

        // Center starlight core
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (shape === 'diamond') {
        // Faceted Diamond
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 18);
        ctx.lineTo(cx + 9, cy);
        ctx.lineTo(cx, cy + 18);
        ctx.lineTo(cx - 9, cy);
        ctx.closePath();
        ctx.fill();

        // White diamond inner glint
        ctx.fillStyle = '#FFFFFF';
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 8);
        ctx.lineTo(cx + 4, cy);
        ctx.lineTo(cx, cy + 8);
        ctx.lineTo(cx - 4, cy);
        ctx.closePath();
        ctx.fill();
      } else if (shape === 'orb') {
        // Soft glowing stardust orb
        const orbGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 20);
        orbGrad.addColorStop(0, '#FFFFFF');
        orbGrad.addColorStop(0.35, color);
        orbGrad.addColorStop(0.7, color);
        orbGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = orbGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, 20, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Point
        const ptGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 14);
        ptGrad.addColorStop(0, '#FFFFFF');
        ptGrad.addColorStop(0.5, color);
        ptGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = ptGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        ctx.fill();
      }

      sprites[shape][color] = offCanvas;
    }
  }

  return sprites;
}

export const GalaxyCursorTrail: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 1. Coordinates stored strictly inside useRef (Zero React re-renders)
  const mouseRef = useRef<{ x: number; y: number; isActive: boolean }>({
    x: -1000,
    y: -1000,
    isActive: false,
  });

  const renderedMouseRef = useRef<{ x: number; y: number; initialized: boolean }>({
    x: -1000,
    y: -1000,
    initialized: false,
  });

  // 2. Pre-allocated Object Pools (Eliminates GC thrashing & memory allocation)
  const particlePoolRef = useRef<PooledParticle[]>([]);
  const trailPoolRef = useRef<PooledTrailPoint[]>([]);
  const particlePoolIndexRef = useRef<number>(0);
  const trailCountRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Pre-render sprite atlas
    const spriteAtlas = createPreRenderedSprites();

    // Initialize Fixed Particle Object Pool
    particlePoolRef.current = new Array(MAX_PARTICLES);
    for (let i = 0; i < MAX_PARTICLES; i++) {
      particlePoolRef.current[i] = {
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        swirlAngle: 0,
        swirlSpeed: 0,
        swirlDelta: 0,
        size: 0,
        initialSize: 0,
        life: 0,
        maxLife: 1,
        color: COSMIC_TRAIL_PALETTE[0],
        shape: 'point',
        rotation: 0,
        rotSpeed: 0,
      };
    }

    // Initialize Fixed Trail Points Pool
    trailPoolRef.current = new Array(MAX_TRAIL_POINTS);
    for (let i = 0; i < MAX_TRAIL_POINTS; i++) {
      trailPoolRef.current[i] = {
        active: false,
        x: 0,
        y: 0,
        alpha: 0,
        size: 0,
        color: COSMIC_TRAIL_PALETTE[0],
      };
    }
    trailCountRef.current = 0;

    let animFrameId: number = 0;
    let isRunning = true;

    // Retina Display & High DPI Scaling (capped at 2 for optimal throughput)
    const resizeCanvas = () => {
      if (!canvas || !ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      if (typeof ctx.resetTransform === 'function') {
        ctx.resetTransform();
      } else {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas, { passive: true });

    // Recycle and reuse dead particles from pre-allocated memory pool
    const spawnParticleAt = (x: number, y: number, velocityX = 0, velocityY = 0) => {
      const pool = particlePoolRef.current;
      const poolSize = pool.length;

      // Find next circular slot in pool
      const idx = particlePoolIndexRef.current;
      particlePoolIndexRef.current = (idx + 1) % poolSize;
      const p = pool[idx];

      const angle = Math.random() * Math.PI * 2;
      const baseSpeed = 0.4 + Math.random() * 1.6;
      const color = COSMIC_TRAIL_PALETTE[(Math.random() * COSMIC_TRAIL_PALETTE.length) | 0];

      const roll = Math.random();
      let shape: ParticleShape = 'point';
      let initialSize = 1.0;

      if (roll > 0.72) {
        shape = 'starburst';
        initialSize = 2.4 + Math.random() * 2.8;
      } else if (roll > 0.48) {
        shape = 'sparkle';
        initialSize = 1.8 + Math.random() * 2.0;
      } else if (roll > 0.28) {
        shape = 'diamond';
        initialSize = 1.5 + Math.random() * 1.8;
      } else if (roll > 0.14) {
        shape = 'orb';
        initialSize = 1.2 + Math.random() * 1.8;
      } else {
        shape = 'point';
        initialSize = 0.8 + Math.random() * 1.2;
      }

      const maxLife = 22 + ((Math.random() * 18) | 0);
      const swirlDir = Math.random() > 0.5 ? 1 : -1;

      p.active = true;
      p.x = x + (Math.random() - 0.5) * 6;
      p.y = y + (Math.random() - 0.5) * 6;
      p.vx = Math.cos(angle) * baseSpeed + velocityX * 0.15;
      p.vy = Math.sin(angle) * baseSpeed + velocityY * 0.15;
      p.swirlAngle = Math.random() * Math.PI * 2;
      p.swirlSpeed = 0.2 + Math.random() * 0.5;
      p.swirlDelta = (0.04 + Math.random() * 0.08) * swirlDir;
      p.size = initialSize;
      p.initialSize = initialSize;
      p.life = maxLife;
      p.maxLife = maxLife;
      p.color = color;
      p.shape = shape;
      p.rotation = Math.random() * Math.PI;
      p.rotSpeed = (Math.random() - 0.5) * 0.16;
    };

    // Add trail point reusing fixed array slots
    const addTrailPoint = (x: number, y: number, size: number) => {
      const trail = trailPoolRef.current;
      const count = trailCountRef.current;

      if (count < MAX_TRAIL_POINTS) {
        const slot = trail[count];
        slot.active = true;
        slot.x = x;
        slot.y = y;
        slot.alpha = 1.0;
        slot.size = size;
        slot.color = COSMIC_TRAIL_PALETTE[(Math.random() * COSMIC_TRAIL_PALETTE.length) | 0];
        trailCountRef.current = count + 1;
      } else {
        // Shift elements in-place without creating new objects
        const first = trail[0];
        for (let i = 0; i < MAX_TRAIL_POINTS - 1; i++) {
          trail[i] = trail[i + 1];
        }
        first.active = true;
        first.x = x;
        first.y = y;
        first.alpha = 1.0;
        first.size = size;
        first.color = COSMIC_TRAIL_PALETTE[(Math.random() * COSMIC_TRAIL_PALETTE.length) | 0];
        trail[MAX_TRAIL_POINTS - 1] = first;
      }
    };

    // Passive Pointer & Mouse Listeners (Zero React state triggers)
    const handlePointerMove = (e: PointerEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY, isActive: true };
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY, isActive: true };
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        mouseRef.current = { x: touch.clientX, y: touch.clientY, isActive: true };
      }
    };

    const handlePointerLeave = () => {
      mouseRef.current.isActive = false;
      renderedMouseRef.current.initialized = false;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('pointerleave', handlePointerLeave, { passive: true });
    window.addEventListener('pointerup', handlePointerLeave, { passive: true });
    document.addEventListener('mouseleave', handlePointerLeave, { passive: true });

    // Dedicated Animation Loop using requestAnimationFrame with Pre-rendered Sprites & Integer Math
    const animate = () => {
      if (!isRunning) return;

      const width = window.innerWidth;
      const height = window.innerHeight;

      const mouse = mouseRef.current;
      const rendered = renderedMouseRef.current;
      const trail = trailPoolRef.current;
      const particles = particlePoolRef.current;

      // Linear Interpolation (Lerp) Smoothing
      if (mouse.isActive) {
        if (!rendered.initialized) {
          rendered.x = mouse.x;
          rendered.y = mouse.y;
          rendered.initialized = true;
        } else {
          const prevX = rendered.x;
          const prevY = rendered.y;

          rendered.x += (mouse.x - rendered.x) * LERP_SMOOTHING;
          rendered.y += (mouse.y - rendered.y) * LERP_SMOOTHING;

          const dx = rendered.x - prevX;
          const dy = rendered.y - prevY;
          const speed = Math.hypot(dx, dy);

          const trailCount = trailCountRef.current;
          const lastPoint = trailCount > 0 ? trail[trailCount - 1] : null;
          const dist = lastPoint ? Math.hypot(rendered.x - lastPoint.x, rendered.y - lastPoint.y) : 999;

          if (dist > 1.0) {
            const pointSize = Math.min(4.5, 2.8 + speed * 0.15);
            addTrailPoint(rendered.x, rendered.y, pointSize);

            // Vibrant particle emission matching original density
            const count = speed > 5 ? 3 : speed > 1.5 ? 2 : 1;
            for (let k = 0; k < count; k++) {
              spawnParticleAt(rendered.x, rendered.y, dx, dy);
            }
          }
        }
      }

      // Clear frame strictly on each RAF cycle
      ctx.clearRect(0, 0, width, height);

      // --- 1. Draw Smooth Glowing Multi-Color Celestial Ribbon ---
      const trailCount = trailCountRef.current;
      if (trailCount > 1) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Draw segmented glowing lines with integer math
        for (let i = 0; i < trailCount - 1; i++) {
          const p1 = trail[i];
          const p2 = trail[i + 1];
          if (!p1.active || !p2.active) continue;

          const progress = (i + 1) / trailCount;
          const segmentAlpha = p1.alpha * progress;

          if (segmentAlpha <= 0.01) continue;

          const p1x = p1.x | 0;
          const p1y = p1.y | 0;
          const p2x = p2.x | 0;
          const p2y = p2.y | 0;

          // Outer aura glow
          ctx.beginPath();
          ctx.moveTo(p1x, p1y);
          ctx.lineTo(p2x, p2y);
          ctx.strokeStyle = p2.color;
          ctx.globalAlpha = segmentAlpha * 0.45;
          ctx.lineWidth = (p1.size * progress * 3.2) | 0 || 1;
          ctx.stroke();

          // Inner sharp white core beam
          ctx.beginPath();
          ctx.moveTo(p1x, p1y);
          ctx.lineTo(p2x, p2y);
          ctx.strokeStyle = '#FFFFFF';
          ctx.globalAlpha = segmentAlpha * 0.9;
          ctx.lineWidth = Math.max(1, (p1.size * progress * 0.95) | 0);
          ctx.stroke();
        }

        ctx.restore();
      }

      // Trail decay in-place without splicing
      let writeIdx = 0;
      for (let i = 0; i < trailCount; i++) {
        const pt = trail[i];
        if (pt.active) {
          pt.alpha *= 0.90;
          if (pt.alpha > 0.02) {
            if (writeIdx !== i) {
              trail[writeIdx].x = pt.x;
              trail[writeIdx].y = pt.y;
              trail[writeIdx].alpha = pt.alpha;
              trail[writeIdx].size = pt.size;
              trail[writeIdx].color = pt.color;
              trail[writeIdx].active = true;
            }
            writeIdx++;
          } else {
            pt.active = false;
          }
        }
      }
      trailCountRef.current = writeIdx;

      // --- 2. Draw Active Particles via Pre-Rendered Offscreen Sprites ---
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = particles[i];
        if (!p.active) continue;

        p.life -= 1;
        if (p.life <= 0) {
          p.active = false;
          continue;
        }

        // Swirl and natural drift physics
        p.swirlAngle += p.swirlDelta;
        p.x += p.vx + Math.cos(p.swirlAngle) * p.swirlSpeed;
        p.y += p.vy + Math.sin(p.swirlAngle) * p.swirlSpeed;
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.rotation += p.rotSpeed;

        const progress = p.life / p.maxLife;
        const alpha = Math.min(1, Math.max(0, Math.pow(progress, 0.9) * 1.15));
        p.size = p.initialSize * (0.25 + 0.75 * progress);

        // Fetch pre-rendered offscreen sprite
        const sprite = spriteAtlas[p.shape]?.[p.color] || spriteAtlas['point'][p.color];
        if (!sprite) continue;

        const drawScale = (p.size * 2.8) / HALF_SPRITE;
        const drawW = (SPRITE_SIZE * drawScale) | 0;
        const drawH = (SPRITE_SIZE * drawScale) | 0;
        if (drawW <= 0 || drawH <= 0) continue;

        const halfDrawW = (drawW >> 1);
        const halfDrawH = (drawH >> 1);
        const intX = (p.x | 0);
        const intY = (p.y | 0);

        ctx.globalAlpha = alpha;

        // Rotating shapes vs simple shapes optimization
        if (p.shape === 'starburst' || p.shape === 'sparkle' || p.shape === 'diamond') {
          ctx.save();
          ctx.translate(intX, intY);
          ctx.rotate(p.rotation);
          ctx.drawImage(sprite, -halfDrawW, -halfDrawH, drawW, drawH);
          ctx.restore();
        } else {
          // Point and Orb: Direct draw without save/translate/restore
          ctx.drawImage(sprite, intX - halfDrawW, intY - halfDrawH, drawW, drawH);
        }
      }

      animFrameId = requestAnimationFrame(animate);
    };

    animFrameId = requestAnimationFrame(animate);

    return () => {
      isRunning = false;
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('pointerup', handlePointerLeave);
      document.removeEventListener('mouseleave', handlePointerLeave);
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="galaxy-cursor-trail-canvas"
      className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden select-none"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9999,
        willChange: 'transform',
      }}
    />
  );
};




