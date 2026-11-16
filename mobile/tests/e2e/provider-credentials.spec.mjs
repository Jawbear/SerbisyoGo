import { test, expect } from '@playwright/test';
import { Buffer } from 'node:buffer';
import { installBackend, signIn } from '../fixtures/backend.mjs';

test('credential upload sends an explicit category and updates the checklist', async ({ page }) => {
  await installBackend(page);
  const files = [{ id: 'old-file', kind: 'verification', original_name: '[Government ID] old.pdf', verification_category: null, byte_size: 100, mime_type: 'application/pdf' }];
  await page.route('**/rest/v1/provider_profiles*', route => route.fulfill({ json: { id: '10000000-0000-4000-8000-000000000001', display_name: 'Test Account', status: 'pending' } }));
  await page.route('**/rest/v1/provider_applications*', route => route.fulfill({ json: [] }));
  await page.route('**/rest/v1/files*', route => route.fulfill({ json: files }));
  let uploads = 0;
  await page.route('**/functions/v1/files*', route => {
    const body = route.request().postDataBuffer().toString();
    expect(body).toMatch(/name="verification_category"\r?\n\r?\ngov_id/);
    files.push({ id: 'new-file', kind: 'verification', original_name: '[Government ID] Test ID.png', verification_category: 'gov_id', byte_size: 100, mime_type: 'image/png' });
    uploads++;
    return route.fulfill({ status: 201, json: { id: 'new-file' } });
  });
  await page.goto('/sign-in');
  await signIn(page);
  await page.goto('/provider/verification');
  await expect(page.getByText('1. Valid Government ID (Required)', { exact: true })).toBeVisible();
  await expect(page.getByText('Category required — upload again', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Credential title or specification', exact: true }).fill('Test ID');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Choose document or image', exact: true }).click();
  await (await chooser).setFiles({ name: 'pixel.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=', 'base64') });
  await page.getByRole('button', { name: 'Upload credential document', exact: true }).click();
  await expect(page.getByText('1. Valid Government ID (Uploaded)', { exact: true })).toBeVisible();
  expect(uploads).toBe(1);
});
