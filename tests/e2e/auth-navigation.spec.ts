import { test, expect, type Page } from '@playwright/test';
import { publicFixtures } from './public-fixtures';

// Auth responses are intercepted; these checks never create or change an account.
async function loginFixture(page: Page, role: 'customer' | 'admin') {
  await publicFixtures(page);
  const user = {
    id: '40000000-0000-4000-8000-000000000001', email: 'navigation@example.test',
    aud: 'authenticated', role: 'authenticated', created_at: new Date().toISOString(),
    app_metadata: {}, user_metadata: {}
  };
  const payload = Buffer.from(JSON.stringify({ sub: user.id, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
  const session = {
    user, access_token: `eyJhbGciOiJIUzI1NiJ9.${payload}.ui-fixture`,
    refresh_token: 'ui-fixture-only', token_type: 'bearer', expires_in: 3600
  };
  await page.route('**/auth/v1/token?*', route => route.fulfill({ json: session }));
  await page.route('**/auth/v1/user', route => route.fulfill({ json: user }));
  await page.route('**/auth/v1/logout*', route => route.fulfill({ status: 204 }));
  await page.route('**/rest/v1/rpc/user_context', route => route.fulfill({ json: {
    role, profile: { id: user.id, full_name: 'Navigation Test', status: 'active', preferences: {} }
  } }));
}

test.beforeEach(() => {
  test.skip(!process.env.NEXT_PUBLIC_SUPABASE_URL, 'Requires configured client for intercepted authentication.');
});

test('sign-in returns a customer to their selected booking service', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await loginFixture(page, 'customer');
  const destination = '/book/?provider=20000000-0000-4000-8000-000000000002&service=30000000-0000-4000-8000-000000000002';
  await page.goto(destination);
  await page.getByRole('main').getByRole('link', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(url => url.searchParams.get('next') === destination);
  await page.getByLabel('Email address', { exact: true }).fill('navigation@example.test');
  await page.getByLabel('Password', { exact: true }).fill('FixturePasswordOnly123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(new RegExp('/book/\\?provider='));
  await expect(page.getByRole('combobox', { name: 'Select service', exact: true })).toHaveValue('30000000-0000-4000-8000-000000000002');
  expect(errors).toEqual([]);
});

test('admin sign-in returns to the requested protected section', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await loginFixture(page, 'admin');
  await page.goto('/admin/customers/');
  await page.getByRole('main').getByRole('link', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(url => url.searchParams.get('next') === '/admin/customers/');
  await page.getByLabel('Work email', { exact: true }).fill('navigation@example.test');
  await page.getByLabel('Password', { exact: true }).fill('FixturePasswordOnly123!');
  await page.getByRole('button', { name: 'Administrator sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/customers\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});

test('admin sign-in rejects a customer before following the return destination', async ({ page }) => {
  await loginFixture(page, 'customer');
  await page.goto('/admin/login/?next=%2Fadmin%2Fcustomers%2F');
  await page.getByLabel('Work email', { exact: true }).fill('navigation@example.test');
  await page.getByLabel('Password', { exact: true }).fill('FixturePasswordOnly123!');
  await page.getByRole('button', { name: 'Administrator sign in', exact: true }).click();
  await expect(page.getByText('Administrator access is required.', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/login\//);
});
