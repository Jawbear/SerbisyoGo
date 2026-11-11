import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.use({ trace: 'off', screenshot: 'off', video: 'off' });
test.skip(process.env.E2E_MOBILE_LIVE_READONLY !== '1', 'Explicit opt-in for actual development-account reads.');

for (const role of ['customer', 'provider', 'admin']) {
  test(`${role} signs in with the actual development account and reads assigned requests`, async ({ page }) => {
    const manifest = JSON.parse(await readFile(new URL('../../../.cache/development-users.json', import.meta.url), 'utf8'));
    expect(new URL(manifest.project).origin).toBe(new URL(process.env.EXPO_PUBLIC_SUPABASE_URL).origin);
    const account = manifest.accounts[role === 'admin' ? 'admin' : `${role}1`];
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign in to your account', exact: true }).click();
    await page.getByLabel('Email address', { exact: true }).fill(account.email);
    await page.getByLabel('Password', { exact: true }).fill(account.password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    const home = page.getByTestId('screen-Home').filter({ visible: true });
    const badge = home.getByText(role === 'admin' ? 'Admin' : role === 'provider' ? 'Provider' : 'Customer', { exact: true }).first();
    await expect(badge.or(page.getByRole('alert')).first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole('alert'), `${role} development-account authentication must succeed`).toHaveCount(0);
    await expect(badge).toBeVisible();
    await page.getByRole('button', { name: 'Navigate to Bookings', exact: true }).click();
    await expect(page.getByRole('button', { name: 'All requests', exact: true })).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
