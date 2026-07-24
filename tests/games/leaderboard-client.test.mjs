import assert from 'node:assert/strict';
import test from 'node:test';
import { createLeaderboardClient } from '../../public/games/merge-danbai/leaderboard-client.js';

test('loads the top ten from the configured origin', async () => {
  const calls = [];
  const client = createLeaderboardClient({
    apiBase: 'https://scores.example.test/',
    fetchImpl: async (url, options) => {
      calls.push([url, options]);
      return { ok: true, json: async () => ({ entries: [], cutoffScore: 0 }) };
    }
  });
  assert.deepEqual(await client.load(), { entries: [], cutoffScore: 0 });
  assert.equal(calls[0][0], 'https://scores.example.test/api/v1/leaderboards/merge-danbai?limit=10');
});

test('submits nickname and integer score as JSON', async () => {
  let request;
  const client = createLeaderboardClient({
    apiBase: 'https://scores.example.test',
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ rank: 1, entries: [], cutoffScore: 0 }) };
    }
  });
  await client.submit({ nickname: '蛋白王', score: 56900 });
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.body, JSON.stringify({ nickname: '蛋白王', score: 56900 }));
});

test('surfaces the server error message', async () => {
  const client = createLeaderboardClient({
    apiBase: 'https://scores.example.test',
    fetchImpl: async () => ({
      ok: false,
      json: async () => ({ error: '名字需要是 1–12 个字符。' })
    })
  });
  await assert.rejects(() => client.submit({ nickname: '', score: 1 }), /名字需要是 1–12 个字符/);
});

test('aborts a leaderboard request that exceeds the timeout', async () => {
  const client = createLeaderboardClient({
    apiBase: 'https://scores.example.test',
    timeoutMs: 10,
    fetchImpl: async (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => {
        reject(new DOMException('aborted', 'AbortError'));
      });
    })
  });

  await assert.rejects(() => client.load(), /排行榜连接超时，请重试/);
});
