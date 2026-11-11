import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

// Explicit opt-in: uses existing development fixtures, with no application writes.
// Traces are disabled because real development credentials enter the login form.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });
test.skip(process.env.E2E_DEVELOPMENT_READONLY !== '1', 'Opt in to read-only checks against the designated development project.');

const routes = {
  customer: ['/account/', '/dashboard/', '/bookings/', '/messages/', '/notifications/', '/support/'],
  provider: ['/account/', '/provider/', '/provider/profile/', '/provider/availability/', '/messages/'],
  admin: ['/account/', '/admin/', '/admin/providers/', '/admin/customers/', '/admin/bookings/', '/admin/services/', '/admin/payouts/', '/admin/transactions/', '/admin/reports/', '/admin/complaints/', '/admin/announcements/', '/admin/settings/']
};

for (const role of ['customer', 'provider', 'admin'] as const) {
  test(`${role} can sign in and read their development workspaces`, async ({ page }) => {
    test.setTimeout(180000);
    const manifest = JSON.parse(await readFile('.cache/development-users.json', 'utf8'));
    expect(new URL(manifest.project).origin).toBe(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin);
    const account = manifest.accounts[role === 'admin' ? 'admin' : `${role}1`];
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(role === 'admin' ? '/admin/login/' : '/login/');
    await page.getByLabel(role === 'admin' ? 'Work email' : 'Email address', { exact: true }).fill(account.email);
    await page.getByLabel('Password', { exact: true }).fill(account.password);
    await page.getByRole('button', { name: role === 'admin' ? 'Administrator sign in' : 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(role === 'admin' ? /\/admin\/$/ : role === 'provider' ? /\/provider\/$/ : /\/dashboard\/$/, { timeout: 30000 });
    for (const path of routes[role]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      await expect(page.getByRole('status', { name: 'Loading', exact: true })).toHaveCount(0, { timeout: 30000 });
      await expect(page.locator('main .notice.error'), `Backend read errors on ${path}`).toHaveCount(0);
      await expect(page.getByText('Access denied.', { exact: false })).toHaveCount(0);
      if (path === '/account/') await expect(page.locator('.account-identity').getByLabel(`Account role: ${role === 'admin' ? 'Admin' : role === 'provider' ? 'Provider' : 'Customer'}`, { exact: true })).toBeVisible();
    }
    expect(errors, 'Uncaught browser errors during workspace navigation').toEqual([]);
  });
}
