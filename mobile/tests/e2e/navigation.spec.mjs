import { test as base, expect } from '@playwright/test';
import { installBackend, signIn } from '../fixtures/backend.mjs';

const test = base.extend({ backend: async ({ page }, provideFixture) => { await provideFixture(await installBackend(page)); } });
test.beforeEach(async ({ backend }) => { expect(backend.bookings).toEqual([]); });

async function openReview(page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Browse Plumbing', exact: true }).click();
  await expect(page.getByRole('button', { name: 'View Art Ecleo', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'View Francis Romay', exact: true }).click();
  await page.getByRole('button', { name: 'Choose Plumbing home service', exact: true }).click();
  await expect(page).toHaveURL(/sign-in/);
  await signIn(page);
  await expect(page).toHaveURL(/book\/provider-2\/service-2/);
  await page.getByRole('textbox', { name: 'Describe the task', exact: true }).fill('Repair the leaking kitchen pipe behind the sink.');
  await page.getByRole('textbox', { name: 'Complete service address', exact: true }).fill('12 Sample Street, Poblacion');
  await page.getByRole('textbox', { name: 'Postal code', exact: true }).fill('8506');
  await page.getByRole('button', { name: /8:00/ }).click();
  await page.getByRole('button', { name: 'Save and review request', exact: true }).click();
  await expect(page).toHaveURL(/review\/20000000/);
}

async function confirm(page) {
  await page.getByRole('checkbox', { name: 'I checked the service, address, and schedule', exact: true }).click();
  await page.getByRole('button', { name: 'Submit booking request', exact: true }).click();
}

test('provider selection passes the correct record and supports back navigation', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByText(/Lab demo|SAMPLE RECORDS|Use live services/i)).toHaveCount(0);
  await page.getByRole('button', { name: 'Find a professional', exact: true }).click();
  await page.getByRole('button', { name: 'View Francis Romay', exact: true }).click();
  await expect(page).toHaveURL(/providers\/provider-2/);
  await expect(page.getByRole('heading', { name: 'Francis Romay', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Go back', exact: true }).click();
  await page.getByRole('button', { name: 'View Art Ecleo', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Art Ecleo', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Francis Romay', exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('connected customer flow signs in, edits, submits and reloads the selected booking', async ({ page, backend }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await openReview(page);
  const reviewUrl = page.url();
  await expect(page.getByText('With Francis Romay', { exact: true })).toBeVisible();
  await expect(page.getByText('12 Sample Street, Poblacion, Bunawan 8506', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit booking request', exact: true })).toBeDisabled();
  await page.reload();
  await expect(page.getByText('With Francis Romay', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit request details', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Complete service address', exact: true })).toHaveValue('12 Sample Street, Poblacion');
  await page.getByRole('textbox', { name: 'Complete service address', exact: true }).fill('24 Updated Street, Poblacion');
  await page.getByRole('button', { name: 'Save and review request', exact: true }).click();
  await expect(page).toHaveURL(reviewUrl);
  await expect(page.getByText('24 Updated Street, Poblacion, Bunawan 8506', { exact: true })).toBeVisible();
  await confirm(page);
  await expect(page.getByText('Your booking request has been saved and sent for provider acceptance.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open booking SG-TEST-0001', exact: true }).click();
  await expect(page.getByText('Repair the leaking kitchen pipe behind the sink.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Plumbing home service', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Navigate to Bookings', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open booking SG-TEST-0001', exact: true })).toHaveCount(1);
  expect(backend.confirmations).toBe(1);
  expect(backend.bookings[0].address_snapshot.line1).toBe('24 Updated Street, Poblacion');
  expect(errors).toEqual([]);
});

test('invalid selections and empty searches have recovery actions', async ({ page }) => {
  await page.goto('/sign-in'); await signIn(page);
  await page.goto('/book/provider-2/service-2?draftId=unavailable');
  await expect(page.getByRole('heading', { name: 'This record is unavailable', exact: true })).toBeVisible();
  await page.goto('/book/provider-2/service-1');
  await expect(page.getByRole('heading', { name: 'This record is unavailable', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Find a professional', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search professionals', exact: true }).fill('No matching professional');
  await expect(page.getByRole('heading', { name: 'No professionals found', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await expect(page.getByRole('button', { name: 'View Art Ecleo', exact: true })).toBeVisible();
});

test('failed server confirmation stays on review without a false success', async ({ page, backend }) => {
  await openReview(page); backend.failSubmit = true;
  await confirm(page);
  await expect(page.getByRole('alert')).toContainText('This time is no longer available');
  await expect(page).toHaveURL(/review\//);
  expect(backend.bookings).toEqual([]);
  backend.failSubmit = false;
  await page.getByRole('button', { name: 'Submit booking request', exact: true }).click();
  await expect(page).toHaveURL(/bookings/);
  expect(backend.bookings).toHaveLength(1);
});

test('catalog connection failure has a working retry and no sample fallback', async ({ page, backend }) => {
  backend.failCatalog = true; await page.goto('/find');
  await expect(page.getByRole('alert')).toContainText('Services are temporarily unavailable');
  await expect(page.getByRole('button', { name: 'View Art Ecleo', exact: true })).toHaveCount(0);
  backend.failCatalog = false;
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('button', { name: 'View Art Ecleo', exact: true })).toBeVisible();
});

test('sign-out removes private records and protects reloaded booking URLs', async ({ page }) => {
  await openReview(page); await confirm(page);
  await page.getByRole('button', { name: 'Navigate to Home', exact: true }).click();
  await page.getByRole('button', { name: 'Sign out of this device', exact: true }).click();
  await page.getByRole('button', { name: 'Navigate to Bookings', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign in to continue', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open booking SG-TEST-0001', exact: true })).toHaveCount(0);
  await page.goto('/bookings/30000000-0000-4000-8000-000000000001');
  await expect(page.getByRole('button', { name: 'Sign in to continue', exact: true })).toBeVisible();
  await expect(page.getByText('Repair the leaking kitchen pipe behind the sink.', { exact: true })).toHaveCount(0);
});

for (const role of ['provider', 'admin']) {
  test(`${role} label comes from verified server context`, async ({ page, backend }) => {
    backend.role = role;
    await page.goto('/sign-in'); await signIn(page);
    const home = page.getByTestId('screen-Home').filter({ visible: true });
    await expect(home.getByText(role === 'admin' ? 'Admin' : 'Provider', { exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Navigate to Bookings', exact: true }).click();
    await expect(page.getByRole('button', { name: 'All requests', exact: true })).toBeVisible();
    await page.goto('/book/provider-2/service-2');
    await expect(page.getByText('This request needs a customer account.', { exact: false })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Describe the task', exact: true })).toHaveCount(0);
  });
}

test('all eight screens fit phone, tablet, laptop and landscape widths', async ({ page }) => {
  test.setTimeout(120000);
  await openReview(page); await confirm(page);
  const routes = [
    ['/', 'Home'], ['/find', 'FindProfessionals'], ['/providers/provider-2', 'ProviderDetails'],
    ['/book/provider-2/service-2', 'BookingForm'], ['/review/20000000-0000-4000-8000-000000000001', 'BookingReview'],
    ['/bookings', 'MyBookings'], ['/bookings/30000000-0000-4000-8000-000000000001', 'BookingRecord'], ['/sign-in', 'SignIn']
  ];
  for (const [url, screen] of routes) {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId(`screen-${screen}`)).toBeVisible();
    if (screen === 'Home') await expect(page.getByRole('button', { name: 'Browse Plumbing', exact: true })).toBeVisible();
    if (screen === 'FindProfessionals') await expect(page.getByRole('button', { name: 'View Art Ecleo', exact: true })).toBeVisible();
    if (screen === 'ProviderDetails') await expect(page.getByRole('button', { name: 'Choose Plumbing home service', exact: true })).toBeVisible();
    if (screen === 'BookingForm') await expect(page.getByRole('textbox', { name: 'Describe the task', exact: true })).toBeVisible();
    if (screen === 'BookingReview') await expect(page.getByRole('button', { name: 'Submit booking request', exact: true })).toBeVisible();
    if (screen === 'MyBookings') await expect(page.getByRole('button', { name: 'Open booking SG-TEST-0001', exact: true })).toBeVisible();
    if (screen === 'BookingRecord') await expect(page.getByText('Repair the leaking kitchen pipe behind the sink.', { exact: true })).toBeVisible();
    for (const [width, height] of [[320, 900], [375, 900], [412, 900], [768, 1024], [1366, 900], [900, 450]]) {
      await page.setViewportSize({ width, height });
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${screen} at ${width}`).toBeLessThanOrEqual(width + 1);
      await expect(page.getByText(/Lab demo|SAMPLE RECORDS|Use live services/i)).toHaveCount(0);
      if (screen !== 'SignIn') await expect(page.getByRole('button', { name: 'Navigate to Home', exact: true })).toBeVisible();
      if (screen === 'Home' && [375, 1366].includes(width)) await page.screenshot({ path: `../.cache/mobile-live-home-${width}.png` });
    }
  }
});
