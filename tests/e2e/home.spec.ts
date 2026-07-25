import { expect, test } from '@playwright/test';
import type { FrameLocator } from '@playwright/test';

async function expectFrameWithoutScrollbars(frame: FrameLocator, label: string) {
  const metrics = await frame.locator('body').evaluate(() => {
    const root = document.documentElement;
    return {
      horizontal: root.scrollWidth <= root.clientWidth + 1,
      vertical: root.scrollHeight <= root.clientHeight + 1,
      scrollWidth: root.scrollWidth,
      clientWidth: root.clientWidth,
      scrollHeight: root.scrollHeight,
      clientHeight: root.clientHeight
    };
  });
  expect(metrics.horizontal, label).toBe(true);
  expect(metrics.vertical, `${label}: ${metrics.scrollHeight}px content in ${metrics.clientHeight}px viewport`).toBe(true);
}

test('home stays usable without horizontal overflow at key widths', async ({ page }) => {
  for (const viewport of [
    { width: 375, height: 812 },
    { width: 768, height: 900 },
    { width: 1440, height: 900 }
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('./');

    await expect(page.getByRole('heading', { name: '智力检测站' })).toBeVisible();
    await expect(page.getByRole('link', { name: /FIFI 图片处理/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /FIFI-Richly/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  }
});

test('desktop home uses the viewport and keeps the game station on the left', async ({ page }) => {
  for (const viewport of [
    { width: 1024, height: 900 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 }
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('./');

    const shellBox = await page.locator('.site-shell').boundingBox();
    const contentBox = await page.locator('.home-content').boundingBox();
    const stationBox = await page.locator('.game-station').boundingBox();
    if (!shellBox || !contentBox || !stationBox) throw new Error('Home layout boxes are missing.');

    expect(shellBox.x).toBeLessThanOrEqual(17);
    expect(viewport.width - shellBox.x - shellBox.width).toBeLessThanOrEqual(17);
    expect(Math.abs(stationBox.x - contentBox.x)).toBeLessThanOrEqual(1);
    expect(stationBox.width).toBeGreaterThanOrEqual(269);
    expect(stationBox.width).toBeLessThanOrEqual(321);

    const cardWidths = await page.locator('.tool-card').evaluateAll((cards) =>
      cards.map((card) => card.getBoundingClientRect().width)
    );
    expect(cardWidths).toHaveLength(2);
    expect(Math.abs(cardWidths[0] - cardWidths[1])).toBeLessThanOrEqual(1);
    expect(cardWidths[0]).toBeGreaterThan(viewport.width >= 1440 ? 500 : 300);
  }

  await page.setViewportSize({ width: 900, height: 900 });
  await page.goto('./');
  const contentWidth = await page.locator('.home-content').evaluate((node) => node.getBoundingClientRect().width);
  const stationWidth = await page.locator('.game-station').evaluate((node) => node.getBoundingClientRect().width);
  expect(Math.abs(contentWidth - stationWidth)).toBeLessThanOrEqual(1);
});

const games = [
  { name: '2048', frameTitle: '2048 游戏区域', selector: '.game-container' },
  { name: '数独', frameTitle: '数独 游戏区域', selector: '[role="grid"]' },
  { name: '俄罗斯方块', frameTitle: '俄罗斯方块 游戏区域', selector: 'canvas' },
  { name: '贪吃蛇', frameTitle: '贪吃蛇 游戏区域', selector: '[data-snake-board]' },
  { name: '合成大蛋白', frameTitle: '合成大蛋白 游戏区域', selector: '[data-merge-stage]' }
] as const;

test('all five games become ready, respond, restart, and close inline', async ({ page }) => {
  await page.goto('./');
  const homeUrl = page.url();

  for (const game of games) {
    await page.getByRole('button', { name: game.name, exact: true }).click();
    await expect(page.getByRole('dialog', { name: game.name })).toBeVisible();

    const restart = page.getByRole('button', { name: `重新开始 ${game.name}` });
    await expect(restart).toBeEnabled({ timeout: 8000 });
    const frame = page.frameLocator(`iframe[title="${game.frameTitle}"]`);
    await expect(frame.locator(game.selector)).toBeVisible();

    if (game.name === '2048') {
      await expect(frame.locator('.tile')).toHaveCount(2);
      await expect(frame.locator('.tile').first()).toHaveCSS('transition-duration', '0.17s');
      await expect(frame.locator('.game-container')).toHaveCSS('width', '500px');
    } else if (game.name === '数独') {
      await expect(frame.getByRole('gridcell')).toHaveCount(81);
    } else if (game.name === '俄罗斯方块') {
      await expect(frame.getByRole('button', { name: '旋转' })).toBeVisible();
      await frame.getByRole('button', { name: '旋转' }).click();
    } else if (game.name === '贪吃蛇') {
      const shell = frame.locator('.snake-shell');
      await expect(shell).toBeFocused();
      await page.keyboard.press('ArrowUp');
      await expect(shell).toHaveAttribute('data-direction', 'up');

      await restart.click();
      await expect(shell).toBeFocused();
      await page.keyboard.press('ArrowDown');
      await expect(shell).toHaveAttribute('data-direction', 'down');
    } else {
      await expect(frame.getByAltText('下一个蛋白')).toHaveAttribute('src', /danbai\/.+\.png/);
      const guide = frame.locator('[data-drop-guide]');
      await expect(guide).toBeVisible();
      await frame.locator('[data-merge-stage]').click({ position: { x: 150, y: 80 } });
      await expect(guide).toBeHidden();
      await expect(guide).toBeVisible({ timeout: 1000 });
    }

    await restart.click();
    await page.getByRole('button', { name: `关闭 ${game.name}` }).click();
    await expect(page.getByRole('dialog', { name: game.name })).toHaveCount(0);
    expect(page.url()).toBe(homeUrl);
  }

  await page.route('**/games/2048/index.html', (route) => route.abort());
  await page.getByRole('button', { name: '2048', exact: true }).click();
  await expect(page.getByRole('button', { name: '重新开始 2048' })).toBeDisabled();
  await expect(page.getByRole('alert')).toContainText('游戏没有成功加载', { timeout: 9000 });
  await expect(page.getByRole('button', { name: '重新加载 2048' })).toBeVisible();
  await page.getByRole('button', { name: '关闭 2048' }).click();
  await page.unroute('**/games/2048/index.html');
});

test('all five games fit without iframe scrollbars at desktop and mobile sizes', async ({ page }) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 375, height: 812 }
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('./');

    for (const game of games) {
      await page.getByRole('button', { name: game.name, exact: true }).click();
      await expect(page.getByRole('button', { name: `重新开始 ${game.name}` })).toBeEnabled({ timeout: 8000 });
      const frame = page.frameLocator(`iframe[title="${game.frameTitle}"]`);
      await expectFrameWithoutScrollbars(frame, `${game.name} at ${viewport.width}×${viewport.height}`);
      await page.getByRole('button', { name: `关闭 ${game.name}` }).click();
    }
  }
});

test('leaderboard loads, degrades gracefully, and opens as a mobile sheet', async ({ page }) => {
  const endpoint = 'http://scores.test/api/v1/leaderboards/merge-danbai?limit=10';
  await page.route(endpoint, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        cutoffScore: 8500,
        entries: [
          { rank: 1, nickname: '蛋白王', score: 56900, achievedAt: '2026-07-24T00:00:00.000Z' },
          { rank: 2, nickname: 'Fifi', score: 42800, achievedAt: '2026-07-24T00:01:00.000Z' }
        ]
      })
    });
  });

  const gameUrl = './games/merge-danbai/index.html?leaderboardApi=http%3A%2F%2Fscores.test';
  await page.setViewportSize({ width: 900, height: 760 });
  await page.goto(gameUrl);
  await expect(page.getByRole('heading', { name: /全站最高分/ })).toBeVisible();
  await expect(page.getByText('蛋白王')).toBeVisible();
  await expect(page.getByText('Fifi')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= document.documentElement.clientHeight + 1)).toBe(true);
  const statusBox = await page.locator('[data-status]').boundingBox();
  expect(statusBox && statusBox.y + statusBox.height <= 760).toBe(true);

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(gameUrl);
  await page.getByRole('button', { name: '排行榜' }).click();
  await expect(page.locator('[data-leaderboard]')).toBeVisible();
  await page.getByRole('button', { name: '关闭排行榜' }).click();
  await expect(page.locator('[data-leaderboard]')).toBeHidden();

  await page.unroute(endpoint);
  await page.route(endpoint, (route) => route.abort());
  await page.goto(gameUrl);
  await page.getByRole('button', { name: '排行榜' }).click();
  await expect(page.getByText('排行榜暂时休息，游戏仍然可以继续。')).toBeVisible();
  await expect(page.getByRole('button', { name: '重试排行榜' })).toBeVisible();

  await page.unroute(endpoint);
  await page.route(endpoint, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        cutoffScore: 0,
        entries: [
          { rank: 1, nickname: '重连蛋白', score: 100, achievedAt: '2026-07-24T00:00:00.000Z' }
        ]
      })
    });
  });
  await page.getByRole('button', { name: '重试排行榜' }).click();
  await expect(page.getByText('重连蛋白')).toBeVisible();
});

test('allows only one successful score submission per game', async ({ page }) => {
  const apiPattern = 'http://scores.test/api/v1/leaderboards/merge-danbai**';
  const corsHeaders = { 'Access-Control-Allow-Origin': '*' };
  let postCount = 0;
  await page.route(apiPattern, async (route) => {
    const method = route.request().method();
    if (method === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          ...corsHeaders,
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
        }
      });
      return;
    }
    if (method === 'GET') {
      await route.fulfill({
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify({ entries: [], cutoffScore: 0 })
      });
      return;
    }
    postCount += 1;
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify({
        saved: {
          nickname: `测试蛋白${postCount}`,
          score: 0,
          achievedAt: '2026-07-25T00:00:00.000Z'
        },
        rank: postCount,
        entries: [],
        cutoffScore: 0
      })
    });
  });

  await page.goto('./games/merge-danbai/index.html?leaderboardApi=http%3A%2F%2Fscores.test');
  await page.evaluate(() => {
    const input = document.querySelector('[data-nickname]') as HTMLInputElement;
    input.value = '第一次';
    (document.querySelector('[data-qualifying-form]') as HTMLFormElement).requestSubmit();
  });
  await expect.poll(() => postCount).toBe(1);
  await expect(page.locator('[data-nickname]')).toBeDisabled();
  await expect(page.locator('[data-submit-score]')).toBeDisabled();

  await page.evaluate(() => {
    const input = document.querySelector('[data-nickname]') as HTMLInputElement;
    const submit = document.querySelector('[data-submit-score]') as HTMLButtonElement;
    input.disabled = false;
    submit.disabled = false;
    input.value = '换名重复';
    (document.querySelector('[data-qualifying-form]') as HTMLFormElement).requestSubmit();
  });
  await page.waitForTimeout(100);
  expect(postCount).toBe(1);

  await page.locator('[data-local-restart]').evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
  await page.evaluate(() => {
    const input = document.querySelector('[data-nickname]') as HTMLInputElement;
    input.value = '新一局';
    (document.querySelector('[data-qualifying-form]') as HTMLFormElement).requestSubmit();
  });
  await expect.poll(() => postCount).toBe(2);
});

test('ignores a previous game submission that fails after restart', async ({ page }) => {
  const apiPattern = 'http://scores.test/api/v1/leaderboards/merge-danbai**';
  const corsHeaders = { 'Access-Control-Allow-Origin': '*' };
  let postCount = 0;
  let releaseFirst!: () => void;
  let releaseSecond!: () => void;
  let markFirstFulfilled!: () => void;
  let markSecondFulfilled!: () => void;
  const firstGate = new Promise<void>((resolve) => { releaseFirst = resolve; });
  const secondGate = new Promise<void>((resolve) => { releaseSecond = resolve; });
  const firstFulfilled = new Promise<void>((resolve) => { markFirstFulfilled = resolve; });
  const secondFulfilled = new Promise<void>((resolve) => { markSecondFulfilled = resolve; });

  await page.route(apiPattern, async (route) => {
    const method = route.request().method();
    if (method === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          ...corsHeaders,
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
        }
      });
      return;
    }
    if (method === 'GET') {
      await route.fulfill({
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify({ entries: [], cutoffScore: 0 })
      });
      return;
    }

    postCount += 1;
    const requestNumber = postCount;
    if (requestNumber === 1) {
      await firstGate;
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify({ error: '旧的一局提交失败' })
      });
      markFirstFulfilled();
      return;
    }
    if (requestNumber === 2) {
      await secondGate;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify({
          saved: { nickname: '新一局', score: 0, achievedAt: '2026-07-25T00:00:00.000Z' },
          rank: 2,
          entries: [],
          cutoffScore: 0
        })
      });
      markSecondFulfilled();
      return;
    }

    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify({ rank: requestNumber, entries: [], cutoffScore: 0 })
    });
  });

  await page.goto('./games/merge-danbai/index.html?leaderboardApi=http%3A%2F%2Fscores.test');
  await page.evaluate(() => {
    const input = document.querySelector('[data-nickname]') as HTMLInputElement;
    input.value = '第一局';
    (document.querySelector('[data-qualifying-form]') as HTMLFormElement).requestSubmit();
  });
  await expect.poll(() => postCount).toBe(1);

  await page.locator('[data-local-restart]').evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
  await page.evaluate(() => {
    const input = document.querySelector('[data-nickname]') as HTMLInputElement;
    input.value = '新一局';
    (document.querySelector('[data-qualifying-form]') as HTMLFormElement).requestSubmit();
  });
  await expect.poll(() => postCount).toBe(2);

  releaseFirst();
  await firstFulfilled;
  await page.waitForTimeout(100);
  await expect(page.locator('[data-nickname]')).toBeDisabled();
  await expect(page.locator('[data-submit-score]')).toBeDisabled();
  await expect(page.locator('[data-submit-status]')).toHaveText('正在提交…');

  await page.evaluate(() => {
    const input = document.querySelector('[data-nickname]') as HTMLInputElement;
    const submit = document.querySelector('[data-submit-score]') as HTMLButtonElement;
    input.disabled = false;
    submit.disabled = false;
    input.value = '旧请求不应解锁';
    (document.querySelector('[data-qualifying-form]') as HTMLFormElement).requestSubmit();
  });
  await page.waitForTimeout(100);
  expect(postCount).toBe(2);

  releaseSecond();
  await secondFulfilled;
  await expect(page.locator('[data-submit-status]')).toContainText('第 2 名');
  await expect(page.locator('[data-nickname]')).toBeDisabled();
});

test('keeps a successful score locked when the response list is malformed', async ({ page }) => {
  const apiPattern = 'http://scores.test/api/v1/leaderboards/merge-danbai**';
  const corsHeaders = { 'Access-Control-Allow-Origin': '*' };
  let postCount = 0;
  await page.route(apiPattern, async (route) => {
    const method = route.request().method();
    if (method === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          ...corsHeaders,
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
        }
      });
      return;
    }
    if (method === 'GET') {
      await route.fulfill({
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify({ entries: [], cutoffScore: 0 })
      });
      return;
    }

    postCount += 1;
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify({ rank: 1, entries: null, cutoffScore: 0 })
    });
  });

  await page.goto('./games/merge-danbai/index.html?leaderboardApi=http%3A%2F%2Fscores.test');
  await page.evaluate(() => {
    const input = document.querySelector('[data-nickname]') as HTMLInputElement;
    input.value = '已经收录';
    (document.querySelector('[data-qualifying-form]') as HTMLFormElement).requestSubmit();
  });
  await expect.poll(() => postCount).toBe(1);
  await expect(page.locator('[data-submit-status]')).toContainText('第 1 名');
  await expect(page.locator('[data-nickname]')).toBeDisabled();
  await expect(page.locator('[data-submit-score]')).toBeDisabled();

  await page.evaluate(() => {
    const input = document.querySelector('[data-nickname]') as HTMLInputElement;
    const submit = document.querySelector('[data-submit-score]') as HTMLButtonElement;
    input.disabled = false;
    submit.disabled = false;
    input.value = '不该再提交';
    (document.querySelector('[data-qualifying-form]') as HTMLFormElement).requestSubmit();
  });
  await page.waitForTimeout(100);
  expect(postCount).toBe(1);
});

test('configured leaderboard origin is passed only to the merge frame', async ({ page }) => {
  const apiBase = process.env.VITE_LEADERBOARD_API_BASE;
  test.skip(!apiBase, 'This build-contract check requires VITE_LEADERBOARD_API_BASE.');
  await page.route('**/api/v1/leaderboards/merge-danbai?limit=10', (route) => route.abort());
  await page.goto('./');
  await page.getByRole('button', { name: '合成大蛋白', exact: true }).click();
  await expect(page.getByTitle('合成大蛋白 游戏区域')).toHaveAttribute(
    'src',
    `/${'fifi-tools/'}games/merge-danbai/index.html?leaderboardApi=${encodeURIComponent(apiBase)}`
  );
});

test('local leaderboard end to end', async ({ page }) => {
  const apiBase = process.env.VITE_LEADERBOARD_API_BASE;
  test.skip(
    process.env.RUN_LOCAL_LEADERBOARD_INTEGRATION !== '1' || apiBase !== 'http://127.0.0.1:8787',
    'This test intentionally writes only to the local integration database.'
  );

  const submit = await page.request.post(`${apiBase}/api/v1/leaderboards/merge-danbai/scores`, {
    headers: { Origin: 'http://127.0.0.1:5173' },
    data: { nickname: '联调蛋白', score: 1234 }
  });
  expect(submit.ok()).toBe(true);

  await page.goto('./');
  await page.getByRole('button', { name: '合成大蛋白', exact: true }).click();
  const frame = page.frameLocator('iframe[title="合成大蛋白 游戏区域"]');
  await expect(frame.getByText('联调蛋白')).toBeVisible();
});
