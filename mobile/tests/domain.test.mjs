import test from 'node:test';
import assert from 'node:assert/strict';
import { findService, filterProviders, manilaDay, validateRequest } from '../src/domain.js';
import { demoCatalog } from '../src/data/demo-data.js';
import { createDemoStore, DEMO_STORAGE_KEY } from '../src/data/demo-store.js';

const now = new Date('2026-11-11T01:00:00Z');
const form = { description: 'Repair the leaking kitchen pipe.', label: 'Home', line1: '12 Sample Street', city: 'Bunawan', postal_code: '8506', starts_at: '2026-11-12T00:00:00Z' };
function memoryStorage() {
  const values = new Map();
  return { values, getItem: async key => values.get(key) || null, setItem: async (key, value) => values.set(key, value), removeItem: async key => values.delete(key) };
}

test('provider/service parameters resolve the selected record and reject mismatched IDs', () => {
  assert.equal(findService(demoCatalog, 'provider-2', 'service-2').provider.display_name, 'Francis Romay');
  assert.equal(findService(demoCatalog, 'provider-2', 'service-1'), null);
  assert.equal(findService(demoCatalog, 'unknown', 'service-2'), null);
});

test('discovery combines the selected category with the user search', () => {
  assert.deepEqual(filterProviders(demoCatalog, 'Francis', 'category-2').map(item => item.id), ['provider-2']);
  assert.deepEqual(filterProviders(demoCatalog, 'Francis', 'category-1'), []);
  assert.equal(filterProviders(demoCatalog, '').length, 5);
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

test('draft review, repeated submission and a new app instance retain the same selected service', async () => {
  const storage = memoryStorage();
  const api = createDemoStore(storage, () => now);
  const id = await api.saveDraft('provider-2', 'service-2', form);
  const review = await api.review(id);
  assert.equal(review.provider.display_name, 'Francis Romay');
  assert.equal(review.price.total_centavos, 45000);
  await assert.rejects(api.submit(id, 1), /price changed/);
  const [first, second] = await Promise.all([api.submit(id, 45000), api.submit(id, 45000)]);
  assert.equal(first, second);
  const reopened = createDemoStore(storage, () => now);
  assert.equal((await reopened.bookings()).length, 1);
  const booking = await reopened.booking(first);
  assert.equal(booking.provider_id, 'provider-2');
  assert.equal(booking.description, form.description);
  assert.equal(booking.address_snapshot.line1, form.line1);
  assert.equal(booking.status, 'requested');
  assert.equal(booking.demo, true);
});

test('invalid or failed saves never create a phantom successful request', async () => {
  const storage = memoryStorage();
  const api = createDemoStore(storage, () => now);
  await assert.rejects(api.saveDraft('provider-2', 'service-1', form), /no longer available/);
  assert.equal(storage.values.size, 0);
  await assert.rejects(createDemoStore({ ...storage, setItem: async () => { throw new Error('Storage unavailable'); } }, () => now).saveDraft('provider-2', 'service-2', form), /Storage unavailable/);
  assert.equal((await api.bookings()).length, 0);
});

test('reset removes only the demo key and leaves unrelated authentication storage untouched', async () => {
  const storage = memoryStorage();
  storage.values.set('auth-token', 'unrelated-session');
  storage.values.set(DEMO_STORAGE_KEY, 'corrupt');
  const api = createDemoStore(storage, () => now);
  await assert.rejects(api.bookings(), /could not be read/);
  await api.reset();
  assert.equal(storage.values.get('auth-token'), 'unrelated-session');
  assert.deepEqual(await api.bookings(), []);
});
