import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DANBAI_TIERS,
  mergeResult
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
