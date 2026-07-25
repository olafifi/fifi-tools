import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

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

test('2048 uses the approved berry-soda motion and palette', async () => {
  const theme = await readFile('public/games/2048/fifi.css', 'utf8');
  assert.match(theme, /--tile-move-duration:\s*170ms/);
  assert.match(theme, /\.tile\.tile-2048/);
  assert.match(theme, /#6e5a9b/i);
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

  assert.match(
    gameScript,
    /aimBubble\.style\.setProperty\(['"]--bubble-fill['"],\s*tier\.fill\)/
  );
  assert.match(aimRule, /background:\s*var\(--bubble-fill\)/);
  assert.doesNotMatch(aimRule, /color-mix|transparent/);
});
