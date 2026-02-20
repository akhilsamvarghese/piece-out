import { useEffect, useRef } from 'react';

const COLORS = ['#ff00a8', '#24cfef', '#eedc96', '#f1f1f1', '#070707', '#ff4fc5'];

export default function EffectsLayer({ triggerKey }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!triggerKey || !canvasRef.current) {
      return undefined;
    }

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    let rafId = 0;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const particles = Array.from({ length: 150 }, (_, index) => {
      const spread = (index / 150) * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      return {
        x: window.innerWidth * 0.5,
        y: window.innerHeight * 0.24,
        vx: Math.cos(spread) * speed + (Math.random() - 0.5) * 1.6,
        vy: Math.sin(spread) * speed - (2 + Math.random() * 3),
        width: 5 + Math.random() * 5,
        height: 4 + Math.random() * 4,
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.25,
        color: COLORS[index % COLORS.length],
        life: 1250 + Math.random() * 520
      };
    });

    const startedAt = performance.now();
    const duration = 1850;

    const frame = (now) => {
      const elapsed = now - startedAt;
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);

      for (const particle of particles) {
        const local = Math.max(0, Math.min(1, elapsed / particle.life));
        if (local >= 1) {
          continue;
        }

        particle.vy += 0.08;
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.rotation += particle.spin;

        context.save();
        context.translate(particle.x, particle.y);
        context.rotate(particle.rotation);
        context.globalAlpha = 1 - local;
        context.fillStyle = particle.color;
        context.fillRect(-particle.width / 2, -particle.height / 2, particle.width, particle.height);
        context.strokeStyle = '#070707';
        context.lineWidth = 1;
        context.strokeRect(-particle.width / 2, -particle.height / 2, particle.width, particle.height);
        context.restore();
      }

      if (elapsed < duration) {
        rafId = requestAnimationFrame(frame);
      } else {
        context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      }
    };

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      window.removeEventListener('resize', resize);
    };
  }, [triggerKey]);

  return <canvas className="effects-layer" ref={canvasRef} aria-hidden="true" />;
}
