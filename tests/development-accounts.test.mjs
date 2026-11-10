import test from 'node:test';
import assert from 'node:assert/strict';
import { planAccountUpdates } from '../scripts/update-development-accounts.mjs';

const manifest = { accounts: { provider1: { id: 'provider-one' }, customer1: { id: 'customer-one' } } };
test('credential updates retain existing IDs and reject unknown accounts, duplicates and role edits', () => {
  const password = 'unit-fixture-password-only';
  const plan = planAccountUpdates(manifest, { provider1: { email: 'PROVIDER@EXAMPLE.TEST', password } });
  assert.equal(plan[0].id, 'provider-one');
  assert.equal(plan[0].email, 'provider@example.test');
  assert.throws(() => planAccountUpdates(manifest, { missing: { email: 'missing@example.test', password } }));
  assert.throws(() => planAccountUpdates(manifest, { provider1: { email: 'one@example.test', password, role: 'admin' } }));
  assert.throws(() => planAccountUpdates(manifest, {
    provider1: { email: 'one@example.test', password }, customer1: { email: 'ONE@example.test', password }
  }));
  assert.throws(() => planAccountUpdates(manifest, { provider1: { email: 'not-an-email', password } }));
  assert.throws(() => planAccountUpdates(manifest, { provider1: { email: 'one@example.test', password: 'short' } }));
});
