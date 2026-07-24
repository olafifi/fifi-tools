import { expect, test } from '@playwright/test';

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
    } else if (game.name === '数独') {
      await expect(frame.getByRole('gridcell')).toHaveCount(81);
    } else if (game.name === '俄罗斯方块') {
      await expect(frame.getByRole('button', { name: '旋转' })).toBeVisible();
      await frame.getByRole('button', { name: '旋转' }).click();
    } else if (game.name === '贪吃蛇') {
      await frame.getByRole('button', { name: '向上' }).click();
      await expect(frame.locator('.snake-shell')).toHaveAttribute('data-direction', 'up');
    } else {
      await expect(frame.getByAltText('下一个蛋白')).toHaveAttribute('src', /danbai\/.+\.png/);
      await frame.locator('[data-merge-stage]').click({ position: { x: 150, y: 80 } });
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
