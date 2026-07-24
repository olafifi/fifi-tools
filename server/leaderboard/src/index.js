import { HttpError } from './errors.js';
import {
  assertAllowedOrigin,
  errorResponse,
  jsonResponse,
  preflightResponse,
  readJson
} from './http.js';
import { normalizeNickname } from './nickname.js';
import { enforceSubmitLimit, hashSource } from './rate-limit.js';
import { scoreRank, submitScore, topScores } from './store.js';

const GAME_ID = 'merge-danbai';
const leaderboardPath = '/api/v1/leaderboards/merge-danbai';

function cutoff(entries) {
  return entries.length < 10 ? 0 : entries.at(-1).score;
}

function methodNotAllowed(context, allow) {
  return jsonResponse(
    { error: 'Method not allowed' },
    { ...context, status: 405, headers: { Allow: allow } }
  );
}

async function assertServiceReady(env) {
  if (!env.DB || !env.SOURCE_HASH_SECRET) {
    throw new HttpError(503, '排行榜服务尚未准备好。');
  }
  try {
    await env.DB.prepare('SELECT 1 FROM leaderboard_scores LIMIT 1').first();
  } catch {
    throw new HttpError(503, '排行榜服务尚未准备好。');
  }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('origin') || '';
    const context = {
      origin,
      allowedOrigin: env.ALLOWED_ORIGIN,
      requestId: request.headers.get('cf-ray') || 'unavailable'
    };
    try {
      assertAllowedOrigin(origin, env.ALLOWED_ORIGIN);
      if (request.method === 'OPTIONS') {
        return preflightResponse(origin, env.ALLOWED_ORIGIN);
      }

      const url = new URL(request.url);
      if (url.pathname === '/healthz') {
        if (request.method !== 'GET') return methodNotAllowed(context, 'GET, OPTIONS');
        await assertServiceReady(env);
        return jsonResponse({ ok: true }, context);
      }

      if (url.pathname === leaderboardPath) {
        if (request.method !== 'GET') return methodNotAllowed(context, 'GET, OPTIONS');
        const rawLimit = url.searchParams.get('limit');
        const requestedLimit = rawLimit === null ? 10 : Number(rawLimit);
        const limit = Number.isFinite(requestedLimit)
          ? Math.min(10, Math.max(1, Math.trunc(requestedLimit)))
          : 10;
        const entries = await topScores(env.DB, { gameId: GAME_ID, limit });
        return jsonResponse({ entries, cutoffScore: cutoff(entries) }, context);
      }

      if (url.pathname === `${leaderboardPath}/scores`) {
        if (request.method !== 'POST') return methodNotAllowed(context, 'POST, OPTIONS');
        const body = await readJson(request);
        const { nickname, nicknameKey } = normalizeNickname(body?.nickname);
        if (!Number.isSafeInteger(body?.score) || body.score < 0 || body.score > 1_000_000_000) {
          throw new HttpError(400, '分数格式不正确。');
        }
        const sourceKey = await hashSource(
          request.headers.get('CF-Connecting-IP') || 'unknown',
          env.SOURCE_HASH_SECRET
        );
        await enforceSubmitLimit({ db: env.DB, sourceKey, nowMs: Date.now() });
        const saved = await submitScore(env.DB, {
          gameId: GAME_ID,
          nickname,
          nicknameKey,
          score: body.score,
          achievedAt: new Date().toISOString()
        });
        const entries = await topScores(env.DB, { gameId: GAME_ID, limit: 10 });
        const rank = await scoreRank(env.DB, { gameId: GAME_ID, nicknameKey });
        return jsonResponse(
          { saved, rank, entries, cutoffScore: cutoff(entries) },
          { ...context, status: 201 }
        );
      }

      return jsonResponse({ error: 'Not found' }, { ...context, status: 404 });
    } catch (error) {
      return errorResponse(error, context);
    }
  }
};
