import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('GitHub Pages workflow builds, tests, and deploys dist', async () => {
  const workflow = await readFile('.github/workflows/deploy.yml', 'utf8');

  for (const required of [
    'npm ci',
    'npm test',
    'npm run test:games',
    'npm run e2e',
    'npm run build',
    'actions/configure-pages@',
    'actions/upload-pages-artifact@',
    'actions/deploy-pages@',
    'pages: write',
    'id-token: write'
  ]) {
    assert.match(workflow, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('2048 does not request the missing Clear Sans stylesheet', async () => {
  const stylesheet = await readFile('public/games/2048/style/main.css', 'utf8');
  assert.doesNotMatch(stylesheet, /fonts\/clear-sans\.css/);
});
