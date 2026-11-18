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
    return route.fulfill({ json: { id: '10000000-0000-4000-8000-000000000002', aud: 'authenticated', role: 'authenticated', email: submitted.email, identities: [{ provider: 'email' }], user_metadata: submitted.data } });
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

test('unconfirmed email sign-in can resend and verify an eight-digit code', async ({ page }) => {
  await installBackend(page);
  const email = 'customer@example.test';
  let resend;
  const attempts = [];
  await page.route('**/auth/v1/token?grant_type=password', route => route.fulfill({
    status: 400, json: { code: 'email_not_confirmed', msg: 'Email not confirmed' }
  }));
  await page.route('**/auth/v1/resend*', route => {
    resend = route.request().postDataJSON();
    return route.fulfill({ json: {} });
  });
  await page.route('**/auth/v1/verify*', route => {
    attempts.push(route.request().postDataJSON());
    return route.fallback();
  });

  await page.goto('/sign-in?returnTo=MyBookings');
  await page.getByLabel('Email address', { exact: true }).fill(email.toUpperCase());
  await page.getByLabel('Password', { exact: true }).fill('fixture-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByTestId('screen-VerifyEmail')).toBeVisible();
  await expect(page.getByLabel('Email address', { exact: true })).toHaveValue(email);
  await page.getByRole('button', { name: 'Resend verification code', exact: true }).click();
  await expect(page.getByText('A fresh verification code was sent. Please check your inbox.', { exact: true })).toBeVisible();
  expect(resend).toMatchObject({ email, type: 'signup' });

  const code = page.getByLabel('Verification code', { exact: true });
  const verify = page.getByRole('button', { name: 'Verify code & sign in', exact: true });
  await code.fill('1234');
  await verify.click();
  await expect(page.getByRole('alert')).toContainText('Enter the verification code');
  expect(attempts).toHaveLength(0);

  await code.fill('1234 5678');
  await verify.click();
  await expect(page.getByTestId('screen-MyBookings')).toBeVisible();
  expect(attempts).toMatchObject([{ email, token: '12345678', type: 'email' }]);
});

for (const scenario of ['email', 'name', 'unavailable', 'malformed']) {
  test(`registration blocks signup when availability reports ${scenario}`, async ({ page }) => {
    await installBackend(page);
    let signups = 0;
    await page.route('**/auth/v1/signup*', route => { signups++; return route.fulfill({ json: {} }); });
    await page.route('**/rest/v1/rpc/check_registration_availability', route => route.fulfill(
      scenario === 'unavailable' ? { status: 503, json: { message: 'Account check temporarily unavailable' } }
        : { json: scenario === 'malformed' ? {} : { available: false, error: `This ${scenario} is already registered.` } }
    ));
    await page.goto('/register');
    await page.getByRole('textbox', { name: 'Full name', exact: true }).fill('New Tester');
    await page.getByRole('textbox', { name: 'Email address', exact: true }).fill('new-tester@example.test');
    await page.getByRole('textbox', { name: 'Philippine mobile number', exact: true }).fill('09171234567');
    await page.getByLabel('Password', { exact: true }).fill('TestingPassword123!');
    await page.getByLabel('Confirm password', { exact: true }).fill('TestingPassword123!');
    await page.getByRole('checkbox', { name: 'Accept privacy notice and service terms' }).click();
    await page.getByRole('button', { name: 'Create account', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText(scenario === 'unavailable' ? 'temporarily unavailable' : scenario === 'malformed' ? 'Unable to check' : 'already registered');
    expect(signups).toBe(0);
  });
}
