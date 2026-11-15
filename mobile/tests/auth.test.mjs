import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMobile, registration, validatePassword } from '../src/auth.js';

test('registration normalizes shared account fields without accepting privileged roles', () => {
  const data = registration({ name: ' Test User ', email: ' tester@example.test ', phone: '09171234567', password: 'TestPassword123!', confirm: 'TestPassword123!', consent: true, role: 'admin' });
  assert.equal(data.email, 'tester@example.test');
  assert.deepEqual(data.data, { full_name: 'Test User', phone: '+639171234567', consent: true });
  assert.equal(normalizeMobile('+63 917 123 4567'), '+639171234567');
  assert.throws(() => normalizeMobile('+15551234567'), /Philippine/);
});

test('registration requires matching strong passwords, valid email and consent', () => {
  const valid = { name: 'Test User', email: 'tester@example.test', phone: '09171234567', password: 'TestPassword123!', confirm: 'TestPassword123!', consent: true };
  for (const patch of [{ name: 'A' }, { email: 'bad' }, { password: 'short' }, { confirm: 'other' }, { consent: false }, { phone: '123' }]) {
    assert.throws(() => registration({ ...valid, ...patch }));
  }
  // Enforces 8+ characters and at least one special character
  assert.throws(() => validatePassword('short!'), /at least 8 characters/);
  assert.throws(() => validatePassword('LongPasswordWithoutSpecial123'), /special character/);
  assert.doesNotThrow(() => validatePassword('Pass123!'));
});
