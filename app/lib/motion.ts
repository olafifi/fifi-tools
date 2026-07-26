const FRAME_MS = 1000 / 60;
const PER_FRAME_REMAINDER = 0.96;

export function frameSmoothingAlpha(deltaMs: number, maxDeltaMs = 100) {
  const elapsed = Math.min(Math.max(deltaMs, 0), maxDeltaMs);
  return 1 - Math.pow(PER_FRAME_REMAINDER, elapsed / FRAME_MS);
}

export type PointerSample = { x: number; y: number; time: number };
export type PointerPoint = { x: number; y: number };
export type TrailSamplingOptions = {
  intervalMs: number;
  minDistance: number;
  maxPointsPerPush: number;
};

export type TrailSampler = {
  push: (sample: PointerSample) => PointerPoint[];
  reset: () => void;
};

const DEFAULT_TRAIL_OPTIONS: TrailSamplingOptions = {
  intervalMs: 60,
  minDistance: 9,
  maxPointsPerPush: 12,
};

export function createTrailSampler(options: Partial<TrailSamplingOptions> = {}): TrailSampler {
  const config = { ...DEFAULT_TRAIL_OPTIONS, ...options };
  let previousSample: PointerSample | null = null;
  let lastPoint: PointerPoint | null = null;
  let nextSampleTime = 0;

  const reset = () => {
    previousSample = null;
    lastPoint = null;
    nextSampleTime = 0;
  };

  const push = (incoming: PointerSample) => {
    if (!previousSample) {
      previousSample = incoming;
      lastPoint = { x: incoming.x, y: incoming.y };
      nextSampleTime = incoming.time + config.intervalMs;
      return [{ ...lastPoint }];
    }

    const sample = { ...incoming, time: Math.max(incoming.time, previousSample.time) };
    const duration = sample.time - previousSample.time;
    const points: PointerPoint[] = [];

    while (duration > 0 && nextSampleTime <= sample.time && points.length < config.maxPointsPerPush) {
      const ratio = Math.min(1, Math.max(0, (nextSampleTime - previousSample.time) / duration));
      const candidate = {
        x: previousSample.x + (sample.x - previousSample.x) * ratio,
        y: previousSample.y + (sample.y - previousSample.y) * ratio,
      };
      const distance = lastPoint ? Math.hypot(candidate.x - lastPoint.x, candidate.y - lastPoint.y) : Infinity;
      if (distance >= config.minDistance) {
        points.push(candidate);
        lastPoint = candidate;
      }
      nextSampleTime += config.intervalMs;
    }

    if (points.length === config.maxPointsPerPush && nextSampleTime <= sample.time) {
      lastPoint = { x: sample.x, y: sample.y };
      nextSampleTime = sample.time + config.intervalMs;
    }
    previousSample = sample;
    return points;
  };

  return { push, reset };
}
