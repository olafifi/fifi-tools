import { env, exports } from 'cloudflare:workers';
import { beforeEach, expect, it } from 'vitest';
import worker from '../src/index.js';

const productionOrigin = 'https://olafifi.github.io';
const leaderboardUrl = 'https://worker.test/api/v1/leaderboards/merge-danbai';

beforeEach(async () => {
  await env.DB.exec('DELETE FROM leaderboard_scores; DELETE FROM submission_windows;');
});

function postScore(body, headers = {}) {
  return exports.default.fetch(new Request(`${leaderboardUrl}/scores`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: productionOrigin,
      'CF-Connecting-IP': '203.0.113.20',
      ...headers
    },
    body: JSON.stringify(body)
  }));
}

it('reports health with production CORS', async () => {
  const response = await exports.default.fetch(new Request('https://worker.test/healthz', {
    headers: { Origin: productionOrigin }
  }));
  expect(response.status).toBe(200);
  expect(response.headers.get('access-control-allow-origin')).toBe(productionOrigin);
  expect(await response.json()).toEqual({ ok: true });
});

it('reports unavailable when the database binding is missing', async () => {
  const response = await worker.fetch(new Request('https://worker.test/healthz'), {
    ALLOWED_ORIGIN: productionOrigin,
    SOURCE_HASH_SECRET: 'test-secret'
  });
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ error: '排行榜服务尚未准备好。' });
});

it('answers the production preflight request', async () => {
  const response = await exports.default.fetch(new Request(`${leaderboardUrl}/scores`, {
    method: 'OPTIONS',
    headers: { Origin: productionOrigin }
  }));
  expect(response.status).toBe(204);
  expect(response.headers.get('access-control-allow-methods')).toBe('GET, POST, OPTIONS');
  expect(response.headers.get('access-control-allow-origin')).toBe(productionOrigin);
});

it('returns an empty top ten and zero cutoff', async () => {
  const response = await exports.default.fetch(`${leaderboardUrl}?limit=10`);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ entries: [], cutoffScore: 0 });
});

it('normalizes and submits a score', async () => {
  const response = await postScore({ nickname: ' ＦｉＦｉ ', score: 56900 });
  const body = await response.json();
  expect(response.status).toBe(201);
  expect(response.headers.get('access-control-allow-origin')).toBe(productionOrigin);
  expect(body.rank).toBe(1);
  expect(body.saved).toMatchObject({ nickname: 'FiFi', score: 56900 });
  expect(body.entries[0]).toMatchObject({ rank: 1, nickname: 'FiFi', score: 56900 });
});

it('defaults leaderboard reads to ten entries when limit is omitted', async () => {
  await postScore({ nickname: '一号', score: 100 }, { 'CF-Connecting-IP': '203.0.113.21' });
  await postScore({ nickname: '二号', score: 200 }, { 'CF-Connecting-IP': '203.0.113.22' });
  const response = await exports.default.fetch(leaderboardUrl);
  expect((await response.json()).entries).toHaveLength(2);
});

it('rejects forbidden origins and invalid input', async () => {
  const forbidden = await postScore(
    { nickname: '猫', score: 1 },
    { Origin: 'https://example.com' }
  );
  expect(forbidden.status).toBe(403);
  expect(forbidden.headers.get('access-control-allow-origin')).toBeNull();
  expect((await postScore({ nickname: '<猫>', score: 1 })).status).toBe(400);
  expect((await postScore({ nickname: '猫', score: -1 })).status).toBe(400);
});

it('rejects unsupported methods and oversized JSON', async () => {
  const method = await exports.default.fetch(new Request(leaderboardUrl, { method: 'DELETE' }));
  expect(method.status).toBe(405);
  expect(method.headers.get('allow')).toBe('GET, OPTIONS');
  const oversized = await postScore({ nickname: '猫', score: 1, padding: 'x'.repeat(1100) });
  expect(oversized.status).toBe(413);
});

it('limits the eleventh submission from one source', async () => {
  for (let index = 0; index < 10; index += 1) {
    expect((await postScore({ nickname: `猫${index}`, score: index })).status).toBe(201);
  }
  expect((await postScore({ nickname: '超额猫', score: 11 })).status).toBe(429);
});
