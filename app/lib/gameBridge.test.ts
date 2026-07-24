import { describe, expect, it, vi } from 'vitest';
import { postGameCommand } from './gameBridge';

describe('postGameCommand', () => {
  it('posts a namespaced command to the same origin', () => {
    const postMessage = vi.fn();
    const frame = { contentWindow: { postMessage } } as unknown as HTMLIFrameElement;

    postGameCommand(frame, 'destroy');

    expect(postMessage).toHaveBeenCalledWith(
      { source: 'fifi-tools', type: 'destroy' },
      window.location.origin
    );
  });
});
