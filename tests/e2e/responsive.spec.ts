import { test, expect } from '@playwright/test';
import { publicFixtures } from './public-fixtures';

test.beforeEach(async ({ page }) => { await publicFixtures(page); });

for (const width of [320, 375, 768, 1024, 1440, 1920]) {
  test(`layouts fit a ${width}px viewport with usable form controls`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/', '/find/', '/services/', '/providers/profile/?id=20000000-0000-4000-8000-000000000002', '/login/', '/register/', '/support/', '/download/', '/preview/?view=admin']) {
      await page.goto(path);
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page.getByRole('status', { name: 'Loading', exact: true })).toHaveCount(0);
      const layout = await page.evaluate(() => ({
        viewport: innerWidth, document: document.documentElement.scrollWidth,
        inputs: [...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]), select, textarea')]
          .filter(element => element.getBoundingClientRect().width > 0)
          .map(element => ({ width: element.getBoundingClientRect().width, size: parseFloat(getComputedStyle(element).fontSize) }))
      }));
      expect(layout.document, `${path} at ${width}px overflows horizontally`).toBeLessThanOrEqual(layout.viewport + 1);
      if (path === '/' && [375, 1440].includes(width)) await page.screenshot({ path: `.cache/qa-home-${width}.png`, fullPage: true });
      if (width <= 700) for (const input of layout.inputs) expect(input.size, `${path}: avoid iOS focus zoom`).toBeGreaterThanOrEqual(16);
    }
  });
}

test('phone navigation supports keyboard dismissal and page navigation', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const menu = page.getByRole('button', { name: 'Open navigation' });
  await menu.click();
  await expect(page.getByRole('dialog', { name: 'Navigation' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(menu).toBeFocused();
  await menu.click();
  await page.getByRole('dialog').getByRole('link', { name: 'Find a professional' }).click();
  await expect(page).toHaveURL(/\/find\//);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('Bunawan map switches to an embedded satellite view without opening tabs', async ({ page }) => {
  await page.goto('/find/');
  const tabs = page.context().pages().length;
  await page.getByRole('button', { name: 'Satellite', exact: true }).click();
  await expect(page.locator('iframe[title*="Bunawan"]')).toHaveAttribute('src', /google\.com\/maps\/embed/);
  expect(page.context().pages()).toHaveLength(tabs);
  await page.getByRole('button', { name: 'Street', exact: true }).click();
  await expect(page.locator('iframe[title*="Bunawan"]')).toHaveCount(0);
});

test('discovery filters survive reload and profile navigation', async ({ page }) => {
  await page.goto('/find/');
  await page.getByLabel('Maximum starting price').fill('600');
  await page.getByLabel('Minimum rating').selectOption('4');
  await page.getByLabel('Sort by').selectOption('price');
  await page.getByRole('button', { name: 'List only', exact: true }).click();
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await page.reload();
  await expect(page.getByLabel('Maximum starting price')).toHaveValue('600');
  await expect(page.getByLabel('Minimum rating')).toHaveValue('4');
  await expect(page.getByLabel('Sort by')).toHaveValue('price');
  await expect(page.getByRole('button', { name: 'List only' })).toHaveAttribute('aria-pressed', 'true');
});

test('published APK remains available if optional release lookup fails', async ({ page }) => {
  await page.route('**/*.supabase.co/rest/v1/app_releases*', route => route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ message: 'Release lookup unavailable' }) }));
  await page.goto('/download/');
  await expect(page.getByRole('link', { name: 'Download APK', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Take SerbisyoGo with you.' })).toBeVisible();
});

test('every admin section and private workflow denies anonymous access', async ({ page }) => {
  for (const path of ['/admin/', '/admin/providers/', '/admin/customers/', '/admin/bookings/', '/admin/services/', '/admin/payouts/', '/admin/transactions/', '/admin/reports/', '/admin/complaints/', '/admin/announcements/', '/admin/settings/']) {
    await page.goto(path);
    await expect(page.getByText(/Administrator sign in required|Connect your Supabase backend/)).toBeVisible();
    await expect(page.getByRole('table')).toHaveCount(0);
  }
  for (const path of ['/account/', '/book/', '/book/schedule/', '/book/payment/', '/bookings/', '/provider/', '/messages/']) {
    await page.goto(path);
    await expect(page.getByText(/Sign in to continue|Connect your Supabase backend/)).toBeVisible();
    await expect(page.getByRole('table')).toHaveCount(0);
  }
});

test('provider service links lead to a protected booking form', async ({ page }) => {
  await page.goto('/find/');
  await page.getByRole('link', { name: 'View profile' }).nth(1).click();
  await expect(page.getByRole('heading', { name: 'Francis Romay', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Request service' }).first().click();
  await expect(page).toHaveURL(/\/book\/\?provider=/);
  await expect(page.getByText(/Sign in to continue|Connect your Supabase backend/)).toBeVisible();
});

test('phone calls to action keep normal button heights', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  for (const name of ['Become a provider', 'Android app details']) {
    const button = page.getByRole('link', { name, exact: true });
    await expect(button).toBeVisible();
    const bounds = await button.boundingBox();
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
    expect(bounds!.height).toBeLessThan(80);
  }
});
