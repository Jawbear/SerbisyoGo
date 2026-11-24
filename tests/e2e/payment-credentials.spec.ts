import { test, expect, type Page } from '@playwright/test';
import { publicFixtures } from './public-fixtures';

const accountId = '40000000-0000-4000-8000-000000000009';
async function sessionFixture(page: Page, role: 'admin' | 'customer' | 'provider') {
  await publicFixtures(page);
  const user = { id: accountId, email: 'safety-ui@example.test', aud: 'authenticated', role: 'authenticated' };
  const payload = Buffer.from(JSON.stringify({ sub: user.id, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
  const session = { user, access_token: `eyJhbGciOiJIUzI1NiJ9.${payload}.fixture`, refresh_token: 'fixture', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600 };
  const key = `sb-${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split('.')[0]}-auth-token`;
  await page.addInitScript(({ key, session }) => localStorage.setItem(key, JSON.stringify(session)), { key, session });
  await page.route('**/auth/v1/user', route => route.fulfill({ json: user }));
  await page.route('**/rest/v1/rpc/user_context', route => route.fulfill({ json: { role, profile: { id: user.id, full_name: 'Safety UI Test', status: 'active', preferences: {} } } }));
}

test.beforeEach(() => test.skip(!process.env.NEXT_PUBLIC_SUPABASE_URL, 'Requires configured public client for intercepted requests.'));

test('admin payment setup defaults to disabled and sends explicit recipient verification', async ({ page }) => {
  await sessionFixture(page, 'admin');
  let settings: Record<string, unknown>[] = [];
  const requests: Record<string, unknown>[] = [];
  await page.route('**/rest/v1/**', route => {
    const table = new URL(route.request().url()).pathname.split('/').pop();
    if (table === 'user_context') return route.fallback();
    if (table === 'admin_report') return route.fulfill({ json: { customers: 0, providers: 0, bookings: 0, daily: [], status: [] } });
    if (table === 'gcash_settings') return route.fulfill({ json: settings });
    if (table === 'save_gcash_settings') {
      const input = route.request().postDataJSON(); requests.push(input);
      if (input.p_enabled && !input.p_recipient_verified) return route.fulfill({ status: 400, json: { message: 'Verify the recipient before enabling payments' } });
      settings = [{ recipient_name: input.p_name, recipient_phone: input.p_phone, instructions: input.p_instructions, enabled: input.p_enabled, qr_code_url: input.p_qr_url, recipient_verified_at: new Date().toISOString(), updated_at: new Date().toISOString() }];
      return route.fulfill({ json: null });
    }
    return route.fulfill({ json: [] });
  });
  await page.goto('/admin/settings/');
  await expect(page.getByRole('heading', { name: 'GCash payments & QR', exact: true })).toBeVisible({ timeout: 15000 });
  const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'Save GCash recipient', exact: true }) });
  await expect(form.getByRole('checkbox', { name: 'Enable GCash payments', exact: true })).not.toBeChecked();
  await form.getByLabel('GCash recipient name', { exact: true }).fill('Fictional Test Wallet');
  await form.getByLabel('GCash mobile number', { exact: true }).fill('09170000001');
  await form.getByRole('checkbox', { name: 'Enable GCash payments', exact: true }).check();
  await form.getByRole('button', { name: 'Save GCash recipient', exact: true }).click();
  await expect(form.getByRole('alert')).toContainText('Verify the recipient');
  expect(requests[0].p_recipient_verified).toBe(false);
  await form.getByRole('checkbox', { name: /I checked the recipient name and mobile number/ }).check();
  await form.getByRole('button', { name: 'Save GCash recipient', exact: true }).click();
  await expect(page.getByText('Recipient verification is recorded.', { exact: false })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Saved recipient QR preview' })).toHaveCount(0);
  expect(requests[1].p_recipient_verified).toBe(true);
  expect(requests[1].p_enabled).toBe(true);
});

test('provider upload sends its category and legacy filenames do not complete the checklist', async ({ page }) => {
  await sessionFixture(page, 'customer');
  const files = [{ id: 'legacy-file', owner_id: accountId, kind: 'verification', original_name: '[Government ID] legacy.pdf', verification_category: null as string | null, byte_size: 100, mime_type: 'application/pdf' }];
  let uploads = 0;
  await page.route('**/rest/v1/**', route => {
    const table = new URL(route.request().url()).pathname.split('/').pop();
    if (table === 'user_context') return route.fallback();
    if (table === 'provider_profiles') return route.fulfill({ json: { id: accountId, display_name: 'Safety UI Test', status: 'pending', service_areas: ['Bunawan'] } });
    return route.fulfill({ json: table === 'files' ? files : [] });
  });
  await page.route('**/functions/v1/files*', route => {
    const body = route.request().postDataBuffer()!.toString();
    expect(body).toContain('name="verification_category"');
    expect(body).toMatch(/name="verification_category"\r?\n\r?\ngov_id/);
    files.push({ id: 'categorized-file', owner_id: accountId, kind: 'verification', original_name: '[Government ID] Test ID.png', verification_category: 'gov_id', byte_size: 100, mime_type: 'image/png' });
    uploads++;
    return route.fulfill({ status: 201, json: { id: 'categorized-file' } });
  });
  await page.goto('/provider/apply/');
  await expect(page.getByText('One accepted document needed', { exact: true })).toBeVisible();
  await expect(page.getByText('Category required — upload again', { exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Document category (choose any one)', exact: true }).selectOption('Government ID');
  await page.getByLabel('Document title or specification (optional)', { exact: true }).fill('Test ID');
  await page.getByLabel('Select JPG, PNG, WebP or PDF (up to 10 MB)', { exact: true }).setInputFiles({ name: 'pixel.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=', 'base64') });
  await page.getByRole('button', { name: 'Upload verification credential', exact: true }).click();
  await expect(page.getByText('Document uploaded · Awaiting review', { exact: true })).toBeVisible();
  expect(uploads).toBe(1);
});

test('customer payment controls stay closed for an unverified recipient', async ({ page }) => {
  await sessionFixture(page, 'customer');
  const bookingId = '40000000-0000-4000-8000-000000000010';
  await page.route('**/rest/v1/**', route => {
    const table = new URL(route.request().url()).pathname.split('/').pop();
    if (table === 'user_context') return route.fallback();
    if (table === 'bookings') return route.fulfill({ json: { id: bookingId, customer_id: accountId, provider_id: 'other-provider', reference: 'SG-UNVERIFIED', service_title: 'Fictional repair', description: 'Isolated payment UI test', starts_at: '2026-11-17T00:00:00Z', address_snapshot: { line1: '12 Test Street', city: 'Bunawan', postal_code: '8506' }, status: 'completed', labor_centavos: 50000, fee_centavos: 5000, total_centavos: 55000 } });
    if (table === 'payments') return route.fulfill({ json: [{ id: 'payment-test', booking_id: bookingId, status: 'pending', amount_centavos: 55000 }] });
    if (table === 'gcash_settings') return route.fulfill({ json: [{ enabled: true, recipient_verified_at: null, recipient_name: 'Unverified Wallet', recipient_phone: '09170000001' }] });
    return route.fulfill({ json: [] });
  });
  await page.goto(`/bookings/detail/?id=${bookingId}`);
  await expect(page.getByText('GCash is not enabled. Contact support for payment instructions.', { exact: true })).toBeVisible();
  await expect(page.getByText('Unverified Wallet', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('GCash transaction reference', { exact: true })).toHaveCount(0);
});

test('a rejected GCash receipt can be replaced without exposing transfer details by default', async ({ page }) => {
  await sessionFixture(page, 'customer');
  const bookingId = '40000000-0000-4000-8000-000000000011';
  const reference = '1234567890123';
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN6sAAAAASUVORK5CYII=';
  const submissions = [{ id: 'previous-receipt', status: 'rejected', reference, reason: 'The previous image was unreadable.' }];
  let uploaded = 0;
  await page.route('**/functions/v1/files*', route => {
    uploaded++;
    expect(route.request().postDataBuffer()?.toString()).toContain('filename="receipt.png"');
    return route.fulfill({ status: 201, json: { id: 'uploaded-receipt' } });
  });
  await page.route('**/rest/v1/**', route => {
    const table = new URL(route.request().url()).pathname.split('/').pop();
    if (table === 'user_context') return route.fallback();
    if (table === 'bookings') return route.fulfill({ json: { id: bookingId, customer_id: accountId, provider_id: 'other-provider', reference: 'SG-RECEIPT-RETRY', service_title: 'Fictional repair', description: 'Isolated payment UI test', starts_at: '2026-11-17T00:00:00Z', address_snapshot: { line1: '12 Test Street', city: 'Bunawan', postal_code: '8506' }, status: 'completed', labor_centavos: 50000, fee_centavos: 5000, total_centavos: 55000 } });
    if (table === 'payments') return route.fulfill({ json: [{ id: 'payment-test', status: 'pending', amount_centavos: 55000 }] });
    if (table === 'gcash_settings') return route.fulfill({ json: [{ enabled: true, recipient_verified_at: '2026-11-17T00:00:00Z', recipient_name: 'Fictional Test Wallet', recipient_phone: '09170000001', qr_code_url: 'data:image/png;base64,' + png }] });
    if (table === 'gcash_submissions') return route.fulfill({ json: submissions });
    if (table === 'submit_gcash_receipt') {
      expect(route.request().postDataJSON()).toEqual({ p_booking: bookingId, p_reference: reference, p_receipt: 'uploaded-receipt', p_expected_amount: 55000, p_recipient_phone: '09170000001' });
      submissions.unshift({ id: 'replacement-receipt', status: 'pending', reference, reason: '' });
      return route.fulfill({ json: 'replacement-receipt' });
    }
    return route.fulfill({ json: [] });
  });
  await page.goto(`/bookings/detail/?id=${bookingId}`);
  await expect(page.getByText('Receipt needs updating', { exact: true })).toBeVisible();
  await expect(page.getByText('The previous image was unreadable.', { exact: true })).toBeVisible();
  await expect(page.getByText('Fictional Test Wallet', { exact: true })).toBeHidden();
  await page.getByText('View transfer details', { exact: true }).click();
  const qr = page.getByRole('img', { name: 'Verified GCash recipient QR' });
  await expect(qr).toBeVisible();
  await expect.poll(() => qr.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const submit = page.getByRole('button', { name: 'Submit GCash receipt', exact: true });
  await expect(submit).toBeDisabled();
  await page.getByLabel('GCash transaction reference', { exact: true }).fill('1234 5678-90123');
  await page.getByLabel('Choose GCash receipt', { exact: true }).setInputFiles({ name: 'receipt.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await expect(page.getByText('receipt.png', { exact: true })).toBeVisible();
  await submit.click();
  await expect(page.getByText('Awaiting verification', { exact: true })).toBeVisible();
  await expect(submit).toHaveCount(0);
  await expect(qr).toHaveCount(0);
  expect(uploaded).toBe(1);
});

test('admin retries a binary APK request against the same unverified draft', async ({ page }) => {
  await sessionFixture(page, 'admin');
  const id = '40000000-0000-4000-8000-000000000011';
  let drafts = 0, uploads = 0;
  // Request-shape fixture only. It is intercepted and never stored as an APK.
  const bytes = Buffer.from('Controlled browser upload request fixture');
  await page.route('**/rest/v1/**', route => {
    const table = new URL(route.request().url()).pathname.split('/').pop();
    if (table === 'user_context') return route.fallback();
    if (table === 'admin_report') return route.fulfill({ json: { customers: 0, providers: 0, bookings: 0, daily: [], status: [] } });
    if (table === 'create_release_draft') { drafts++; return route.fulfill({ json: { id } }); }
    return route.fulfill({ json: [] });
  });
  await page.route('**/functions/v1/releases*', route => {
    expect(new URL(route.request().url()).searchParams.get('id')).toBe(id);
    expect(route.request().headers()['content-type']).toBe('application/vnd.android.package-archive');
    expect(route.request().postDataBuffer()).toEqual(bytes);
    uploads++;
    return route.fulfill(uploads === 1 ? { status: 503, json: { error: 'Temporary upload failure' } } : { status: 201, json: { id, status: 'draft' } });
  });
  await page.goto('/admin/settings/');
  const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'Upload & verify draft APK', exact: true }) });
  await form.getByLabel('APK version name', { exact: true }).fill('9.9.9');
  await form.getByLabel('APK version code', { exact: true }).fill('999');
  await form.getByLabel('Minimum Android version', { exact: true }).fill('7.0');
  await form.getByLabel('Release notes', { exact: true }).fill('Controlled browser upload request fixture');
  await form.getByLabel('Actual APK file (maximum 64 MiB, subject to project limits)', { exact: true }).setInputFiles({ name: 'request-fixture.apk', mimeType: 'application/vnd.android.package-archive', buffer: bytes });
  await form.getByRole('button', { name: 'Upload & verify draft APK', exact: true }).click();
  await expect(form.getByRole('alert')).toContainText('Temporary upload failure');
  expect(drafts).toBe(1);
  await form.getByRole('button', { name: 'Upload & verify draft APK', exact: true }).click();
  await expect.poll(() => uploads).toBe(2);
  expect(drafts).toBe(1);
});

test('web schedule edits preserve split shifts and midnight from Android', async ({ page }) => {
  await sessionFixture(page, 'provider');
  const shifts = [
    { weekday: 1, starts_minute: 0, ends_minute: 480 },
    { weekday: 1, starts_minute: 1080, ends_minute: 1440 }
  ];
  let saved: typeof shifts | undefined;
  await page.route('**/rest/v1/**', route => {
    const endpoint = new URL(route.request().url()).pathname.split('/').pop();
    if (endpoint === 'user_context') return route.fallback();
    if (endpoint === 'weekly_availability') return route.fulfill({ json: saved || shifts });
    if (endpoint === 'save_availability') {
      saved = route.request().postDataJSON().p_week;
      return route.fulfill({ json: null });
    }
    return route.fulfill({ json: [] });
  });
  await page.goto('/provider/availability/');
  await expect(page.getByLabel('Monday start 1')).toHaveValue('00:00');
  await expect(page.getByLabel('Monday end 2')).toHaveValue('00:00');
  await page.getByLabel('Monday end 1').fill('07:00');
  await page.getByRole('button', { name: 'Add shift for Tuesday' }).click();
  await page.getByRole('button', { name: 'Remove Tuesday shift 1' }).click();
  await page.getByRole('button', { name: 'Save weekly hours' }).click();
  await expect.poll(() => saved).toEqual([{ ...shifts[0], ends_minute: 420 }, shifts[1]]);
});
