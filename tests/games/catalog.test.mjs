import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const licenses = ['2048', 'sudoku', 'tetris', 'snake', 'matter-js'];
const games = ['2048', 'sudoku', 'tetris', 'snake', 'merge-danbai'];

test('all upstream licenses are preserved', () => {
  for (const name of licenses) {
    assert.equal(
      existsSync(`public/games/licenses/${name}-LICENSE.txt`),
      true,
      name
    );
  }

  const notices = readFileSync('THIRD_PARTY_NOTICES.md', 'utf8');
  for (const name of [
    '2048',
    'sudoku.js',
    'javascript-tetris',
    'JavaScript-Snake',
    'Matter.js'
  ]) {
    assert.match(notices, new RegExp(name.replace('.', '\\.')));
  }
});

test('all game entrypoints exist and use the shared bridge', () => {
  for (const game of games) {
    const path = `public/games/${game}/index.html`;
    assert.equal(existsSync(path), true, game);
    assert.match(readFileSync(path, 'utf8'), /\.\.\/shared\/bridge\.js/);
  }
});

test('match-3 is absent and game pages have no remote runtime assets', () => {
  const catalog = readFileSync('app/data/catalog.ts', 'utf8');
  assert.equal(catalog.includes('三消'), false);
  assert.equal(catalog.includes('merge-danbai'), true);

  for (const game of games) {
    const html = readFileSync(`public/games/${game}/index.html`, 'utf8');
    assert.equal(/(?:src|href)=["']https?:\/\//.test(html), false, game);
  }
});

test('all themed game entrypoints and changed assets share one cache revision', () => {
  const revision = '20260726-enamel-theme';
  const catalog = readFileSync('app/data/catalog.ts', 'utf8');
  const localStyles = {
    '2048': 'fifi.css',
    sudoku: 'style.css',
    tetris: 'style.css',
    snake: 'style.css',
    'merge-danbai': 'style.css'
  };

  for (const game of games) {
    assert.match(catalog, new RegExp(`games/${game}/index\\.html[^\\n]+${revision}`));
    const html = readFileSync(`public/games/${game}/index.html`, 'utf8');
    assert.match(html, new RegExp(`game-shell\\.css\\?v=${revision}`));
    assert.match(html, new RegExp(`${localStyles[game].replace('.', '\\.')}\\?v=${revision}`));
  }
});
