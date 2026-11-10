import { test, expect } from '@playwright/test';
import { publicFixtures } from './public-fixtures';

test.beforeEach(async ({ page }) => { await publicFixtures(page); });

test('visitors have discovery navigation without private workspace links', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const header = page.getByRole('banner');
  await expect(header.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  await expect(header.getByRole('link', { name: 'Find a professional' })).toBeVisible();
  for (const name of ['My bookings', 'My dashboard', 'Messages', 'Invoices', 'Account settings']) await expect(page.getByRole('link', { name, exact: true })).toHaveCount(0);
  const sections = await page.locator('main h2').allTextContents();
  expect(sections.indexOf('What needs attention at home?')).toBeLessThan(sections.indexOf('Local skills. A reliable helping hand.'));
});

test('phone category grid stays compact and supporting descriptions stay readable', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 812 });
  await page.goto('/');
  await expect(page.locator('.category-grid-preview .category-card').first()).toBeVisible();
  const layout = await page.evaluate(() => ({
    columns: getComputedStyle(document.querySelector('.category-grid-preview')!).gridTemplateColumns.split(' ').length,
    descriptionSize: parseFloat(getComputedStyle(document.querySelector('.provider-card > p')!).fontSize),
    width: innerWidth, documentWidth: document.documentElement.scrollWidth
  }));
  expect(layout.columns).toBe(2);
  expect(layout.descriptionSize).toBeGreaterThanOrEqual(13);
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.width + 1);
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('dialog').getByRole('link', { name: 'Services', exact: true })).toBeVisible();
  await page.getByRole('dialog').getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('public navigation stays usable around its collapse breakpoint', async ({ page }) => {
  await page.goto('/');
  for (const width of [700, 1100, 1101, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const header = page.getByRole('banner');
    await expect(header.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();
    if (width <= 1100) await expect(header.getByRole('button', { name: 'Open navigation' })).toBeVisible();
    else await expect(header.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
    const dimensions = await page.evaluate(() => ({ width: innerWidth, document: document.documentElement.scrollWidth }));
    expect(dimensions.document).toBeLessThanOrEqual(dimensions.width + 1);
  }
});
