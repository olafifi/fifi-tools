import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { resolveTool } from '../../public/open-tool-config.js';

test('tool transition resolves only the two approved destinations', () => {
  assert.deepEqual(resolveTool('image-processor'), {
    name: 'FiFi 图片处理工具',
    href: 'https://olafifi.github.io/ui-image-processor/'
  });
  assert.deepEqual(resolveTool('rich-text'), {
    name: 'FiFi 富文本转换',
    href: 'https://olafifi.github.io/rich-text-translator/'
  });
  assert.equal(resolveTool('https://evil.example'), null);
});

test('GitHub Pages workflow builds, tests, and deploys dist', async () => {
  const workflow = await readFile('.github/workflows/deploy.yml', 'utf8');

  for (const required of [
    'npm ci',
    'npm ci --prefix server/leaderboard',
    'npm test --prefix server/leaderboard',
    'npm test',
    'npm run test:games',
    'npm run e2e',
    'npm run build',
    'actions/configure-pages@',
    'actions/upload-pages-artifact@',
    'actions/deploy-pages@',
    'pages: write',
    'id-token: write',
    'VITE_LEADERBOARD_API_BASE',
    'LEADERBOARD_API_BASE',
    'Validate leaderboard API',
    "protocol !== 'https:'",
    '/healthz',
    'FRONTEND_ORIGIN',
    'access-control-allow-origin'
  ]) {
    assert.match(workflow, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('2048 does not request the missing Clear Sans stylesheet', async () => {
  const stylesheet = await readFile('public/games/2048/style/main.css', 'utf8');
  assert.doesNotMatch(stylesheet, /fonts\/clear-sans\.css/);
});

test('2048 keeps its motion and uses the FIFI Lab berry accent', async () => {
  const theme = await readFile('public/games/2048/fifi.css', 'utf8');
  assert.match(theme, /--tile-slide-duration:\s*240ms/);
  assert.match(theme, /\.tile\.tile-2048/);
  assert.match(theme, /--fifi-berry|#7e3048/i);
});

test('merge Danbai exposes drop guidance and local game-over controls', async () => {
  const mergeHtml = await readFile('public/games/merge-danbai/index.html', 'utf8');
  assert.match(mergeHtml, /data-drop-guide/);
  assert.match(mergeHtml, /data-game-over/);
  assert.match(mergeHtml, /data-final-score/);
  assert.match(mergeHtml, /data-local-restart/);
  assert.match(mergeHtml, /data-retry-leaderboard/);
});

test('merge Danbai aim preview uses the exact tier fill', async () => {
  const stylesheet = await readFile('public/games/merge-danbai/style.css', 'utf8');
  const gameScript = await readFile('public/games/merge-danbai/game.js', 'utf8');
  const aimRule = stylesheet.match(/\.aim-bubble\s*\{[^}]*\}/s)?.[0] ?? '';
  const boxShadow = aimRule.match(/box-shadow:\s*([^;]+);/)?.[1] ?? '';

  assert.match(
    gameScript,
    /aimBubble\.style\.setProperty\(['"]--bubble-fill['"],\s*tier\.fill\)/
  );
  assert.match(aimRule, /background:\s*var\(--bubble-fill\)/);
  assert.match(aimRule, /border:\s*3px solid rgba\(255,255,255,\.92\)/);
  assert.doesNotMatch(aimRule, /color-mix|transparent/);
  assert.doesNotMatch(boxShadow, /inset/);
  assert.match(boxShadow, /0 0 0 2px var\(--bubble-stroke\)/);
  assert.match(boxShadow, /0 5px 13px rgba\(71,56,104,\.18\)/);
});
