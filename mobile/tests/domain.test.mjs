import test from 'node:test';
import assert from 'node:assert/strict';
import { findService, filterProviders, manilaDay, validateRequest, withProviderNames, parseDocInfo, formatVerificationFileName, checkVerificationCompleteness } from '../src/domain.js';
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

test('booking cards receive provider display names without inventing missing profiles', () => {
  const rows = withProviderNames(
    [{ id: 'booking-1', provider_id: 'provider-1' }, { id: 'booking-2', provider_id: 'provider-2' }, { id: 'booking-3', provider_id: 'missing' }],
    [{ id: 'provider-1', display_name: 'Francis Romay' }]
  );
  assert.equal(rows[0].provider_name, 'Francis Romay');
  assert.equal(rows[1].provider_name, '');
  assert.equal(rows[2].provider_name, '');
  assert.equal(rows[0].id, 'booking-1');
});

test('mobile provider verification documents parse categories, format filenames and evaluate completeness', () => {
  const formatted = formatVerificationFileName('TESDA NC II', 'Electrical Installation & Maintenance', 'scan.pdf');
  assert.equal(formatted, '[TESDA NC II] Electrical Installation  Maintenance.pdf');

  const parsed = parseDocInfo('[Government ID] National ID.jpg');
  assert.equal(parsed.isCategorized, true);
  assert.equal(parsed.badge, 'Government ID');
  assert.equal(parsed.category?.id, 'gov_id');

  const completeness = checkVerificationCompleteness([
    { original_name: '[Government ID] Passport.jpg' },
    { original_name: '[TESDA NC II] Plumbing NC2.pdf' },
    { original_name: '[Clearance] Police Clearance.pdf' }
  ]);
  assert.equal(completeness.isComplete, true);
  assert.equal(completeness.missing.length, 0);

  const incomplete = checkVerificationCompleteness([
    { original_name: '[Government ID] Passport.jpg' }
  ]);
  assert.equal(incomplete.isComplete, false);
  assert.equal(incomplete.missing.length, 2);
});
