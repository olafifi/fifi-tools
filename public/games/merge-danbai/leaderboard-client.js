export function createLeaderboardClient({ apiBase, fetchImpl = fetch, timeoutMs = 8000 }) {
  const base = apiBase.replace(/\/$/u, '');
  const endpoint = `${base}/api/v1/leaderboards/merge-danbai`;

  async function request(url, options = {}) {
    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, { ...options, signal: controller.signal });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || '排行榜暂时没有响应。');
      return body;
    } catch (error) {
      if (controller.signal.aborted) throw new Error('排行榜连接超时，请重试。');
      throw error;
    } finally {
      globalThis.clearTimeout(timeout);
    }
  }

  return {
    load() {
      return request(`${endpoint}?limit=10`);
    },
    submit({ nickname, score }) {
      return request(`${endpoint}/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, score })
      });
    }
  };
}

export function apiBaseFromLocation(locationLike = location) {
  return new URLSearchParams(locationLike.search).get('leaderboardApi') || '';
}
