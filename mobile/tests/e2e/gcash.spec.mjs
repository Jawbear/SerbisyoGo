import { test, expect } from '@playwright/test';
import { Buffer } from 'node:buffer';
import { installBackend, signIn } from '../fixtures/backend.mjs';

test('GCash receipt submission stays pending and prevents a second payment submission', async ({ page }) => {
  const backend = await installBackend(page); const submissions = []; let submitted;
  const booking = { id: '30000000-0000-4000-8000-000000000001', customer_id: '10000000-0000-4000-8000-000000000001', provider_id: 'provider-1', reference: 'SG-GCASH-TEST', service_title: 'Test repair', description: 'Fictional completed repair.', starts_at: '2026-11-15T00:00:00Z', address_snapshot: { line1: '12 Sample Street', city: 'Bunawan', postal_code: '8506' }, status: 'completed', total_centavos: 55000 };
  backend.bookings.push(booking);
  await page.route('**/rest/v1/gcash_settings*', route => route.fulfill({ json: { enabled: true, recipient_name: 'Fictional Test Wallet', recipient_phone: '09171234567', instructions: 'Testing only' } }));
  await page.route('**/rest/v1/gcash_submissions*', route => route.fulfill({ json: submissions }));
  await page.route('**/functions/v1/files', route => route.fulfill({ status: 201, json: { id: 'receipt-test-id' } }));
  await page.route('**/rest/v1/rpc/submit_gcash_receipt', route => {
    submitted = route.request().postDataJSON(); submissions.push({ id: 'submission-test-id', reference: submitted.p_reference, status: 'pending' });
    return route.fulfill({ json: 'submission-test-id' });
  });
  await page.goto('/sign-in'); await signIn(page);
  await page.goto(`/bookings/${booking.id}`);
  await expect(page.getByText('Fictional Test Wallet', { exact: true })).toBeVisible();
  await expect(page.getByText('Send exactly ₱550.00', { exact: true })).toBeVisible();
  for (const width of [320, 768, 1366]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
  }
  await page.getByRole('textbox', { name: 'GCash transaction reference' }).fill('1234567890123');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Choose GCash receipt', exact: true }).click();
  await (await chooser).setFiles({ name: 'receipt.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN6sAAAAASUVORK5CYII=', 'base64') });
  await page.getByRole('button', { name: 'Submit GCash receipt', exact: true }).click();
  await expect(page.getByText('Awaiting verification', { exact: true })).toBeVisible();
  expect(submitted).toEqual({ p_booking: booking.id, p_reference: '1234567890123', p_receipt: 'receipt-test-id', p_expected_amount: 55000, p_recipient_phone: '09171234567' });
  await expect(page.getByRole('button', { name: 'Submit GCash receipt', exact: true })).toHaveCount(0);
  await expect(page.getByText('Payment received and verified by the administrator.', { exact: true })).toHaveCount(0);
});
