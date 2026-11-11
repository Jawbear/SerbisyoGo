import test from 'node:test';
import assert from 'node:assert/strict';
import { findService, filterProviders, manilaDay, validateRequest } from '../src/domain.js';
import { fixtureCatalog } from './fixtures/catalog.mjs';

const now = new Date('2026-11-11T01:00:00Z');
const form = { description: 'Repair the leaking kitchen pipe.', label: 'Home', line1: '12 Sample Street', city: 'Bunawan', postal_code: '8506', starts_at: '2026-11-12T00:00:00Z' };

test('provider/service parameters resolve the selected record and reject mismatched IDs', () => {
  assert.equal(findService(fixtureCatalog, 'provider-2', 'service-2').provider.display_name, 'Francis Romay');
  assert.equal(findService(fixtureCatalog, 'provider-2', 'service-1'), null);
  assert.equal(findService(fixtureCatalog, 'unknown', 'service-2'), null);
});

test('discovery combines the selected category with the user search', () => {
  assert.deepEqual(filterProviders(fixtureCatalog, 'Francis', 'category-2').map(item => item.id), ['provider-2']);
  assert.deepEqual(filterProviders(fixtureCatalog, 'Francis', 'category-1'), []);
  assert.equal(filterProviders(fixtureCatalog, '').length, 5);
});

test('request validation preserves details while rejecting invalid addresses and appointments', () => {
  assert.equal(validateRequest(form, now).address.line1, form.line1);
  assert.throws(() => validateRequest({ ...form, postal_code: '85' }, now), /four-digit/);
  assert.throws(() => validateRequest({ ...form, description: 'Fix' }, now), /10 characters/);
  assert.throws(() => validateRequest({ ...form, starts_at: '2026-11-10T00:00:00Z' }, now), /future/);
  assert.throws(() => validateRequest({ ...form, starts_at: '2027-11-12T00:00:00Z' }, now), /90 days/);
});

test('Manila date selection remains correct across a UTC midnight boundary', () => {
  assert.equal(manilaDay(new Date('2026-11-11T17:00:00Z')), '2026-11-12');
  assert.equal(manilaDay(new Date('2026-11-11T17:00:00Z'), 1), '2026-11-13');
});
