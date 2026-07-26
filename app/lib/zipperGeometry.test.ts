import { describe, expect, it } from 'vitest';
import { buildZipperGeometry } from './zipperGeometry';

describe('buildZipperGeometry', () => {
  it('clamps progress and preserves the visible cavity extents', () => {
    const closed = buildZipperGeometry(-1);
    const open = buildZipperGeometry(2);

    expect(closed.cavityPath).toContain('L660.00 240.00');
    expect(open.cavityPath).toContain('L705.00 548.00');
  });

  it('places the half-open lower edge at the hand-derived midpoint', () => {
    const half = buildZipperGeometry(0.5);
    expect(half.cavityPath).toContain('L682.50 394.00');
  });

  it('keeps the content clip inside the visible lower zipper edge', () => {
    const half = buildZipperGeometry(0.5);
    const open = buildZipperGeometry(1);

    expect(half.cavityPath).toContain('L682.50 394.00');
    expect(half.clipPath).toContain('L682.50 376.00');
    expect(open.cavityPath).toContain('L705.00 548.00');
    expect(open.clipPath).toContain('L705.00 530.00');
    expect(open.clipPath).not.toBe(open.cavityPath);
  });
});
