import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { publicFixtures } from './public-fixtures';
import published from '../../src/features/app-releases/android-release.json';

test.beforeEach(async ({ page }) => { if (process.env.E2E_LIVE_SITE !== '1') await publicFixtures(page); });

test('Download APK starts the real published file with verified release metadata', async ({ page, request }) => {
  const published = JSON.parse(await readFile(new URL('../../src/features/app-releases/android-release.json', import.meta.url), 'utf8'));
  const filename = `SerbisyoGo-${published.version_name}.apk`;
  const response = await request.get(`https://api.github.com/repos/Jawbear/SerbisyoGo/releases/tags/android-v${published.version_name}`);
  expect(response.ok()).toBe(true);
  const released = await response.json();
  const asset = released.assets.find((asset: { name: string }) => asset.name === filename);
  expect(asset.size).toBe(published.byte_size);
  expect(asset.digest).toBe(`sha256:${published.sha256}`);
  expect(asset.browser_download_url).toBe(published.download_url);
  await page.goto('/download/');
  const button = page.getByRole('link', { name: 'Download APK', exact: true });
  await expect(button).toHaveAttribute('href', published.download_url);
  await expect(page.getByText(published.sha256, { exact: true })).toBeVisible();
  const received = page.waitForEvent('download');
  await button.click();
  const download = await received;
  expect(download.suggestedFilename()).toBe(filename);
  expect(download.url()).toContain(filename);
  // The complete object hash is verified above against GitHub's stored asset
  // digest. Stop duplicate 53 MB test transfers once the real download begins.
  await download.cancel();
});

test('a release-database outage does not block the published APK', async ({ page }) => {
  await page.route('**/*.supabase.co/rest/v1/app_releases*', route => route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ message: 'Release service unavailable' }) }));
  await page.goto('/download/');
  await expect(page.getByRole('heading', { name: 'Take SerbisyoGo with you.', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Download APK', exact: true })).toHaveAttribute('href', published.download_url);
  await expect(page.getByText('Coming soon', { exact: true })).toHaveCount(0);
});
