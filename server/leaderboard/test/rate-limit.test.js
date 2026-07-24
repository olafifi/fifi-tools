import { env } from 'cloudflare:workers';
import { beforeEach, expect, it } from 'vitest';
import { enforceSubmitLimit, hashSource } from '../src/rate-limit.js';

beforeEach(async () => {
  await env.DB.exec('DELETE FROM submission_windows;');
});

it('hashes a source deterministically without storing the raw value', async () => {
  const first = await hashSource('203.0.113.10', 'test-secret');
  const second = await hashSource('203.0.113.10', 'test-secret');
  expect(first).toBe(second);
  expect(first).toMatch(/^[a-f0-9]{64}$/);
  expect(first).not.toContain('203.0.113.10');
});

it('allows ten submissions, rejects later attempts without more writes, and resets next window', async () => {
  const sourceKey = await hashSource('203.0.113.10', 'test-secret');
  for (let index = 0; index < 10; index += 1) {
    await enforceSubmitLimit({ db: env.DB, sourceKey, nowMs: 0, limit: 10, windowMs: 300_000 });
  }
  await expect(enforceSubmitLimit({ db: env.DB, sourceKey, nowMs: 0, limit: 10, windowMs: 300_000 }))
    .rejects.toMatchObject({ status: 429 });
  await expect(enforceSubmitLimit({ db: env.DB, sourceKey, nowMs: 0, limit: 10, windowMs: 300_000 }))
    .rejects.toMatchObject({ status: 429 });
  const blockedWindow = await env.DB.prepare(`
    SELECT submission_count
    FROM submission_windows
    WHERE source_key = ?
  `).bind(sourceKey).first();
  expect(blockedWindow.submission_count).toBe(10);
  await expect(enforceSubmitLimit({ db: env.DB, sourceKey, nowMs: 300_000, limit: 10, windowMs: 300_000 }))
    .resolves.toBeUndefined();
});
