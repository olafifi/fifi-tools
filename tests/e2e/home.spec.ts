import { expect, test } from '@playwright/test';
import type { FrameLocator, Page } from '@playwright/test';

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

async function canvasSignature(page: Page) {
  return page.locator('canvas.interactive-field').evaluate((canvas) => {
    const source = canvas as HTMLCanvasElement;
    const context = source.getContext('2d');
    if (!context) throw new Error('Interactive canvas has no 2D context.');
    const pixels = context.getImageData(0, 0, source.width, source.height).data;
    let hash = 2166136261;
    for (let index = 0; index < pixels.length; index += 97) {
      hash ^= pixels[index];
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  });
}

async function measureBackgroundFrames(page: Page, durationMs = 180) {
  await page.addInitScript(() => {
    const state = window as typeof window & { __fifiFieldFrames?: number };
    state.__fifiFieldFrames = 0;
    const fillRect = CanvasRenderingContext2D.prototype.fillRect;
    CanvasRenderingContext2D.prototype.fillRect = function (...args) {
      if (this.canvas.classList.contains('interactive-field')) state.__fifiFieldFrames = (state.__fifiFieldFrames ?? 0) + 1;
      return fillRect.call(this, ...args);
    };
  });
  await page.goto('./');
  await page.waitForTimeout(80);
  await page.evaluate(() => { (window as typeof window & { __fifiFieldFrames?: number }).__fifiFieldFrames = 0; });
  await page.waitForTimeout(durationMs);
  return page.evaluate(() => (window as typeof window & { __fifiFieldFrames?: number }).__fifiFieldFrames ?? 0);
}

async function expectVisibleHomepageMotion(page: Page) {
  await page.goto('./');
  const before = await canvasSignature(page);
  await page.mouse.move(280, 220);
  await page.waitForTimeout(220);
  const after = await canvasSignature(page);
  expect(after).not.toBe(before);
  expect(await page.locator('.wake-cat').count()).toBeGreaterThan(0);
  await expect(page.locator('.cursor-core')).toHaveCSS('opacity', '1');

  const card = page.locator('.tool-card').first();
  const box = await card.boundingBox();
  if (!box) throw new Error('Tool card is not visible.');
  await page.mouse.move(box.x + box.width * 0.72, box.y + box.height * 0.34);
  await expect(card).not.toHaveCSS('transform', 'none');
}

async function capturePointerMotion(page: Page) {
  await page.goto('./');
  await page.waitForTimeout(160);
  for (const point of [
    { x: 140, y: 150 },
    { x: 200, y: 170 },
    { x: 260, y: 190 },
    { x: 320, y: 210 },
    { x: 380, y: 230 },
  ]) {
    await page.mouse.move(point.x, point.y);
    await page.waitForTimeout(70);
  }

  const cats = page.locator('.wake-cat');
  const trail = {
    count: await cats.count(),
    width: await cats.first().evaluate((node) => getComputedStyle(node).width),
    duration: await cats.first().evaluate((node) => getComputedStyle(node).animationDuration),
  };
  const card = page.locator('.tool-card').first();
  const box = await card.boundingBox();
  if (!box) throw new Error('Tool card is not visible.');
  await page.mouse.move(box.x + box.width * 0.72, box.y + box.height * 0.34);
  const tilt = await card.evaluate((node) => ({
    rx: (node as HTMLElement).style.getPropertyValue('--rx'),
    ry: (node as HTMLElement).style.getPropertyValue('--ry'),
  }));
  return { trail, tilt };
}

test('home stays usable without horizontal overflow at key widths', async ({ page }) => {
  for (const viewport of [
    { width: 375, height: 812 },
    { width: 768, height: 900 },
    { width: 1440, height: 900 }
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('./');

    await expect(page.getByRole('heading', { name: /智力\s*检测站/ })).toBeVisible();
    await expect(page.getByRole('link', { name: 'FiFi 图片处理工具' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'FiFi 富文本转换' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'FIFI Lab / 菲菲实验站' })).toBeVisible();
    await expect(page.getByText('一些能让生活省点力气的小实验。')).toBeVisible();
    await expect(page.locator('.count-curve')).toHaveText('我有 3 条待办 · 0 条完成');
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
    const stationBox = await page.locator('.game-station').boundingBox();
    const toolsBox = await page.locator('.tool-cluster').boundingBox();
    const heroBox = await page.locator('.lab-hero').boundingBox();
    if (!shellBox || !stationBox || !toolsBox || !heroBox) throw new Error('Home layout boxes are missing.');

    expect(shellBox.x).toBeLessThanOrEqual(17);
    expect(viewport.width - shellBox.x - shellBox.width).toBeLessThanOrEqual(17);
    expect(stationBox.x).toBeLessThanOrEqual(40);
    expect(stationBox.width).toBeGreaterThanOrEqual(100);
    expect(stationBox.width).toBeLessThanOrEqual(120);
    expect(toolsBox.x).toBeGreaterThan(stationBox.x + stationBox.width);
    expect(heroBox.x).toBeGreaterThan(toolsBox.x);

    const cardWidths = await page.locator('.tool-card').evaluateAll((cards) =>
      cards.map((card) => card.getBoundingClientRect().width)
    );
    expect(cardWidths).toHaveLength(2);
    expect(Math.abs(cardWidths[0] - cardWidths[1])).toBeLessThanOrEqual(1);
    expect(cardWidths[0]).toBeGreaterThan(220);
  }
});

test('clock uses local 24-hour time and the zipper clips todo content', async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 6, 26, 14, 8, 9) });
  await page.goto('./');

  await expect(page.getByLabel('本地时间')).toHaveText('14:08:09');
  await expect(page.getByLabel('今天日期')).toHaveText('2026年7月26日 · 星期日');

  const tasks = page.locator('.todo-tasks');
  await page.getByRole('button', { name: '拉开 To-Do List' }).click();
  await expect(tasks).toHaveCSS('clip-path', /url\(.+todo-content-clip.+\)/);
  await expect(page.getByRole('textbox', { name: '待办内容' }).first()).toHaveValue('今天要做什么呢？');

  const openPath = await page.locator('#todo-content-clip path').getAttribute('d');
  await page.getByRole('button', { name: '收回 To-Do List' }).click();
  await page.waitForTimeout(280);
  const closingPath = await page.locator('#todo-content-clip path').getAttribute('d');
  expect(closingPath).not.toBe(openPath);
});

test('zipper click closes after a complete open and the add button waits for interactivity', async ({ page }) => {
  await page.goto('./');
  const root = page.locator('.todo-root');
  const pull = page.locator('.zip-pull');
  const add = page.getByRole('button', { name: '新增任务' });

  await pull.click();
  await expect(root).toHaveClass(/interactive/);
  await expect(add).toBeVisible();
  await expect(add).toHaveCSS('transform', 'none');
  expect(await add.evaluate((node) => node.parentElement?.classList.contains('todo-tasks'))).toBe(true);
  await expect(page.locator('#todo-content-clip path')).toHaveAttribute('d', /L705\.00 530\.00/);
  const rootBox = await root.boundingBox();
  const addBox = await add.boundingBox();
  if (!rootBox || !addBox) throw new Error('Open zipper geometry is not visible.');
  expect(addBox.y + addBox.height).toBeLessThanOrEqual(rootBox.y + 531);

  await pull.click();
  await expect(root).not.toHaveClass(/open/);
  await expect(add).toBeHidden();

  const closedPull = await pull.boundingBox();
  if (!closedPull) throw new Error('Closed zipper pull is not visible.');
  await page.mouse.move(closedPull.x + closedPull.width / 2, closedPull.y + closedPull.height / 2);
  await page.mouse.down();
  await page.mouse.move(closedPull.x - 150, closedPull.y + 130, { steps: 5 });
  await expect(root).toHaveClass(/open/);
  await expect(root).not.toHaveClass(/interactive/);
  await expect(add).toBeHidden();
  await page.mouse.up();
});

test('todo completion draws a check and strike before returning cleanly', async ({ page }) => {
  await page.goto('./');
  await page.locator('.zip-pull').click();
  await expect(page.locator('.todo-root')).toHaveClass(/interactive/);

  const firstRow = page.locator('.task-row').first();
  const check = firstRow.getByRole('button', { name: '标记为已完成' });
  const mark = firstRow.locator('.task-check__mark');
  const strike = firstRow.locator('.task-strike');
  await expect(mark).toHaveCSS('stroke-dashoffset', '1px');
  await expect(strike).toHaveCSS('transform', /matrix\(0, 0, 0, 1,/);

  await check.click();
  await expect(page.locator('.count-curve')).toHaveText('我有 3 条待办 · 1 条完成');
  await expect(firstRow).toHaveClass(/done/);
  await expect(mark).toHaveCSS('stroke-dashoffset', '0px');
  await expect(strike).toHaveCSS('transform', /matrix\(1, 0, 0, 1,/);

  await firstRow.getByRole('button', { name: '标记为未完成' }).click();
  await expect(page.locator('.count-curve')).toHaveText('我有 3 条待办 · 0 条完成');
  await expect(firstRow).not.toHaveClass(/done/);
  await expect(mark).toHaveCSS('stroke-dashoffset', '1px');
  await expect(strike).toHaveCSS('transform', /matrix\(0, 0, 0, 1,/);
});

test('tool transition shows a real URL, redirects approved tools, and rejects unknown ids', async ({ page }) => {
  await page.route('https://olafifi.github.io/ui-image-processor/', async (route) => {
    await route.fulfill({ contentType: 'text/html', body: '<title>FiFi Image Tool</title><h1>tool ready</h1>' });
  });

  await page.goto('./open-tool.html?tool=image-processor');
  await expect(page).toHaveURL(/open-tool\.html\?tool=image-processor/);
  await expect(page.getByText('蛋白正在穿过实验通道')).toBeVisible();
  await expect(page).toHaveURL('https://olafifi.github.io/ui-image-processor/', { timeout: 4000 });

  await page.goto('./open-tool.html?tool=not-allowed');
  await expect(page.getByRole('alert')).toContainText('这条实验通道不存在');
  await expect(page.getByRole('link', { name: '返回 FIFI Lab' })).toBeVisible();
});

test('normal motion profile keeps the homepage interactions visible', async ({ page }) => {
  await expectVisibleHomepageMotion(page);
});

test('both motion profiles keep the full foreground background cadence', async ({ browser, baseURL }) => {
  const fullContext = await browser.newContext({ baseURL, reducedMotion: 'no-preference' });
  const reducedContext = await browser.newContext({ baseURL, reducedMotion: 'reduce' });
  const fullPage = await fullContext.newPage();
  const reducedPage = await reducedContext.newPage();
  try {
    const fullFrames = await measureBackgroundFrames(fullPage);
    const reducedFrames = await measureBackgroundFrames(reducedPage);
    expect(fullFrames).toBeGreaterThanOrEqual(6);
    expect(reducedFrames).toBeGreaterThanOrEqual(6);
    expect(Math.abs(fullFrames - reducedFrames)).toBeLessThanOrEqual(3);
  } finally {
    await fullContext.close();
    await reducedContext.close();
  }
});

test('both motion profiles keep the same full cat trail and tool tilt', async ({ browser, baseURL }) => {
  const fullContext = await browser.newContext({ baseURL, reducedMotion: 'no-preference' });
  const reducedContext = await browser.newContext({ baseURL, reducedMotion: 'reduce' });
  const fullPage = await fullContext.newPage();
  const reducedPage = await reducedContext.newPage();
  try {
    const full = await capturePointerMotion(fullPage);
    const reduced = await capturePointerMotion(reducedPage);
    expect(full.trail.count).toBeGreaterThanOrEqual(4);
    expect(reduced.trail.count).toBe(full.trail.count);
    expect(full.trail).toMatchObject({ width: '30px', duration: '1.16s' });
    expect(reduced.trail).toMatchObject({ width: '30px', duration: '1.16s' });
    expect(reduced.tilt).toEqual(full.tilt);
  } finally {
    await fullContext.close();
    await reducedContext.close();
  }
});

test.describe('reduced motion profile', () => {
  test('keeps the full homepage interactions visible', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, reducedMotion: 'reduce' });
    const page = await context.newPage();
    try {
      expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
      await expectVisibleHomepageMotion(page);
    } finally {
      await context.close();
    }
  });

  test('keeps the full tool portal visible before redirecting', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, reducedMotion: 'reduce' });
    const page = await context.newPage();
    try {
      await page.route('https://olafifi.github.io/ui-image-processor/', async (route) => {
        await route.fulfill({ contentType: 'text/html', body: '<title>FiFi Image Tool</title><h1>tool ready</h1>' });
      });

      await page.goto('./open-tool.html?tool=image-processor');
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'full');
      await page.waitForTimeout(900);
      await expect(page).toHaveURL(/open-tool\.html\?tool=image-processor/);
      await expect(page).toHaveURL('https://olafifi.github.io/ui-image-processor/', { timeout: 2200 });
    } finally {
      await context.close();
    }
  });
});

const games = [
  { name: '2048', frameTitle: '2048 游戏区域', selector: '.game-container', theme: 'berry' },
  { name: '数独', frameTitle: '数独 游戏区域', selector: '[role="grid"]', theme: 'jade' },
  { name: '俄罗斯方块', frameTitle: '俄罗斯方块 游戏区域', selector: 'canvas', theme: 'gold' },
  { name: '贪吃蛇', frameTitle: '贪吃蛇 游戏区域', selector: '[data-snake-board]', theme: 'brick' },
  { name: '合成大蛋白', frameTitle: '合成大蛋白 游戏区域', selector: '[data-merge-stage]', theme: 'plum' }
] as const;

test('all five games become ready, respond, restart, and close inline', async ({ page }) => {
  await page.goto('./');
  const homeUrl = page.url();

  for (const game of games) {
    await page.getByRole('button', { name: game.name, exact: true }).click();
    await expect(page.getByRole('dialog', { name: game.name })).toBeVisible();
    await expect(page.getByRole('dialog', { name: game.name })).toHaveAttribute('data-game-theme', game.theme);

    const restart = page.getByRole('button', { name: `重新开始 ${game.name}` });
    await expect(restart).toBeEnabled({ timeout: 8000 });
    const frame = page.frameLocator(`iframe[title="${game.frameTitle}"]`);
    await expect(frame.locator(game.selector)).toBeVisible();
    expect(await frame.locator('html').evaluate((root) => getComputedStyle(root).getPropertyValue('--fifi-ink').trim())).toBe('#171411');

    if (game.name === '2048') {
      await expect(frame.locator('.tile')).toHaveCount(2);
      await expect(frame.locator('.tile').first()).toHaveCSS('transition-duration', '0.24s');
      await expect(frame.locator('.game-container')).toHaveCSS('width', '500px');
    } else if (game.name === '数独') {
      await expect(frame.getByRole('gridcell')).toHaveCount(81);
    } else if (game.name === '俄罗斯方块') {
      await expect(frame.getByRole('button', { name: '旋转' })).toBeVisible();
      await frame.getByRole('button', { name: '旋转' }).click();
    } else if (game.name === '贪吃蛇') {
      const shell = frame.locator('.snake-shell');
      await expect(shell).toBeFocused();
      const controlsFit = await frame.locator('.snake-controls').evaluate((controls) => {
        const box = controls.getBoundingClientRect();
        return box.bottom <= window.innerHeight + 1;
      });
      expect(controlsFit).toBe(true);
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

  const game2048Route = /\/games\/2048\/index\.html(?:\?.*)?$/;
  await page.route(game2048Route, (route) => route.abort());
  await page.getByRole('button', { name: '2048', exact: true }).click();
  await expect(page.getByRole('button', { name: '重新开始 2048' })).toBeDisabled();
  await expect(page.getByRole('alert')).toContainText('游戏没有成功加载', { timeout: 9000 });
  await expect(page.getByRole('button', { name: '重新加载 2048' })).toBeVisible();
  await page.getByRole('button', { name: '关闭 2048' }).click();
  await page.unroute(game2048Route);
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
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
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
  const firstGate = new Promise<void>((resolve) => { releaseFirst = resolve; });
  const secondGate = new Promise<void>((resolve) => { releaseSecond = resolve; });

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

  const firstResponsePromise = page.waitForResponse((response) => (
    response.request().method() === 'POST' && response.status() === 500
  ));
  releaseFirst();
  const firstResponse = await firstResponsePromise;
  await firstResponse.finished();
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
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
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
  expect(postCount).toBe(2);

  const secondResponsePromise = page.waitForResponse((response) => (
    response.request().method() === 'POST' && response.status() === 201
  ));
  releaseSecond();
  const secondResponse = await secondResponsePromise;
  await secondResponse.finished();
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
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
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
    `/${'fifi-tools/'}games/merge-danbai/index.html?v=20260726-enamel-theme&leaderboardApi=${encodeURIComponent(apiBase)}`
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
