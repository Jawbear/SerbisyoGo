import { test, expect } from '@playwright/test';
import { installBackend } from '../fixtures/backend.mjs';

test('account screens fit small phones, tablets and laptops', async ({ page }) => {
  await installBackend(page);
  for (const path of ['/register', '/verify-email', '/forgot-password']) {
    await page.goto(path);
    for (const width of [320, 768, 1366]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${path} at ${width}`).toBeLessThanOrEqual(width + 1);
    }
  }
});

test('registration submits shared customer details and offers email verification', async ({ page }) => {
  await installBackend(page); let submitted;
  await page.route('**/auth/v1/signup*', async route => {
    submitted = route.request().postDataJSON();
    return route.fulfill({ json: { id: '10000000-0000-4000-8000-000000000002', aud: 'authenticated', role: 'authenticated', email: submitted.email, identities: [], user_metadata: submitted.data } });
  });
  await page.goto('/register');
  await page.getByRole('textbox', { name: 'Full name', exact: true }).fill('New Tester');
  await page.getByRole('textbox', { name: 'Email address', exact: true }).fill('new-tester@example.test');
  await page.getByRole('textbox', { name: 'Philippine mobile number', exact: true }).fill('09171234567');
  await page.getByLabel('Password', { exact: true }).fill('TestingPassword123!');
  await page.getByLabel('Confirm password', { exact: true }).fill('TestingPassword123!');
  await page.getByRole('checkbox', { name: 'Accept privacy notice and service terms' }).click();
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByTestId('screen-VerifyEmail')).toBeVisible();
  expect(submitted.data).toEqual({ full_name: 'New Tester', phone: '+639171234567', consent: true });
  expect(submitted.data.role).toBeUndefined();
  await expect(page.getByRole('textbox', { name: 'Email address' })).toHaveValue('new-tester@example.test');
});

test('registration keeps fields and displays an error when the server rejects signup', async ({ page }) => {
  await installBackend(page);
  await page.route('**/auth/v1/signup*', route => route.fulfill({ status: 422, json: { code: 'weak_password', msg: 'Please use a stronger password.' } }));
  await page.goto('/register');
  await page.getByRole('textbox', { name: 'Full name', exact: true }).fill('New Tester');
  await page.getByRole('textbox', { name: 'Email address', exact: true }).fill('new-tester@example.test');
  await page.getByRole('textbox', { name: 'Philippine mobile number', exact: true }).fill('09171234567');
  await page.getByLabel('Password', { exact: true }).fill('TestingPassword123!');
  await page.getByLabel('Confirm password', { exact: true }).fill('TestingPassword123!');
  await page.getByRole('checkbox', { name: 'Accept privacy notice and service terms' }).click();
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('stronger password');
  await expect(page.getByRole('textbox', { name: 'Full name', exact: true })).toHaveValue('New Tester');
});
