import { test, expect } from '@playwright/test';
import { installBackend, signIn } from '../fixtures/backend.mjs';
test('administration stays on the website even for an administrator account', async ({ page }) => {
  const backend = await installBackend(page); backend.role = 'admin';
  await page.goto('/sign-in'); await signIn(page);
  await expect(page.getByText('Administration is available on the SerbisyoGo website.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open administration', exact: true })).toHaveCount(0);
  expect(backend.accountActions).toEqual([]);
});
test('old mobile admin links do not expose account controls', async ({ page }) => {
  const backend = await installBackend(page); await page.goto('/admin/accounts');
  await expect(page.getByTestId('screen-Home')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create user account', exact: true })).toHaveCount(0);
  expect(backend.accountActions).toEqual([]);
});
