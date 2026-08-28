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
  size: number;
  initialSize: number;
  life: number;
  maxLife: number;
  color: string;
  shape: '4-point-star' | 'circle' | 'sparkle';
  rotation: number;
  rotSpeed: number;
}

// Celestial cosmic palette: Starlight Gold, Bright Amber, Cyan, Electric Violet, Nebula Magenta, Pure White Core
const GALAXY_PALETTE = [
  '#FFD700', // Starlight Gold
  '#FFE600', // Amber Glow
  '#00D2D3', // Cosmic Cyan
  '#7D5FFF', // Electric Violet
  '#E056FD', // Nebula Magenta
  '#FFFFFF', // Starlight Core
];

// Capped trail length (25-30 max points to strictly bound memory)
const MAX_TRAIL_POINTS = 28;
const MAX_PARTICLES = 120;
const LERP_SMOOTHING = 0.2;

export const GalaxyCursorTrail: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 1. Mouse Coordinates, Trail Points & Particles live strictly inside useRef (Zero React re-renders)
  const targetMouseRef = useRef<{ x: number; y: number; isActive: boolean }>({
    x: 0,
    y: 0,
    isActive: false,
  });

  const renderedMouseRef = useRef<{ x: number; y: number; initialized: boolean }>({
    x: 0,
    y: 0,
    initialized: false,
  });

  const trailPointsRef = useRef<TrailPoint[]>([]);
  const particlesRef = useRef<GalaxyParticle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animFrameId = 0;
    let isRunning = true;
    let isIntersecting = true;
    let lastRenderTime = performance.now();
    const FRAME_MIN_TIME = 1000 / 60; // 60 FPS cap

    // 3. Retina Display & High DPI Scaling (capped at 2 for performance)
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

    // Spawn a celestial stardust particle at coordinates without triggering re-renders
    const spawnParticleAt = (x: number, y: number, spread = 2.5) => {
      const particles = particlesRef.current;
      if (particles.length >= MAX_PARTICLES) {
        particles.shift(); // FIFO drop for memory safety
      }

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.25 + Math.random() * 0.95;
      const color = GALAXY_PALETTE[Math.floor(Math.random() * GALAXY_PALETTE.length)];
      const roll = Math.random();
      const shape: GalaxyParticle['shape'] = roll > 0.55 ? '4-point-star' : roll > 0.25 ? 'circle' : 'sparkle';
      const initialSize = shape === '4-point-star' ? 1.4 + Math.random() * 2.0 : 0.8 + Math.random() * 1.6;
      const maxLife = 18 + Math.floor(Math.random() * 12);

      particles.push({
        x: x + (Math.random() - 0.5) * spread,
        y: y + (Math.random() - 0.5) * spread,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: initialSize,
        initialSize,
        life: maxLife,
        maxLife,
        color,
        shape,
        rotation: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 0.12,
      });
    };

    // Wake up the requestAnimationFrame loop if currently idle
    const requestFrameIfNeeded = () => {
      if (!animFrameId && isRunning && !document.hidden && isIntersecting) {
        lastRenderTime = performance.now();
        animFrameId = requestAnimationFrame(render);
      }
    };

    // 3. Pointer & Mouse Event Listeners with { passive: true } (Zero setState)
    const handlePointerMove = (e: PointerEvent) => {
      targetMouseRef.current.x = e.clientX;
      targetMouseRef.current.y = e.clientY;
      targetMouseRef.current.isActive = true;
      requestFrameIfNeeded();
    };

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseRef.current.x = e.clientX;
      targetMouseRef.current.y = e.clientY;
      targetMouseRef.current.isActive = true;
      requestFrameIfNeeded();
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        targetMouseRef.current.x = touch.clientX;
        targetMouseRef.current.y = touch.clientY;
        targetMouseRef.current.isActive = true;
        requestFrameIfNeeded();
      }
    };

    const handlePointerLeave = () => {
      targetMouseRef.current.isActive = false;
      renderedMouseRef.current.initialized = false;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('pointerleave', handlePointerLeave, { passive: true });
    window.addEventListener('pointerup', handlePointerLeave, { passive: true });
    document.addEventListener('mouseleave', handlePointerLeave, { passive: true });

    // Native 2D Star Polygon Drawer
    const draw4PointStar = (
      context: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      spikes: number,
      outerRadius: number,
      innerRadius: number,
      rotation: number
    ) => {
      let rot = (Math.PI / 2) * 3 + rotation;
      let x = cx;
      let y = cy;
      const step = Math.PI / spikes;

      context.beginPath();
      context.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
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

    // Main animation and rendering loop
    const render = (now: number) => {
      if (!isRunning || document.hidden || !isIntersecting) {
        animFrameId = 0;
        return;
      }

      const elapsed = now - lastRenderTime;
      if (elapsed < FRAME_MIN_TIME) {
        animFrameId = requestAnimationFrame(render);
        return;
      }
      lastRenderTime = now - (elapsed % FRAME_MIN_TIME);

      const width = window.innerWidth;
      const height = window.innerHeight;

      const target = targetMouseRef.current;
      const rendered = renderedMouseRef.current;
      const trail = trailPointsRef.current;
      const particles = particlesRef.current;

      // 2. Linear Interpolation (Lerp) Smoothing
      if (target.isActive) {
        if (!rendered.initialized) {
          rendered.x = target.x;
          rendered.y = target.y;
          rendered.initialized = true;
        } else {
          // Lerp trailing point toward target coordinates before drawing
          rendered.x += (target.x - rendered.x) * LERP_SMOOTHING;
          rendered.y += (target.y - rendered.y) * LERP_SMOOTHING;
        }

        // Add trail point when moved
        const lastPoint = trail[trail.length - 1];
        const dist = lastPoint ? Math.hypot(rendered.x - lastPoint.x, rendered.y - lastPoint.y) : 999;

        if (dist > 1.2) {
          trail.push({
            x: rendered.x,
            y: rendered.y,
            alpha: 1.0,
            size: 3.8,
            color: GALAXY_PALETTE[Math.floor(Math.random() * GALAXY_PALETTE.length)],
          });

          // 3. Cap trail array length to max 25-30 points (pops off older points)
          while (trail.length > MAX_TRAIL_POINTS) {
            trail.shift();
          }

          // Subtle sparkling stardust emission
          if (Math.random() > 0.35) {
            spawnParticleAt(rendered.x, rendered.y, 2.0);
          }
        }
      }

      // Check if anything is visible to render
      if (trail.length === 0 && particles.length === 0 && !target.isActive) {
        ctx.clearRect(0, 0, width, height);
        animFrameId = 0;
        return;
      }

      // Clear frame
      ctx.clearRect(0, 0, width, height);

      // --- 1. Draw Smooth Glowing Celestial Trail Ribbon ---
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

          // Outer aura glow
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = p2.color;
          ctx.globalAlpha = segmentAlpha * 0.28;
          ctx.lineWidth = p1.size * progress * 2.8;
          ctx.stroke();

          // Inner sharp starlight beam
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = '#FFFFFF';
          ctx.globalAlpha = segmentAlpha * 0.85;
          ctx.lineWidth = Math.max(1, p1.size * progress * 0.9);
          ctx.stroke();
        }

        ctx.restore();
      }

      // Trail decay
      for (let i = trail.length - 1; i >= 0; i--) {
        trail[i].alpha *= 0.91;
        if (trail[i].alpha <= 0.03) {
          trail.splice(i, 1);
        }
      }

      // --- 2. Draw Sparkling Star Particles ---
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= 1;

        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        // Particle physics
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.rotation += p.rotSpeed;

        const progress = p.life / p.maxLife;
        const alpha = Math.min(1, Math.max(0, progress * 1.1));
        p.size = p.initialSize * (0.3 + 0.7 * progress);

        ctx.save();

        if (p.shape === '4-point-star') {
          // Radial soft aura
          const glowGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3.0);
          glowGrad.addColorStop(0, p.color);
          glowGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.globalAlpha = alpha * 0.35;
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 3.0, 0, Math.PI * 2);
          ctx.fill();

          // Star Core
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;
          draw4PointStar(ctx, p.x, p.y, 4, p.size * 2.2, p.size * 0.5, p.rotation);
        } else if (p.shape === 'sparkle') {
          // Cross sparkle
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;
          draw4PointStar(ctx, p.x, p.y, 4, p.size * 1.7, p.size * 0.3, p.rotation);
        } else {
          // Glowing celestial orb / stardust
          const orbGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.0);
          orbGrad.addColorStop(0, p.color);
          orbGrad.addColorStop(0.6, p.color);
          orbGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

          ctx.globalAlpha = alpha;
          ctx.fillStyle = orbGrad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2.0, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      // Continue loop if active or lingering
      if (isRunning && !document.hidden && isIntersecting && (trail.length > 0 || particles.length > 0 || target.isActive)) {
        animFrameId = requestAnimationFrame(render);
      } else {
        animFrameId = 0;
      }
    };

    // IntersectionObserver to pause rendering when canvas is scrolled out of viewport
    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined' && canvas) {
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          isIntersecting = entry ? entry.isIntersecting : true;
          if (isIntersecting && !document.hidden && isRunning && !animFrameId) {
            requestFrameIfNeeded();
          }
        },
        { threshold: 0.05 }
      );
      observer.observe(canvas);
    }

    // Tab Visibility Handler to pause animation when tab is inactive
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (animFrameId) {
          cancelAnimationFrame(animFrameId);
          animFrameId = 0;
        }
      } else {
        requestFrameIfNeeded();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isRunning = false;
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('pointerup', handlePointerLeave);
      document.removeEventListener('mouseleave', handlePointerLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (observer) {
        observer.disconnect();
      }
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = 0;
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
      }}
    />
  );
};


