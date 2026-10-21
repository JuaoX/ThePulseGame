import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export interface ArenaCanvasFXHandle {
  spawnShockwave: (color: string) => void;
  spawnBurst: (color: string, count?: number) => void;
  spawnConfettiShower: () => void;
}
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; }

// One short, event-bound celebration. No animation work while the canvas is idle.
export const ArenaCanvasFX = forwardRef<ArenaCanvasFXHandle, { reducedMotion: boolean }>(({ reducedMotion }, ref) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const frame = useRef(0);
  const animate = useRef<() => void>(() => {});
  const motion = useRef(reducedMotion);
  motion.current = reducedMotion;
  useEffect(() => {
    const element = canvas.current, context = element?.getContext('2d');
    if (!element || !context) return;
    let last = 0;
    const clear = () => { cancelAnimationFrame(frame.current); frame.current = 0; particles.current = []; context.clearRect(0, 0, element.width, element.height); };
    const resize = () => { clear(); element.width = innerWidth; element.height = innerHeight; };
    resize();
    const render = (time: number) => {
      frame.current = 0;
      const dt = Math.min(2, (time - (last || time - 16)) / 16.67); last = time;
      context.clearRect(0, 0, element.width, element.height);
      particles.current = particles.current.filter(particle => particle.life > 0);
      for (const p of particles.current) {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 0.12 * dt; p.life -= 0.035 * dt;
        context.globalAlpha = Math.max(0, p.life); context.fillStyle = p.color;
        context.fillRect(p.x, p.y, 3, 5);
      }
      context.globalAlpha = 1;
      if (particles.current.length && !motion.current && !document.hidden) frame.current = requestAnimationFrame(render);
      else { last = 0; clear(); }
    };
    animate.current = () => { if (!frame.current) frame.current = requestAnimationFrame(render); };
    const visibility = () => { if (document.hidden) clear(); };
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', visibility);
    return () => { clear(); window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', visibility); animate.current = () => {}; };
  }, []);
  useEffect(() => { if (reducedMotion) particles.current = []; }, [reducedMotion]);
  useImperativeHandle(ref, () => {
    const spawn = (color: string, count: number) => {
      if (motion.current || document.hidden || !canvas.current) return;
      for (let i = 0; i < Math.min(count, 40); i++) {
        const angle = Math.PI * 2 * i / count;
        particles.current.push({ x: innerWidth / 2, y: Math.min(innerHeight * 0.45, 380), vx: Math.cos(angle) * (2 + Math.random() * 3), vy: Math.sin(angle) * 4 - 2, life: 1, color });
      }
      particles.current = particles.current.slice(-100); animate.current();
    };
    return { spawnShockwave: color => spawn(color, 14), spawnBurst: (color, count = 12) => spawn(color, count), spawnConfettiShower: () => spawn('#55d8e8', 28) };
  }, []);
  return <canvas ref={canvas} className="arena-fx-canvas" aria-hidden="true" />;
});
