import { expect, it } from 'vitest';
import { readJson } from '../src/http.js';

it('stops reading a streaming JSON body as soon as it exceeds the limit', async () => {
  const encoder = new TextEncoder();
  const chunks = [
    encoder.encode('x'.repeat(700)),
    encoder.encode('x'.repeat(700)),
    encoder.encode('x'.repeat(700))
  ];
  let pulls = 0;
  let cancelled = false;
  const body = new ReadableStream({
    pull(controller) {
      const chunk = chunks[pulls];
      pulls += 1;
      if (chunk) controller.enqueue(chunk);
      else controller.close();
    },
    cancel() {
      cancelled = true;
    }
  });
  const request = new Request('https://worker.test/scores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });

  await expect(readJson(request)).rejects.toMatchObject({ status: 413 });
  expect(pulls).toBeLessThan(4);
  expect(cancelled).toBe(true);
});

it('parses valid JSON assembled from multiple stream chunks', async () => {
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode('{"nickname":"蛋'));
      controller.enqueue(encoder.encode('白","score":42}'));
      controller.close();
    }
  });
  const request = new Request('https://worker.test/scores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });

  await expect(readJson(request)).resolves.toEqual({ nickname: '蛋白', score: 42 });
});
