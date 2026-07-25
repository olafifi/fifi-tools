import { describe, expect, it } from 'vitest';
import { buildZipperGeometry } from './zipperGeometry';

describe('buildZipperGeometry', () => {
  it('clamps progress and keeps the content clip equal to the visible cavity', () => {
    const closed = buildZipperGeometry(-1);
    const open = buildZipperGeometry(2);

    expect(closed.cavityPath).toContain('L660.00 240.00');
    expect(open.cavityPath).toContain('L705.00 548.00');
    expect(closed.clipPath).toBe(closed.cavityPath);
    expect(open.clipPath).toBe(open.cavityPath);
  });

  it('places the half-open lower edge at the hand-derived midpoint', () => {
    const half = buildZipperGeometry(0.5);
    expect(half.cavityPath).toContain('L682.50 394.00');
  });
});
