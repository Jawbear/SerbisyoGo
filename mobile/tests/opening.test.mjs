import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { openingDestination } from '../src/opening.js';

test('Android ships the reviewed short opening and preserves the original master', async () => {
  const asset = new URL('../modules/serbisyogo-intro/android/src/main/res/raw/serbisyogo_opening.mp4', import.meta.url);
  const original = new URL('../../logo/LOGO ANIMATION/SerbisyoGoAnimation.mp4', import.meta.url);
  const sha256 = async file => createHash('sha256').update(await readFile(file)).digest('hex');
  assert.equal(await sha256(original), '4a6de566532246b79f475938cdcb10d11fd01e1768b39187090dfb6e72efad8c');
  assert.equal(await sha256(asset), '099390c9721684f70e19162ce5feca575e9fcd2142d0278a2b016a88550185dd');
});

test('ordinary launches select sign-in or the existing role-aware home', () => {
  assert.deepEqual(openingDestination(null), { name: 'SignIn', params: { fromOpening: true } });
  for (const role of ['customer', 'provider', 'admin']) {
    assert.deepEqual(openingDestination({ role }), { name: 'Home' });
  }
});
