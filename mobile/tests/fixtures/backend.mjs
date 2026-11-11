import { Buffer } from 'node:buffer';
import { fixtureCatalog } from './catalog.mjs';

// HTTP-only test double: the shipped app always uses the real Supabase client.
export async function installBackend(page) {
  const user = { id: '10000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'customer@example.test' };
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, aud: 'authenticated', role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.fixture`;
  const state = { drafts: [], bookings: [], confirmations: 0, failSubmit: false, failCatalog: false, signedIn: false, role: 'customer' };
  await page.route('**/auth/v1/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/logout')) { state.signedIn = false; return route.fulfill({ status: 204 }); }
    const body = path.endsWith('/user') ? user : { access_token: token, refresh_token: 'fixture-refresh', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user };
    state.signedIn = true;
    await route.fulfill({ json: body });
  });
  await page.route('**/rest/v1/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const table = url.pathname.split('/').at(-1);
    const body = request.method() === 'POST' ? request.postDataJSON() : {};
    const id = url.searchParams.get('id')?.replace(/^eq\./, '');
    let data;
    if (table === 'user_context') data = { profile: { id: user.id, full_name: 'Test Account', status: 'active' }, role: state.role };
    else if (table === 'available_slots') data = [8, 10, 13].map(hour => ({ starts_at: new Date(`${body.p_day}T${String(hour).padStart(2, '0')}:00:00+08:00`).toISOString() }));
    else if (table === 'save_booking_draft') {
      const draft = { id: body.p_id || '20000000-0000-4000-8000-000000000001', customer_id: user.id, provider_service_id: body.p_service, description: body.p_description, address: body.p_address, starts_at: body.p_starts_at };
      state.drafts = [...state.drafts.filter(row => row.id !== draft.id), draft]; data = draft.id;
    } else if (table === 'draft_price') {
      const draft = state.drafts.find(row => row.id === body.p_draft);
      const service = fixtureCatalog.services.find(row => row.id === draft?.provider_service_id);
      data = { labor_centavos: service.rate_centavos, fee_centavos: 5000, total_centavos: service.rate_centavos + 5000, is_estimate: false };
    } else if (table === 'confirm_booking') {
      state.confirmations++;
      if (state.failSubmit) return route.fulfill({ status: 400, json: { message: 'This time is no longer available. Choose another schedule.', code: 'P0001' } });
      let booking = state.bookings.find(row => row.idempotency_key === body.p_draft);
      if (!booking) {
        const draft = state.drafts.find(row => row.id === body.p_draft);
        const service = fixtureCatalog.services.find(row => row.id === draft.provider_service_id);
        booking = { id: '30000000-0000-4000-8000-000000000001', reference: 'SG-TEST-0001', customer_id: user.id, provider_id: service.provider_id, provider_service_id: service.id, service_title: service.title, address_snapshot: draft.address, description: draft.description, starts_at: draft.starts_at, total_centavos: service.rate_centavos + 5000, status: 'requested', idempotency_key: draft.id };
        state.bookings.push(booking);
      }
      data = booking.id;
    } else {
      const tables = { categories: fixtureCatalog.categories, public_providers: fixtureCatalog.providers, provider_services: fixtureCatalog.services, booking_drafts: state.drafts, bookings: state.bookings };
      if (!(table in tables)) throw new Error(`Unexpected backend call: ${table}`);
      if (state.failCatalog && table === 'categories') return route.fulfill({ status: 503, json: { message: 'Services are temporarily unavailable.' } });
      let rows = tables[table];
      if (id) rows = rows.filter(row => row.id === id);
      const provider = url.searchParams.get('provider_id')?.replace(/^eq\./, '');
      if (provider) rows = rows.filter(row => row.provider_id === provider);
      data = request.headers().accept?.includes('application/vnd.pgrst.object+json') ? rows[0] || null : rows;
    }
    await route.fulfill({ json: data });
  });
  return state;
}

export async function signIn(page) {
  await page.getByRole('textbox', { name: 'Email address', exact: true }).fill('customer@example.test');
  await page.getByLabel('Password', { exact: true }).fill('fixture-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}
