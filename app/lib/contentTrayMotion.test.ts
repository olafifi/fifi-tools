import { describe, expect, it } from 'vitest';
import { contentTrayMotion } from './contentTrayMotion';

describe('content tray motion state', () => {
  it('reacts to new content before the open state', () => {
    expect(contentTrayMotion(1, 2, false)).toBe('receiving');
    expect(contentTrayMotion(1, 2, true)).toBe('receiving');
  });

  it('uses opening only while open and otherwise idles', () => {
    expect(contentTrayMotion(2, 2, true)).toBe('opening');
    expect(contentTrayMotion(2, 2, false)).toBe('idle');
    expect(contentTrayMotion(3, 2, false)).toBe('idle');
  });
});
