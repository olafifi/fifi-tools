import { expect, test, type Locator, type Page } from '@playwright/test';

async function expectContained(child: Locator, parent: Locator) {
  const [childBox, parentBox] = await Promise.all([
    child.boundingBox(),
    parent.boundingBox()
  ]);
  if (!childBox || !parentBox) throw new Error('分数卡片没有完成渲染。');

  expect(childBox.x).toBeGreaterThanOrEqual(parentBox.x - 1);
  expect(childBox.y).toBeGreaterThanOrEqual(parentBox.y - 1);
  expect(childBox.x + childBox.width).toBeLessThanOrEqual(parentBox.x + parentBox.width + 1);
  expect(childBox.y + childBox.height).toBeLessThanOrEqual(parentBox.y + parentBox.height + 1);
}

async function expectTextFits(value: Locator) {
  const metrics = await value.evaluate((node) => ({
    clientHeight: node.clientHeight,
    clientWidth: node.clientWidth,
    scrollHeight: node.scrollHeight,
    scrollWidth: node.scrollWidth
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight + 1);
}

async function setLongScores(page: Page) {
  await page.waitForFunction(() => 'fifi2048' in window);
  await page.evaluate(() => {
    const game = (window as typeof window & {
      fifi2048: { score: number; actuate(): void };
    }).fifi2048;
    localStorage.setItem('bestScore', '999999999');
    game.score = 888888888;
    game.actuate();
  });
}

type SeedCell = null | {
  position: { x: number; y: number };
  value: number;
};

function emptyCells(): SeedCell[][] {
  return Array.from({ length: 4 }, () => Array<SeedCell>(4).fill(null));
}

async function seed2048(page: Page, cells: SeedCell[][], score = 0) {
  await page.addInitScript(({ seededCells, seededScore }) => {
    localStorage.setItem('gameState', JSON.stringify({
      grid: { size: 4, cells: seededCells },
      score: seededScore,
      over: false,
      won: false,
      keepPlaying: false
    }));
  }, { seededCells: cells, seededScore: score });
}

test('score cards keep nine-digit values inside equal cards', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 760 });
  await page.goto('./games/2048/index.html');
  await setLongScores(page);

  const cards = page.locator('.score-card');
  await expect(cards).toHaveCount(2);
  await expect(page.getByText('当前分数', { exact: true })).toBeVisible();
  await expect(page.getByText('最高分', { exact: true })).toBeVisible();
  await expect(page.locator('.score-container')).toHaveAttribute('data-digits', '9');
  await expect(page.locator('.best-container')).toHaveAttribute('data-digits', '9');
  expect(await page.locator('.score-container').evaluate((node) =>
    node.firstChild?.textContent
  )).toBe('888888888');
  await expect(page.locator('.best-container')).toHaveText('999999999');

  const cardWidths = await cards.evaluateAll((nodes) =>
    nodes.map((node) => node.getBoundingClientRect().width)
  );
  expect(Math.abs(cardWidths[0] - cardWidths[1])).toBeLessThanOrEqual(1);
  await expectContained(page.locator('.score-container'), page.locator('.score-card--current'));
  await expectContained(page.locator('.best-container'), page.locator('.score-card--best'));
  await expectTextFits(page.locator('.score-container'));
  await expectTextFits(page.locator('.best-container'));
});

test('score cards remain contained in the 280px layout', async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 760 });
  await page.goto('./games/2048/index.html');
  await setLongScores(page);

  await expect(page.locator('.game-container')).toHaveCSS('width', '280px');
  await expect(page.locator('.score-card')).toHaveCount(2);
  await expectContained(page.locator('.score-container'), page.locator('.score-card--current'));
  await expectContained(page.locator('.best-container'), page.locator('.score-card--best'));
  await expectTextFits(page.locator('.score-container'));
  await expectTextFits(page.locator('.best-container'));

  const layout = await page.locator('.heading').evaluate((node) => ({
    clientWidth: node.clientWidth,
    scrollWidth: node.scrollWidth
  }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('a tile occupies a real middle frame before settling', async ({ page }) => {
  const cells = emptyCells();
  cells[3][0] = { position: { x: 3, y: 0 }, value: 2 };
  await seed2048(page, cells);
  await page.goto('./games/2048/index.html');
  await page.waitForFunction(() => 'fifi2048' in window);

  const [start, board] = await Promise.all([
    page.locator('.tile').boundingBox(),
    page.locator('.game-container').boundingBox()
  ]);
  if (!start || !board) throw new Error('种子方块或棋盘没有完成渲染。');

  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.game-container')).toHaveAttribute('data-motion-phase', 'sliding');
  await expect(page.locator('.tile:not(.tile-new)')).toHaveCSS('transition-duration', '0.24s');
  await page.waitForTimeout(100);

  const middle = await page.locator('.tile:not(.tile-new)').boundingBox();
  if (!middle) throw new Error('移动方块在中间帧丢失。');
  expect(middle.x).toBeLessThan(start.x - 20);
  expect(middle.x).toBeGreaterThan(board.x + 15);

  await expect(page.locator('.game-container')).toHaveAttribute(
    'data-motion-phase',
    'settled',
    { timeout: 700 }
  );
});

test('merge and new-tile feedback wait until the slide finishes', async ({ page }) => {
  const cells = emptyCells();
  cells[2][0] = { position: { x: 2, y: 0 }, value: 2 };
  cells[3][0] = { position: { x: 3, y: 0 }, value: 2 };
  await seed2048(page, cells);
  await page.goto('./games/2048/index.html');
  await page.waitForFunction(() => 'fifi2048' in window);

  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.game-container')).toHaveAttribute('data-motion-phase', 'sliding');
  await expect(page.locator('.tile-merged')).toHaveClass(/tile-result-staged/);
  await expect(page.locator('.game-container')).toHaveAttribute(
    'data-motion-phase',
    'resolving',
    { timeout: 500 }
  );
  await expect(page.locator('.tile-merged .tile-inner')).not.toHaveCSS(
    'transform',
    'matrix(0, 0, 0, 0, 0, 0)'
  );
  await expect(page.locator('.game-container')).toHaveAttribute(
    'data-motion-phase',
    'settled',
    { timeout: 300 }
  );
});

test('rapid directions use the live FIFO queue and drain cleanly', async ({ page }) => {
  const cells = emptyCells();
  cells[3][0] = { position: { x: 3, y: 0 }, value: 2 };
  await seed2048(page, cells);
  await page.goto('./games/2048/index.html');
  await page.waitForFunction(() => 'fifi2048' in window);

  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowRight');

  await expect.poll(() => page.evaluate(() => {
    const game = (window as typeof window & {
      fifi2048: { moveQueue: number[]; motionActive: boolean };
    }).fifi2048;
    return { queue: game.moveQueue.slice(), active: game.motionActive };
  })).toEqual({ queue: [2, 1], active: true });

  await expect.poll(() => page.evaluate(() => {
    const game = (window as typeof window & {
      fifi2048: { moveQueue: number[]; motionActive: boolean };
    }).fifi2048;
    return { queue: game.moveQueue.slice(), active: game.motionActive };
  }), { timeout: 2500 }).toEqual({ queue: [], active: false });
});

test('restart cancels an active visual transaction', async ({ page }) => {
  const cells = emptyCells();
  cells[3][0] = { position: { x: 3, y: 0 }, value: 2 };
  await seed2048(page, cells);
  await page.goto('./games/2048/index.html');
  await page.waitForFunction(() => 'fifi2048' in window);

  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.game-container')).toHaveAttribute('data-motion-phase', 'sliding');
  await page.getByRole('button', { name: '新一局' }).click();

  await expect(page.locator('.game-container')).toHaveAttribute('data-motion-phase', 'settled');
  await expect.poll(() => page.evaluate(() => {
    const game = (window as typeof window & {
      fifi2048: { moveQueue: number[]; motionActive: boolean };
    }).fifi2048;
    return { queue: game.moveQueue.slice(), active: game.motionActive };
  })).toEqual({ queue: [], active: false });
  await expect(page.locator('.tile')).toHaveCount(2);
  await page.waitForTimeout(500);
  await expect(page.locator('.game-container')).toHaveAttribute('data-motion-phase', 'settled');
});

test('reduced motion settles without waiting through the full timeline', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const cells = emptyCells();
  cells[3][0] = { position: { x: 3, y: 0 }, value: 2 };
  await seed2048(page, cells);
  await page.goto('./games/2048/index.html');
  await page.waitForFunction(() => 'fifi2048' in window);

  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.game-container')).toHaveAttribute(
    'data-motion-phase',
    'settled',
    { timeout: 150 }
  );
});
