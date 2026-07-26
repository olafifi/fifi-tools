import { useEffect, useRef } from 'react';
import { createTrailSampler } from '../lib/motion';

const CAT_SVG = '<svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M8.4 15.2 7.2 5.8l8 5.4a16.7 16.7 0 0 1 9.6 0l8-5.4-1.2 9.5a14 14 0 0 1 2.1 7.3c0 8.2-5.5 12.2-13.7 12.2S6.3 30.8 6.3 22.6c0-2.8.7-5.3 2.1-7.4Z" fill="rgba(239,227,201,.16)" stroke="currentColor" stroke-width="2.3" stroke-linejoin="round"/><circle cx="14.8" cy="22.2" r="1.45" fill="currentColor"/><circle cx="25.2" cy="22.2" r="1.45" fill="currentColor"/><path d="m18.4 25.3 1.6 1.2 1.6-1.2M20 26.5v1.8m0 0c-1.6 1.4-3.2 1.4-4.7.4m4.7-.4c1.6 1.4 3.2 1.4 4.7.4" stroke="currentColor" stroke-width="1.35" stroke-linecap="round"/></svg>';

export function CatCursor() {
  const layerRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (navigator.userAgent.includes('jsdom')) return;
    const sampler = createTrailSampler();
    let wake = 0;
    const colors = ['#d1a447', '#efe3c9', '#a43828', '#6f9b86'];

    const appendCat = (x: number, y: number, layer: HTMLDivElement) => {
      const cat = document.createElement('i');
      cat.className = 'wake-cat';
      cat.style.left = `${x}px`;
      cat.style.top = `${y}px`;
      cat.style.color = colors[wake % colors.length];
      cat.innerHTML = CAT_SVG;
      layer.append(cat);
      cat.addEventListener('animationend', () => cat.remove(), { once: true });
      wake += 1;
    };

    const move = (event: PointerEvent) => {
      const layer = layerRef.current;
      const core = coreRef.current;
      if (!core || !layer) return;
      core.style.left = `${event.clientX}px`;
      core.style.top = `${event.clientY}px`;
      core.style.opacity = '1';
      const coalesced = typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : [];
      const events = coalesced.length > 0 ? coalesced : [event];
      events.forEach((sample) => {
        sampler.push({ x: sample.clientX, y: sample.clientY, time: sample.timeStamp }).forEach((point) => {
          appendCat(point.x, point.y, layer);
        });
      });
    };
    const leave = () => {
      if (coreRef.current) coreRef.current.style.opacity = '0';
      sampler.reset();
    };

    window.addEventListener('pointermove', move);
    document.documentElement.addEventListener('pointerleave', leave);
    return () => {
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', leave);
      layerRef.current?.replaceChildren();
    };
  }, []);

  return <><div className="wake-layer" ref={layerRef} aria-hidden="true" /><span className="cursor-core" ref={coreRef} aria-hidden="true" /></>;
}
