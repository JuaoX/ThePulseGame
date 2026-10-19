import { useEffect, useImperativeHandle, useRef, forwardRef } from 'react';

export interface ArenaCanvasFXHandle {
  spawnShockwave: (colorHex: string) => void;
  spawnBurst: (colorHex: string, count?: number) => void;
  spawnConfettiShower: () => void;
}

interface RingParticle {
  x: number;
  y: number;
  r: number;
  maxR: number;
  alpha: number;
  color: string;
}

interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  size: number;
  gravity?: number;
}

const CONFETTI_COLORS = ['#22D3EE', '#6366F1', '#10B981', '#F59E0B', '#F43F5E', '#A855F7'];

export const ArenaCanvasFX = forwardRef<ArenaCanvasFXHandle, { reducedMotion: boolean }>(
  ({ reducedMotion }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const ringsRef = useRef<RingParticle[]>([]);
    const sparksRef = useRef<SparkParticle[]>([]);

    useImperativeHandle(ref, () => ({
      spawnShockwave(colorHex: string) {
        if (reducedMotion || !canvasRef.current) return;
        const c = canvasRef.current;
        ringsRef.current.push({
          x: c.width / 2,
          y: c.height * 0.35,
          r: 65,
          maxR: Math.max(c.width, c.height) * 0.5,
          alpha: 0.6,
          color: colorHex,
        });
      },
      spawnBurst(colorHex: string, count = 22) {
        if (reducedMotion || !canvasRef.current) return;
        const c = canvasRef.current;
        const cx = c.width / 2;
        const cy = c.height * 0.35;
        for (let i = 0; i < count; i++) {
          const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.35;
          const spd = 2.5 + Math.random() * 5.5;
          sparksRef.current.push({
            x: cx + Math.cos(ang) * 45,
            y: cy + Math.sin(ang) * 45,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            alpha: 0.95,
            color: colorHex,
            size: 2.2 + Math.random() * 3,
          });
        }
      },
      spawnConfettiShower() {
        if (reducedMotion || !canvasRef.current) return;
        const c = canvasRef.current;
        for (let i = 0; i < 60; i++) {
          sparksRef.current.push({
            x: c.width * (0.15 + Math.random() * 0.7),
            y: c.height * 0.22,
            vx: (Math.random() - 0.5) * 10,
            vy: -4 - Math.random() * 6,
            alpha: 1,
            color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            size: 3 + Math.random() * 3.5,
            gravity: 0.18,
          });
        }
      },
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const handleResize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      };

      handleResize();
      window.addEventListener('resize', handleResize);

      let rafId = 0;
      const render = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = ringsRef.current.length - 1; i >= 0; i--) {
          const rg = ringsRef.current[i];
          rg.r += (rg.maxR - rg.r) * 0.08 + 2.5;
          rg.alpha *= 0.92;
          ctx.beginPath();
          ctx.arc(rg.x, rg.y, rg.r, 0, Math.PI * 2);
          ctx.strokeStyle = rg.color;
          ctx.globalAlpha = rg.alpha;
          ctx.lineWidth = 3;
          ctx.stroke();
          if (rg.alpha < 0.02) ringsRef.current.splice(i, 1);
        }

        for (let i = sparksRef.current.length - 1; i >= 0; i--) {
          const sp = sparksRef.current[i];
          sp.x += sp.vx;
          sp.y += sp.vy;
          if (sp.gravity) {
            sp.vy += sp.gravity;
            sp.vx *= 0.98;
            sp.alpha *= 0.985;
          } else {
            sp.vx *= 0.95;
            sp.vy *= 0.95;
            sp.alpha *= 0.91;
          }
          ctx.fillStyle = sp.color;
          ctx.globalAlpha = sp.alpha;
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
          ctx.fill();
          if (sp.alpha < 0.03) sparksRef.current.splice(i, 1);
        }
        ctx.globalAlpha = 1;
        rafId = requestAnimationFrame(render);
      };

      rafId = requestAnimationFrame(render);
      return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(rafId);
      };
    }, []);

    return <canvas ref={canvasRef} className="arena-fx-canvas" />;
  }
);