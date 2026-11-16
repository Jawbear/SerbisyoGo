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
  await page.route('**/rest/v1/rpc/check_registration_availability', route => route.fulfill({ json: { available: true } }));
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

test('administrator navigation stays focused on admin work on the account page', async ({ page, isMobile }) => {
  await loginFixture(page, 'admin');
  await page.goto('/admin/login/');
  await page.getByLabel('Work email', { exact: true }).fill('navigation@example.test');
  await page.getByLabel('Password', { exact: true }).fill('FixturePasswordOnly123!');
  await page.getByRole('button', { name: 'Administrator sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/$/);
  await page.goto('/account/');
  await expect(page.getByRole('heading', { name: 'Personal information' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Saved addresses' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Apply as a service provider' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Book a service', exact: true })).toHaveCount(0);
  if (isMobile) await page.getByRole('button', { name: 'Open navigation' }).click();
  const nav = isMobile ? page.getByRole('dialog').getByRole('navigation', { name: 'Administration' }) : page.locator('aside').getByRole('navigation', { name: 'Administration' });
  await expect(nav.getByRole('link', { name: 'User accounts', exact: true })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'My account', exact: true })).toHaveAttribute('aria-current', 'page');
  for (const name of ['Find a professional', 'My bookings', 'Invoices', 'Provider portal']) {
    await expect(nav.getByRole('link', { name, exact: true })).toHaveCount(0);
  }
  if (isMobile) await expect(page.getByRole('dialog').getByRole('link', { name: 'Download Android app' })).toHaveCount(0);
});

for (const scenario of ['email', 'name', 'unavailable'] as const) {
  test(`registration stops before signup when duplicate check reports ${scenario}`, async ({ page }) => {
    await publicFixtures(page);
    let signups = 0;
    await page.route('**/auth/v1/signup*', route => { signups++; return route.fulfill({ json: {} }); });
    await page.route('**/rest/v1/rpc/check_registration_availability', route => route.fulfill(scenario === 'unavailable'
      ? { status: 503, json: { message: 'Account check temporarily unavailable' } }
      : { json: { available: false, field: scenario, error: `This ${scenario === 'email' ? 'email address' : 'full name'} is already registered.` } }));
    await page.goto('/register/');
    await page.getByLabel('Full name', { exact: true }).fill('Shared Firstname');
    await page.getByLabel('Philippine mobile number', { exact: true }).fill('09171234567');
    await page.getByLabel('Email address', { exact: true }).fill('duplicate@example.test');
    await page.getByLabel('Password', { exact: true }).fill('TestingPassword123!');
    await page.getByLabel('Confirm password', { exact: true }).fill('TestingPassword123!');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Create an account', exact: true }).click();
    await expect(page.getByRole('main').getByRole('alert')).toContainText(scenario === 'unavailable' ? 'temporarily unavailable' : 'already registered');
    expect(signups).toBe(0);
    await expect(page).toHaveURL(/\/register\/$/);
  });
}


test('website registration preserves the email for verification and normalizes customer details', async ({ page }) => {
  await publicFixtures(page); let input: Record<string, unknown> | undefined;
  await page.route('**/rest/v1/rpc/check_registration_availability', route => route.fulfill({ json: { available: true } }));
  await page.route('**/auth/v1/signup*', route => {
    input = route.request().postDataJSON();
    return route.fulfill({ json: { id: '40000000-0000-4000-8000-000000000002', aud: 'authenticated', role: 'authenticated', email: input!.email, identities: [{ provider: 'email' }], user_metadata: input!.data } });
  });
  await page.goto('/register/');
  await page.getByLabel('Full name', { exact: true }).fill('New Web Tester');
  await page.getByLabel('Philippine mobile number', { exact: true }).fill('09171234567');
  await page.getByLabel('Email address', { exact: true }).fill('new-web-tester@example.test');
  await page.getByLabel('Password', { exact: true }).fill('TestingPassword123!');
  await page.getByLabel('Confirm password', { exact: true }).fill('TestingPassword123!');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Create an account', exact: true }).click();
  await expect(page).toHaveURL(url => url.pathname === '/verify/' && url.searchParams.get('email') === 'new-web-tester@example.test');
  await expect(page.getByLabel('Email address', { exact: true })).toHaveValue('new-web-tester@example.test');
  expect(input?.data).toEqual({ full_name: 'New Web Tester', phone: '+639171234567', consent: true });
});
