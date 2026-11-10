import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { developmentTarget } from './seed-development.mjs';

// Read-only application checks. Authentication creates ordinary test sessions;
// no application records, files, roles, bookings, messages or payments are changed.
async function main() {
  const flag = process.argv.indexOf('--development-project');
  const url = developmentTarget(process.env.NEXT_PUBLIC_SUPABASE_URL || '', flag < 0 ? undefined : process.argv[flag + 1]);
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!key) throw new Error('Configure the publishable key in .env.local. No secret key is needed.');
  const manifest = JSON.parse(await readFile('.cache/development-users.json', 'utf8'));
  if (manifest.project !== url) throw new Error('Fixture credentials belong to another project.');
  const clients = {};
  const check = async request => { const response = await request; if (response.error) throw new Error(response.error.message); return response.data; };
  for (const name of ['customer1', 'customer2', 'provider1', 'provider2', 'admin']) {
    const fixture = manifest.accounts[name];
    if (!fixture?.password) throw new Error(`No locally saved password for ${name}.`);
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000) }) }
    });
    clients[name] = client;
    await check(client.auth.signInWithPassword({ email: fixture.email, password: fixture.password }));
    const context = await check(client.rpc('user_context'));
    assert.equal(context.role, name === 'admin' ? 'admin' : name.startsWith('provider') ? 'provider' : 'customer');
    const bookings = await check(client.from('bookings').select('id,customer_id,provider_id'));
    if (name !== 'admin') assert.ok(bookings.every(b => b.customer_id === fixture.id || b.provider_id === fixture.id), `${name}: unrelated booking exposed`);
    if (name !== 'admin') {
      assert.deepEqual(await check(client.from('case_notes').select('id')), [], 'Internal notes exposed');
      assert.deepEqual(await check(client.from('audit_logs').select('id')), [], 'Admin audit exposed');
      assert.equal(await check(client.rpc('is_admin')), false);
    }
    console.log(`PASS: ${name} login, assigned role and scoped records`);
  }
  const customer = clients.customer1;
  const booking = (await check(customer.from('bookings').select('id').limit(1)))[0];
  assert.ok(booking, 'Seeded booking missing');
  for (const name of ['customer2', 'provider2']) {
    assert.deepEqual(await check(clients[name].from('bookings').select('id').eq('id', booking.id)), [], `${name}: outsider booking exposed`);
  }
  const conversation = await check(customer.from('conversations').select('id').eq('booking_id', booking.id).single());
  for (const name of ['customer2', 'provider2']) assert.deepEqual(await check(clients[name].from('messages').select('id').eq('conversation_id', conversation.id)), [], 'Outsider messages exposed');
  assert.equal((await check(customer.from('reviews').select('id').eq('customer_id', manifest.accounts.customer1.id))).length, 1);
  assert.equal((await check(customer.from('invoices').select('id'))).length, 1);
  const report = await check(clients.admin.rpc('admin_report', { p_from: new Date(Date.now() - 30 * 86400000).toISOString(), p_to: new Date(Date.now() + 86400000).toISOString() }));
  assert.ok(report.bookings >= 35, 'Expected seeded report records');
  const anon = createClient(url, key, { auth: { persistSession: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000) }) } });
  assert.equal((await check(anon.from('public_providers').select('id'))).length >= 5, true);
  assert.deepEqual(await check(anon.from('app_releases').select('id').eq('status', 'draft')), []);
  for (const client of Object.values(clients)) await client.auth.signOut({ scope: 'local' });
  console.log('PASS: outsider isolation, invoices, reviews, reporting and private release metadata. No application records changed.');
}
main().catch(error => { console.error(`Development check could not complete: ${error.message}`); process.exitCode = 1; });
