import { test, expect } from '@playwright/test';
import { publicFixtures } from './public-fixtures';

test.beforeEach(async ({ page }) => { await publicFixtures(page); });

test('visitors have discovery navigation without private workspace links', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const header = page.getByRole('banner');
  await expect(header.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  await expect(header.getByRole('link', { name: 'Find Professionals' })).toBeVisible();
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
  await expect(page.getByRole('dialog').getByRole('link', { name: 'Browse Services', exact: true })).toBeVisible();
  await page.getByRole('dialog').getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('public navigation stays usable around its collapse breakpoint', async ({ page }) => {
  await page.goto('/');
  for (const width of [700, 1100, 1101, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const header = page.getByRole('banner');
    await expect(header.getByRole('link', { name: 'Log In', exact: true })).toBeVisible();
    if (width <= 1100) await expect(header.getByRole('button', { name: 'Open navigation' })).toBeVisible();
    else await expect(header.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
    const dimensions = await page.evaluate(() => ({ width: innerWidth, document: document.documentElement.scrollWidth }));
    expect(dimensions.document).toBeLessThanOrEqual(dimensions.width + 1);
  }
});

test('home search carries the selected service and municipality into discovery', async ({ page }, testInfo) => {
  await page.goto('/');
  const hero = page.locator('.market-hero');
  await expect(hero.getByRole('img', { name: 'A carpenter fitting a cabinet hinge' })).toBeVisible();
  await hero.getByLabel('Service type').selectOption({ label: 'Plumbing' });
  await hero.getByLabel('City / location').fill('Bunawan');
  await page.screenshot({ path: testInfo.outputPath('marketplace-home.png') });
  await hero.getByRole('button', { name: 'Find a Professional' }).click();
  await expect(page).toHaveURL(/\/find\/\?category=.*&city=Bunawan/);
  await expect(page.locator('.provider-card')).toHaveCount(1);
  await expect(page.locator('.provider-card')).toContainText('Francis Romay');
});

test('profile availability and booking use the same selected service and Manila date', async ({page}) => {
  const provider = '20000000-0000-4000-8000-000000000001';
  const category = '10000000-0000-4000-8000-000000000001';
  const services = ['Inspection', 'Installation'].map((title, index) => ({
    id: `30000000-0000-4000-8000-00000000000${index + 1}`, provider_id: provider, category_id: category,
    title, active: true, rate_centavos: 45000, duration_minutes: 60, pricing_mode: 'fixed'
  }));
  const day = new Date(Date.now() + 32 * 3600000).toISOString().slice(0, 10);
  await page.route('**/rest/v1/provider_services?**', route => route.fulfill({ json: services }));
  await page.route('**/rest/v1/rpc/available_slots', route => {
    const { p_service, p_day } = route.request().postDataJSON();
    return route.fulfill({ json: p_service === services[1].id && p_day === day
      ? [{starts_at: day + 'T02:30:00Z'}] : [] });
  });
  await page.goto('/providers/profile/?id=' + provider);
  await expect(page.getByText('No available appointments on this date. Try another day.')).toBeVisible();
  await page.getByLabel('Check a date').fill(day);
  await page.getByLabel('Choose a service').selectOption(services[1].id);
  await expect(page.getByText(/10:30\s*am/i)).toBeVisible();
  await page.getByRole('link', {name:'Book a service',exact:true}).click();
  const expected = `/book/?provider=${provider}&service=${services[1].id}&day=${day}`;
  await expect(page).toHaveURL(url => url.pathname + url.search === expected);
  await expect(page.locator('main').getByRole('link', {name:'Sign in', exact:true})).toHaveAttribute('href','/login/?next=' + encodeURIComponent(expected));
});
