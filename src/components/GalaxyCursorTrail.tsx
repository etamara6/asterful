import React, { useEffect, useRef } from 'react';

interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
  size: number;
  color: string;
}

interface GalaxyParticle {
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
  shape: 'point' | 'starburst' | 'sparkle' | 'orb' | 'diamond';
  rotation: number;
  rotSpeed: number;
}

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

const MAX_TRAIL_POINTS = 32;
const MAX_PARTICLES = 160;
const LERP_SMOOTHING = 0.24;

export const GalaxyCursorTrail: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 1. Mouse coordinates, trail points & active particles live strictly inside useRef (Zero React re-renders)
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

  const trailPointsRef = useRef<TrailPoint[]>([]);
  const particlesRef = useRef<GalaxyParticle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animFrameId: number = 0;
    let isRunning = true;

    // Retina Display & High DPI Scaling (capped at 2 for silky performance)
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

    // Spawn rich celestial stardust particles with diverse shapes & swirl physics
    const spawnParticleAt = (x: number, y: number, velocityX = 0, velocityY = 0) => {
      const particles = particlesRef.current;
      if (particles.length >= MAX_PARTICLES) {
        particles.shift(); // Safe bounding
      }

      const angle = Math.random() * Math.PI * 2;
      const baseSpeed = 0.4 + Math.random() * 1.6;
      const color = COSMIC_TRAIL_PALETTE[Math.floor(Math.random() * COSMIC_TRAIL_PALETTE.length)];
      
      const roll = Math.random();
      let shape: GalaxyParticle['shape'] = 'point';
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

      const maxLife = 22 + Math.floor(Math.random() * 18);
      const swirlDir = Math.random() > 0.5 ? 1 : -1;

      particles.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 6,
        vx: Math.cos(angle) * baseSpeed + velocityX * 0.15,
        vy: Math.sin(angle) * baseSpeed + velocityY * 0.15,
        swirlAngle: Math.random() * Math.PI * 2,
        swirlSpeed: 0.2 + Math.random() * 0.5,
        swirlDelta: (0.04 + Math.random() * 0.08) * swirlDir,
        size: initialSize,
        initialSize,
        life: maxLife,
        maxLife,
        color,
        shape,
        rotation: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 0.16,
      });
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

    // Geometric micro-starburst and sparkle renderer
    const drawStarburst = (
      context: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      spikes: number,
      outerRadius: number,
      innerRadius: number,
      rotation: number
    ) => {
      let rot = (Math.PI / 2) * 3 + rotation;
      const step = Math.PI / spikes;

      context.beginPath();
      context.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        let x = cx + Math.cos(rot) * outerRadius;
        let y = cy + Math.sin(rot) * outerRadius;
        context.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        context.lineTo(x, y);
        rot += step;
      }
      context.lineTo(cx, cy - outerRadius);
      context.closePath();
      context.fill();
    };

    // Diamond sparkle shape
    const drawDiamond = (
      context: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      width: number,
      height: number,
      rotation: number
    ) => {
      context.save();
      context.translate(cx, cy);
      context.rotate(rotation);
      context.beginPath();
      context.moveTo(0, -height);
      context.lineTo(width, 0);
      context.lineTo(0, height);
      context.lineTo(-width, 0);
      context.closePath();
      context.fill();
      context.restore();
    };

    // Dedicated Animation Loop using requestAnimationFrame
    const animate = () => {
      if (!isRunning) return;

      const width = window.innerWidth;
      const height = window.innerHeight;

      const mouse = mouseRef.current;
      const rendered = renderedMouseRef.current;
      const trail = trailPointsRef.current;
      const particles = particlesRef.current;

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

          // Add trail point when moved
          const lastPoint = trail[trail.length - 1];
          const dist = lastPoint ? Math.hypot(rendered.x - lastPoint.x, rendered.y - lastPoint.y) : 999;

          if (dist > 1.0) {
            trail.push({
              x: rendered.x,
              y: rendered.y,
              alpha: 1.0,
              size: Math.min(4.5, 2.8 + speed * 0.15),
              color: COSMIC_TRAIL_PALETTE[Math.floor(Math.random() * COSMIC_TRAIL_PALETTE.length)],
            });

            while (trail.length > MAX_TRAIL_POINTS) {
              trail.shift();
            }

            // Vibrant particle emission matching original density (cyan, magenta, yellow, purple, green, white)
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
      if (trail.length > 1) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Draw segmented glowing lines with fading alpha and decreasing width
        for (let i = 0; i < trail.length - 1; i++) {
          const p1 = trail[i];
          const p2 = trail[i + 1];
          const progress = (i + 1) / trail.length; // 0 (oldest) to 1 (newest)
          const segmentAlpha = p1.alpha * progress;

          if (segmentAlpha <= 0.01) continue;

          // Outer aura glow with full vibrant palette
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = p2.color;
          ctx.globalAlpha = segmentAlpha * 0.45;
          ctx.lineWidth = p1.size * progress * 3.2;
          ctx.stroke();

          // Inner sharp white/colored core beam
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = '#FFFFFF';
          ctx.globalAlpha = segmentAlpha * 0.9;
          ctx.lineWidth = Math.max(1, p1.size * progress * 0.95);
          ctx.stroke();
        }

        ctx.restore();
      }

      // Trail decay
      for (let i = trail.length - 1; i >= 0; i--) {
        trail[i].alpha *= 0.90;
        if (trail[i].alpha <= 0.02) {
          trail.splice(i, 1);
        }
      }

      // --- 2. Draw Diverse Sparkling Star Particles with Swirl Physics ---
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= 1;

        if (p.life <= 0) {
          particles.splice(i, 1);
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

        ctx.save();

        if (p.shape === 'starburst') {
          // 8-point / 4-point micro-starburst with soft aura glow
          const glowGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3.5);
          glowGrad.addColorStop(0, p.color);
          glowGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.globalAlpha = alpha * 0.45;
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 3.5, 0, Math.PI * 2);
          ctx.fill();

          // Core Starburst
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;
          drawStarburst(ctx, p.x, p.y, 4, p.size * 2.4, p.size * 0.4, p.rotation);

          // White center glint
          ctx.fillStyle = '#FFFFFF';
          ctx.globalAlpha = alpha * 0.9;
          drawStarburst(ctx, p.x, p.y, 4, p.size * 1.2, p.size * 0.25, p.rotation);
        } else if (p.shape === 'sparkle') {
          // Distinct 4-point cross sparkle
          ctx.globalAlpha = alpha * 0.95;
          ctx.fillStyle = p.color;
          drawStarburst(ctx, p.x, p.y, 4, p.size * 1.9, p.size * 0.35, p.rotation);
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(0.6, p.size * 0.35), 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 'diamond') {
          // Rotating diamond flare
          ctx.globalAlpha = alpha * 0.9;
          ctx.fillStyle = p.color;
          drawDiamond(ctx, p.x, p.y, p.size * 0.7, p.size * 1.4, p.rotation);
        } else if (p.shape === 'orb') {
          // Glowing celestial orb / stardust
          const orbGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.4);
          orbGrad.addColorStop(0, '#FFFFFF');
          orbGrad.addColorStop(0.35, p.color);
          orbGrad.addColorStop(0.7, p.color);
          orbGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

          ctx.globalAlpha = alpha;
          ctx.fillStyle = orbGrad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2.4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Tiny vibrant point
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
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



