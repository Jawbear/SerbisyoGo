import { test, expect } from '@playwright/test';
import { publicFixtures } from './public-fixtures';

// UI-only sessions and storage responses. Actual storage authorization is tested
// separately by the isolated-backend workflow suite.
const pixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=';
for (const role of ['customer', 'provider', 'admin']) {
  test(`${role} can preview, save and replace their profile photo`, async ({ page }) => {
    test.skip(!process.env.NEXT_PUBLIC_SUPABASE_URL, 'Requires configured client for mocked authenticated UI.');
    await publicFixtures(page);
    const user = { id: '40000000-0000-4000-8000-000000000001', email: 'photo-ui@example.test', aud: 'authenticated', role: 'authenticated', created_at: new Date().toISOString(), app_metadata: {}, user_metadata: {} };
    const payload = Buffer.from(JSON.stringify({ sub: user.id, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
    const session = { access_token: `eyJhbGciOiJIUzI1NiJ9.${payload}.ui-fixture`, refresh_token: 'ui-fixture-only', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user };
    const storageKey = `sb-${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split('.')[0]}-auth-token`;
    await page.addInitScript(({ key, session }) => { localStorage.setItem(key, JSON.stringify(session)); }, { key: storageKey, session });
    await page.route('**/auth/v1/user', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) }));
    let avatarPath: string | null = null;
    let uploads = 0;
    await page.route('**/rest/v1/rpc/user_context', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ role, profile: { id: user.id, full_name: 'Photo Test Account', phone: '+639171234567', status: 'active', preferences: {}, avatar_path: avatarPath } }) }));
    await page.route('**/functions/v1/files*', async route => {
      if (route.request().method() === 'POST') {
        expect(route.request().postDataBuffer()?.toString()).toContain('avatar');
        uploads++;
        avatarPath = `${user.id}/avatar/${uploads}.png`;
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'file-fixture', path: avatarPath }) });
      } else await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: `data:image/png;base64,${pixel}`, expires_in: 60 }) });
    });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/account/');
    const roleLabel = role === 'admin' ? 'Admin' : role === 'provider' ? 'Provider' : 'Customer';
    await expect(page.locator('.account-identity').getByLabel(`Account role: ${roleLabel}`, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await expect(page.getByRole('dialog', { name: 'Navigation' }).getByLabel(`Account role: ${roleLabel}`, { exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    const input = page.getByLabel('Profile photo', { exact: true });
    await expect(input).toBeVisible();
    await input.setInputFiles({ name: 'unsupported.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') });
    await expect(page.getByText('Unsupported file type', { exact: true })).toBeVisible();
    expect(uploads).toBe(0);
    for (let i = 1; i <= 2; i++) {
      await input.setInputFiles({ name: `photo${i}.png`, mimeType: 'image/png', buffer: Buffer.from(pixel, 'base64') });
      await expect(page.getByAltText('Selected profile photo preview')).toBeVisible();
      await page.getByRole('button', { name: 'Save profile photo', exact: true }).click();
      await expect(page.getByText('Your profile photo has been updated.', { exact: true })).toBeVisible();
      await expect(page.getByAltText('Your profile photo').first()).toBeVisible();
      expect(uploads).toBe(i);
    }
    for (const width of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const sizes = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: innerWidth }));
      expect(sizes.document, `Account layout at ${width}px`).toBeLessThanOrEqual(sizes.viewport + 1);
    }
    if (role === 'admin') {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.screenshot({ path: '.cache/qa-profile-photo-375.png', fullPage: true });
    }
  });
}
