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
  shape: 'circle' | '4-point-star';
  rotation: number;
  rotSpeed: number;
}

const GALAXY_PALETTE = [
  '#FFD700', // Starlight Gold
  '#FFE600', // Bright Amber Glow
  '#00D2D3', // Deep Cosmic Cyan
  '#7D5FFF', // Electric Violet
  '#E056FD', // Nebula Magenta
  '#FFFFFF', // Pure White Starlight Core
];

// Generous particle pool for high star density without frame drops
const MAX_PARTICLES = 320;

export const GalaxyCursorTrail: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<GalaxyParticle[]>([]);
  const animFrameIdRef = useRef<number>(0);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const prevPosRef = useRef<{ x: number; y: number } | null>(null); // For curved velocity & angle estimation

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      if (typeof ctx.resetTransform === 'function') {
        ctx.resetTransform();
      } else {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas, { passive: true });

    // Instantly spawn a particle at exact viewport coordinates (clientX / clientY)
    const spawnParticleAt = (x: number, y: number, spread = 2.0) => {
      const particles = particlesRef.current;
      if (particles.length >= MAX_PARTICLES) {
        // Recycle oldest particle instantly
        particles.shift();
      }

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.2 + Math.random() * 1.2;
      const color = GALAXY_PALETTE[Math.floor(Math.random() * GALAXY_PALETTE.length)];
      const shape = Math.random() > 0.4 ? '4-point-star' : 'circle';
      const initialSize = shape === '4-point-star' ? 1.3 + Math.random() * 2.1 : 0.9 + Math.random() * 1.6;
      // 22 - 34 frames lifespan (~360ms - 560ms at 60fps)
      const maxLife = 22 + Math.floor(Math.random() * 12);

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
        rotSpeed: (Math.random() - 0.5) * 0.16,
      });
    };

    // Sub-segment linear & curve interpolation for buttery smooth circular strokes
    const processPointMovement = (currentX: number, currentY: number) => {
      if (lastPosRef.current) {
        const lastX = lastPosRef.current.x;
        const lastY = lastPosRef.current.y;
        const dx = currentX - lastX;
        const dy = currentY - lastY;
        const dist = Math.hypot(dx, dy);

        // Sub-pixel spacing (3px steps) so fast circular motions create fluid arcs without angular corners
        const stepSize = 3.5;
        const steps = Math.min(24, Math.max(1, Math.floor(dist / stepSize)));

        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          // Smooth interpolation between previous and current pointer position
          const interpX = lastX + dx * t;
          const interpY = lastY + dy * t;
          spawnParticleAt(interpX, interpY, 2.2);
        }
      } else {
        spawnParticleAt(currentX, currentY, 1.5);
      }

      prevPosRef.current = lastPosRef.current;
      lastPosRef.current = { x: currentX, y: currentY };
    };

    // Viewport-space tracking with coalesced pointer events for hardware-rate accuracy
    const handlePointerMove = (e: PointerEvent) => {
      // Use getCoalescedEvents if available to process high-frequency hardware events during fast curves
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
      prevPosRef.current = null;
    };

    // Use passive listeners on window for universal viewport tracking
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('pointerleave', handlePointerLeave, { passive: true });
    window.addEventListener('pointerup', handlePointerLeave, { passive: true });
    document.addEventListener('mouseleave', handlePointerLeave);

    // Draw 4-point sparkle star
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

    // Fast 60+ FPS Render loop
    const render = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      ctx.clearRect(0, 0, width, height);

      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= 1;

        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        // Physics update
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.rotation += p.rotSpeed;

        const lifeRatio = p.life / p.maxLife;
        const alpha = Math.min(1, Math.max(0, lifeRatio * 1.15));
        p.size = p.initialSize * (0.35 + 0.65 * lifeRatio);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;

        if (p.shape === '4-point-star') {
          draw4PointStar(ctx, p.x, p.y, 4, p.size * 2.2, p.size * 0.48, p.rotation);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('pointerup', handlePointerLeave);
      document.removeEventListener('mouseleave', handlePointerLeave);
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
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
        transform: 'translate3d(0, 0, 0)',
        willChange: 'transform, opacity',
        backfaceVisibility: 'hidden',
      }}
    />
  );
};
