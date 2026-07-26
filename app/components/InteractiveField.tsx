import { useEffect, useRef } from 'react';
import { frameSmoothingAlpha } from '../lib/motion';

type PointerState = { x: number; y: number; tx: number; ty: number };

export function InteractiveField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (navigator.userAgent.includes('jsdom')) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const pointer: PointerState = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    let width = window.innerWidth;
    let height = window.innerHeight;
    let frame = 0;
    let previousFrameTime: number | null = null;

    const resize = () => {
      const density = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * density;
      canvas.height = height * density;
      context.setTransform(density, 0, 0, density, 0, 0);
    };

    const path = (cx: number, cy: number, radius: number, time: number, seed: number, scale = 1) => {
      const points: Array<[number, number]> = [];
      for (let i = 0; i < 64; i += 1) {
        const angle = i / 64 * Math.PI * 2;
        const ripple = radius * scale * (
          1 + 0.13 * Math.sin(angle * 3 + time + seed) + 0.07 * Math.sin(angle * 5 - time * 0.7 + seed * 2)
        );
        let x = cx + Math.cos(angle) * ripple;
        let y = cy + Math.sin(angle) * ripple * 0.68;
        const dx = x - pointer.x * width;
        const dy = y - pointer.y * height;
        const distance = Math.hypot(dx, dy);
        const push = Math.max(0, 1 - distance / 255) * 39 * scale;
        x += dx / (distance || 1) * push;
        y += dy / (distance || 1) * push;
        points.push([x, y]);
      }
      context.beginPath();
      points.forEach((point, index) => {
        const next = points[(index + 1) % points.length];
        const midX = (point[0] + next[0]) / 2;
        const midY = (point[1] + next[1]) / 2;
        if (index === 0) context.moveTo(midX, midY);
        else context.quadraticCurveTo(point[0], point[1], midX, midY);
      });
      context.closePath();
    };

    const blob = (cx: number, cy: number, radius: number, time: number, seed: number, color: string) => {
      path(cx, cy, radius, time, seed);
      context.fillStyle = color;
      context.fill();
      context.lineWidth = 5;
      context.strokeStyle = '#090806';
      context.stroke();
      for (let ring = 1; ring < 5; ring += 1) {
        path(cx, cy, radius, time, seed, 1 - ring * 0.1);
        context.lineWidth = ring === 1 ? 2 : 1;
        context.strokeStyle = ring % 2 ? 'rgba(239,227,201,.68)' : 'rgba(9,8,6,.62)';
        context.stroke();
      }
    };

    const draw = (milliseconds: number) => {
      const deltaMs = previousFrameTime === null ? 1000 / 60 : milliseconds - previousFrameTime;
      previousFrameTime = milliseconds;
      const smoothingAlpha = frameSmoothingAlpha(deltaMs);
      const time = milliseconds * 0.0003;
      pointer.x += (pointer.tx - pointer.x) * smoothingAlpha;
      pointer.y += (pointer.ty - pointer.y) * smoothingAlpha;
      context.fillStyle = '#171411';
      context.fillRect(0, 0, width, height);
      const base = Math.min(width, height);
      blob(width * 0.12, height * 0.32, base * 0.42, time, 1.1, '#8f2f24');
      blob(width * 0.78, height * 0.2, base * 0.44, -time * 0.78, 3.2, '#376b61');
      blob(width * 0.82, height * 0.91, base * 0.33, time * 0.62, 5.3, '#d1a447');
      frame = window.requestAnimationFrame(draw);
    };

    const move = (event: PointerEvent) => {
      pointer.tx = event.clientX / width;
      pointer.ty = event.clientY / height;
    };

    const handleResize = () => {
      resize();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('pointermove', move);
    frame = window.requestAnimationFrame(draw);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', move);
    };
  }, []);

  return <canvas className="interactive-field" ref={canvasRef} aria-hidden="true" />;
}
