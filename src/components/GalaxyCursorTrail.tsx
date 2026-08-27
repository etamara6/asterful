import React, { useEffect, useRef } from 'react';

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

// Celestial cosmic palette: Starlight Gold, Bright Amber, Cyan, Electric Violet, Nebula Magenta, White Core
const GALAXY_PALETTE = [
  '#FFD700', // Starlight Gold
  '#FFE600', // Bright Amber Glow
  '#00D2D3', // Cosmic Cyan
  '#7D5FFF', // Electric Violet
  '#E056FD', // Nebula Magenta
  '#FFFFFF', // Pure White Starlight Core
];

// Maximum active particle pool to maintain high star density while bounding memory
const MAX_PARTICLES = 300;

export const GalaxyCursorTrail: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<GalaxyParticle[]>([]);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animFrameId = 0;
    let isRunning = true;

    // Retina Display & High DPI Scaling (capped at 2 for performance on live deployments)
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

    // Spawn a particle at exact viewport coordinates without React state
    const spawnParticleAt = (x: number, y: number, spread = 2.0) => {
      const particles = particlesRef.current;
      if (particles.length >= MAX_PARTICLES) {
        // Fast FIFO drop for fixed memory footprint
        particles.shift();
      }

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.2 + Math.random() * 1.1;
      const color = GALAXY_PALETTE[Math.floor(Math.random() * GALAXY_PALETTE.length)];
      
      const roll = Math.random();
      const shape: GalaxyParticle['shape'] = roll > 0.5 ? '4-point-star' : roll > 0.2 ? 'circle' : 'sparkle';
      const initialSize = shape === '4-point-star' ? 1.4 + Math.random() * 2.2 : 0.9 + Math.random() * 1.8;
      const maxLife = 20 + Math.floor(Math.random() * 14); // ~330ms to 560ms duration

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
        rotSpeed: (Math.random() - 0.5) * 0.15,
      });
    };

    // Sub-segment linear interpolation for continuous celestial trails during fast sweeps
    const processPointMovement = (currentX: number, currentY: number) => {
      if (lastPosRef.current) {
        const lastX = lastPosRef.current.x;
        const lastY = lastPosRef.current.y;
        const dx = currentX - lastX;
        const dy = currentY - lastY;
        const dist = Math.hypot(dx, dy);

        // Sub-pixel 3.5px steps prevent gaps during rapid circular gestures
        const stepSize = 3.5;
        const steps = Math.min(20, Math.max(1, Math.floor(dist / stepSize)));

        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const interpX = lastX + dx * t;
          const interpY = lastY + dy * t;
          spawnParticleAt(interpX, interpY, 2.0);
        }
      } else {
        spawnParticleAt(currentX, currentY, 1.5);
      }

      lastPosRef.current = { x: currentX, y: currentY };

      // Ensure animation loop is actively running if sleeping
      if (!animFrameId && isRunning && !document.hidden && isIntersecting) {
        lastRenderTime = performance.now();
        animFrameId = requestAnimationFrame(render);
      }
    };

    // Native pointer / mouse listeners
    const handlePointerMove = (e: PointerEvent) => {
      if (typeof e.getCoalescedEvents === 'function') {
        const coalesced = e.getCoalescedEvents();
        if (coalesced && coalesced.length > 0) {
          for (let i = 0; i < coalesced.length; i++) {
            processPointMovement(coalesced[i].clientX, coalesced[i].clientY);
          }
          return;
        }
      }
      processPointMovement(e.clientX, e.clientY);
    };

    const handleMouseMove = (e: MouseEvent) => {
      processPointMovement(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        processPointMovement(touch.clientX, touch.clientY);
      }
    };

    const handlePointerLeave = () => {
      lastPosRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('pointerleave', handlePointerLeave, { passive: true });
    window.addEventListener('pointerup', handlePointerLeave, { passive: true });
    document.addEventListener('mouseleave', handlePointerLeave);

    // Native 2D Canvas Star Drawing Helper
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

    // 60 FPS Frame Rate Capping (1000ms / 60 = 16.66ms)
    const FRAME_MIN_TIME = 1000 / 60;
    let lastRenderTime = performance.now();
    let isIntersecting = true;

    // Continuous requestAnimationFrame render loop
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

      const particles = particlesRef.current;
      if (particles.length === 0) {
        // Clear canvas and go to sleep when no active particles
        ctx.clearRect(0, 0, width, height);
        animFrameId = 0;
        return;
      }

      // Clear the canvas on each active frame
      ctx.clearRect(0, 0, width, height);
      
      // In-place reverse loop update & draw for high efficiency
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
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.rotation += p.rotSpeed;

        const progress = p.life / p.maxLife;
        const alpha = Math.min(1, Math.max(0, progress * 1.15));
        p.size = p.initialSize * (0.35 + 0.65 * progress);

        ctx.save();

        if (p.shape === '4-point-star') {
          // Native radial aura glow behind sparkle stars
          const glowGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3.2);
          glowGrad.addColorStop(0, p.color);
          glowGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.globalAlpha = alpha * 0.35;
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 3.2, 0, Math.PI * 2);
          ctx.fill();

          // Sharp starlight core
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;
          draw4PointStar(ctx, p.x, p.y, 4, p.size * 2.4, p.size * 0.5, p.rotation);
        } else if (p.shape === 'sparkle') {
          // Cross sparkle
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;
          draw4PointStar(ctx, p.x, p.y, 4, p.size * 1.8, p.size * 0.3, p.rotation);
        } else {
          // Glowing celestial orb / stardust with lightweight radial gradient glow
          const orbGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.2);
          orbGrad.addColorStop(0, p.color);
          orbGrad.addColorStop(0.6, p.color);
          orbGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

          ctx.globalAlpha = alpha;
          ctx.fillStyle = orbGrad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2.2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      if (isRunning && !document.hidden && isIntersecting && particles.length > 0) {
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
          if (isIntersecting && !document.hidden && isRunning && !animFrameId && particlesRef.current.length > 0) {
            lastRenderTime = performance.now();
            animFrameId = requestAnimationFrame(render);
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
        if (isRunning && isIntersecting && !animFrameId && particlesRef.current.length > 0) {
          lastRenderTime = performance.now();
          animFrameId = requestAnimationFrame(render);
        }
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

