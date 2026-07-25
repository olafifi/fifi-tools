import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DANBAI_TIERS,
  mergeResult,
  updateDangerTimer
} from '../../public/games/merge-danbai/merge-rules.js';

test('uses eleven distinct Danbai tiers', () => {
  assert.equal(DANBAI_TIERS.length, 11);
  assert.equal(new Set(DANBAI_TIERS.map((tier) => tier.image)).size, 11);
});

test('equal non-max tiers merge upward and score', () => {
  assert.deepEqual(mergeResult(2, 2), { nextTier: 3, score: 80 });
  assert.equal(mergeResult(2, 3), null);
  assert.equal(mergeResult(10, 10), null);
});

test('gives every Danbai tier a distinct bubble fill', () => {
  assert.equal(DANBAI_TIERS[0].fill, 'rgba(226,118,164,.88)');
  assert.equal(DANBAI_TIERS[1].fill, 'rgba(248,213,228,.84)');
  assert.equal(new Set(DANBAI_TIERS.map((tier) => tier.fill)).size, 11);
  assert.ok(DANBAI_TIERS.every((tier) => tier.stroke === '#574777'));
});

test('requires one continuous second above the danger line', () => {
  const above = [{ isStatic: false, position: { y: 120 }, circleRadius: 18, plugin: { tier: 0 } }];
  const below = [{ isStatic: false, position: { y: 150 }, circleRadius: 18, plugin: { tier: 0 } }];

  assert.deepEqual(updateDangerTimer(above, null, 1000), { since: 1000, gameOver: false });
  assert.deepEqual(updateDangerTimer(above, 1000, 1999), { since: 1000, gameOver: false });
  assert.deepEqual(updateDangerTimer(above, 1000, 2000), { since: 1000, gameOver: true });
  assert.deepEqual(updateDangerTimer(below, 1000, 1500), { since: null, gameOver: false });
});
