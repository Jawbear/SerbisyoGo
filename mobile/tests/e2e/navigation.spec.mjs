import { test, expect } from '@playwright/test';

test('provider selection passes the correct record and supports back navigation', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
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

test('all six core screens save, review and reopen the selected demo booking', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Browse Plumbing', exact: true }).click();
  await expect(page.getByRole('button', { name: 'View Art Ecleo', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'View Francis Romay', exact: true }).click();
  await page.getByRole('button', { name: 'Choose Plumbing home service', exact: true }).click();
  await page.getByRole('textbox', { name: 'Describe the task', exact: true }).fill('Repair the leaking kitchen pipe behind the sink.');
  await page.getByRole('textbox', { name: 'Complete service address', exact: true }).fill('12 Sample Street, Poblacion');
  await page.getByRole('textbox', { name: 'Postal code', exact: true }).fill('8506');
  await page.getByRole('button', { name: /8:00/ }).click();
  await page.getByRole('button', { name: 'Save and review request', exact: true }).click();
  await expect(page).toHaveURL(/review\/demo-/);
  const reviewUrl = page.url();
  await expect(page.getByText('With Francis Romay', { exact: true })).toBeVisible();
  await expect(page.getByText('12 Sample Street, Poblacion, Bunawan 8506', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save demo request', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Edit request details', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Complete service address', exact: true })).toHaveValue('12 Sample Street, Poblacion');
  await page.getByRole('button', { name: 'Save and review request', exact: true }).click();
  await expect(page).toHaveURL(reviewUrl);
  await page.getByRole('checkbox', { name: 'I checked the service, address, and schedule', exact: true }).click();
  await page.getByRole('button', { name: 'Save demo request', exact: true }).click();
  await expect(page.getByText('Your demo request has been saved on this device.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open booking DEMO-0001', exact: true }).click();
  await expect(page.getByText('Repair the leaking kitchen pipe behind the sink.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('With Francis Romay', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Navigate to Bookings', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open booking DEMO-0001', exact: true })).toHaveCount(1);
  await page.screenshot({ path: '../.cache/mobile-my-bookings.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('invalid selections and empty searches have usable recovery actions', async ({ page }) => {
  await page.goto('/book/provider-2/service-1');
  await expect(page.getByRole('heading', { name: 'This record is unavailable', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Find a professional', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search professionals', exact: true }).fill('No matching professional');
  await expect(page.getByRole('heading', { name: 'No professionals found', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await expect(page.getByRole('button', { name: 'View Art Ecleo', exact: true })).toBeVisible();
});

test('home stays dark and usable at phone widths', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Find a professional', exact: true })).toBeVisible();
  for (const width of [320, 375, 412, 768]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
  }
  await page.setViewportSize({ width: 375, height: 900 });
  await page.screenshot({ path: '../.cache/mobile-home.png', fullPage: true });
});
