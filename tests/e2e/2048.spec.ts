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
