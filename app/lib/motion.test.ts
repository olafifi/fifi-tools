import { describe, expect, it } from 'vitest';
import { createTrailSampler, frameSmoothingAlpha } from './motion';

describe('frameSmoothingAlpha', () => {
  it('preserves the current four-percent response at 60 Hz', () => {
    expect(frameSmoothingAlpha(1000 / 60)).toBeCloseTo(0.04, 8);
  });

  it('covers the same distance over equal elapsed time at different frame rates', () => {
    const alpha60 = frameSmoothingAlpha(1000 / 60);
    const alpha30 = frameSmoothingAlpha(1000 / 30);
    const remainingAfterFour60HzFrames = (1 - alpha60) ** 4;
    const remainingAfterTwo30HzFrames = (1 - alpha30) ** 2;

    expect(remainingAfterFour60HzFrames).toBeCloseTo(0.84934656, 8);
    expect(remainingAfterTwo30HzFrames).toBeCloseTo(remainingAfterFour60HzFrames, 8);
  });

  it('ignores negative time and clamps a background-tab jump', () => {
    expect(frameSmoothingAlpha(-20)).toBe(0);
    expect(frameSmoothingAlpha(5000)).toBeCloseTo(frameSmoothingAlpha(100), 8);
  });
});

describe('createTrailSampler', () => {
  it('emits the first pointer position immediately', () => {
    const sampler = createTrailSampler();
    expect(sampler.push({ x: 24, y: 36, time: 10 })).toEqual([{ x: 24, y: 36 }]);
  });

  it('produces the same path when browser pointer events are sparse or dense', () => {
    const sparse = createTrailSampler();
    const dense = createTrailSampler();

    const sparsePoints = [
      ...sparse.push({ x: 0, y: 0, time: 0 }),
      ...sparse.push({ x: 180, y: 0, time: 180 }),
    ];
    const densePoints = [
      ...dense.push({ x: 0, y: 0, time: 0 }),
      ...dense.push({ x: 60, y: 0, time: 60 }),
      ...dense.push({ x: 120, y: 0, time: 120 }),
      ...dense.push({ x: 180, y: 0, time: 180 }),
    ];

    expect(sparsePoints).toEqual([
      { x: 0, y: 0 },
      { x: 60, y: 0 },
      { x: 120, y: 0 },
      { x: 180, y: 0 },
    ]);
    expect(densePoints).toEqual(sparsePoints);
  });

  it('does not repeat cats while the pointer is stationary', () => {
    const sampler = createTrailSampler();
    sampler.push({ x: 50, y: 50, time: 0 });
    expect(sampler.push({ x: 50, y: 50, time: 240 })).toEqual([]);
  });

  it('caps a single abnormal jump without retaining a backlog', () => {
    const sampler = createTrailSampler();
    sampler.push({ x: 0, y: 0, time: 0 });
    expect(sampler.push({ x: 10_000, y: 0, time: 1000 })).toHaveLength(12);
    expect(sampler.push({ x: 10_000, y: 0, time: 1060 })).toEqual([]);
  });

  it('starts a fresh path after reset', () => {
    const sampler = createTrailSampler();
    sampler.push({ x: 0, y: 0, time: 0 });
    sampler.reset();
    expect(sampler.push({ x: 900, y: 400, time: 500 })).toEqual([{ x: 900, y: 400 }]);
  });
});
