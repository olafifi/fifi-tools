import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { scoreRank, submitScore, topScores } from '../src/store.js';

const gameId = 'merge-danbai';

beforeEach(async () => {
  await env.DB.exec('DELETE FROM leaderboard_scores; DELETE FROM submission_windows;');
});

describe('D1 leaderboard store', () => {
  it('keeps only a nickname maximum and preserves the earlier equal score', async () => {
    await submitScore(env.DB, { gameId, nickname: 'Fifi', nicknameKey: 'fifi', score: 100, achievedAt: '2026-07-24T00:00:00.000Z' });
    await submitScore(env.DB, { gameId, nickname: 'Fifi', nicknameKey: 'fifi', score: 80, achievedAt: '2026-07-24T00:01:00.000Z' });
    await submitScore(env.DB, { gameId, nickname: 'Fifi', nicknameKey: 'fifi', score: 100, achievedAt: '2026-07-24T00:02:00.000Z' });
    expect(await topScores(env.DB, { gameId, limit: 10 })).toEqual([
      { rank: 1, nickname: 'Fifi', score: 100, achievedAt: '2026-07-24T00:00:00.000Z' }
    ]);
  });

  it('sorts high scores first, then earlier ties', async () => {
    await submitScore(env.DB, { gameId, nickname: '二号', nicknameKey: '二号', score: 200, achievedAt: '2026-07-24T00:02:00.000Z' });
    await submitScore(env.DB, { gameId, nickname: '一号', nicknameKey: '一号', score: 200, achievedAt: '2026-07-24T00:01:00.000Z' });
    await submitScore(env.DB, { gameId, nickname: '三号', nicknameKey: '三号', score: 100, achievedAt: '2026-07-24T00:00:00.000Z' });
    expect((await topScores(env.DB, { gameId, limit: 2 })).map((entry) => entry.nickname)).toEqual(['一号', '二号']);
    expect(await scoreRank(env.DB, { gameId, nicknameKey: '三号' })).toBe(3);
  });

  it('uses insertion order when scores and timestamps are identical', async () => {
    const achievedAt = '2026-07-24T00:00:00.000Z';
    await submitScore(env.DB, { gameId, nickname: '先到', nicknameKey: '先到', score: 200, achievedAt });
    await submitScore(env.DB, { gameId, nickname: '后到', nicknameKey: '后到', score: 200, achievedAt });
    expect((await topScores(env.DB, { gameId, limit: 10 })).map((entry) => entry.nickname)).toEqual(['先到', '后到']);
    expect(await scoreRank(env.DB, { gameId, nicknameKey: '先到' })).toBe(1);
    expect(await scoreRank(env.DB, { gameId, nicknameKey: '后到' })).toBe(2);
  });
});
