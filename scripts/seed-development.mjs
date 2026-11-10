import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const marker = 'serbisyogo-development-v1';
const providerNames = ['Art Ecleo', 'Francis Romay', 'Wilfredo Rivera', 'Moreno JunDave', 'Jonthan Jabs'];
const administratorName = 'Jover Sabarita';
export function developmentTarget(value, confirmation) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Supabase requires HTTP or HTTPS.');
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Use the base Supabase project URL.');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (local) return url.origin;
  const ref = url.hostname.match(/^([a-z0-9]+)\.supabase\.co$/)?.[1];
  if (url.protocol !== 'https:' || !ref || confirmation !== ref) throw new Error('Hosted development seeding requires --development-project EXACT_PROJECT_REF. Never use production.');
  return url.origin;
}
export function fixtureId(project, name) {
  const hex = createHash('sha256').update(`${marker}:${project}:${name}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
const specialties = [
  ['electrical', 'Electrical', 'zap', 'Electrical diagnostics', 45000],
  ['plumbing', 'Plumbing', 'droplets', 'Leak and fixture inspection', 40000],
  ['carpentry', 'Carpentry', 'hammer', 'Door and cabinet repair', 48000],
  ['appliance-repair', 'Appliance repair', 'plug', 'Appliance diagnostics', 55000],
  ['air-conditioning', 'Air-conditioning', 'wind', 'Air-conditioning cleaning', 65000],
  ['maintenance', 'General maintenance', 'wrench', 'Home maintenance inspection', 35000]
];
const providerBios = [
  'Electrical troubleshooting, lighting installation, and residential wiring maintenance in Bunawan, Agusan del Sur.',
  'Leak repairs, water fixture installation, and household drainage maintenance in Bunawan, Agusan del Sur.',
  'Door fitting, cabinet repairs, and practical woodwork for homes in Bunawan, Agusan del Sur.',
  'Troubleshooting and repairs for household appliances in Bunawan, Agusan del Sur.',
  'Air-conditioning cleaning, diagnostics, and routine maintenance in Bunawan, Agusan del Sur.'
];
export const developmentPlan = {
  customers: 5, approvedProviders: 5, pendingProviders: 5, administrators: 1,
  categories: 6, services: 10, bookings: 35, conversations: 35, messages: 70,
  completedInvoices: 5, illustrativeSettlements: 5, reviews: 5,
  payoutRequests: 5, refundRequests: 5, supportCases: 5, announcements: 5,
  privateDocuments: 0, apkReleases: 0
};

async function main() {
  if (process.argv.includes('--plan')) { console.log(JSON.stringify(developmentPlan, null, 2)); return; }
  const flag = process.argv.indexOf('--development-project');
  const url = developmentTarget(process.env.NEXT_PUBLIC_SUPABASE_URL || '', flag < 0 ? undefined : process.argv[flag + 1]);
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error('Set SUPABASE_SECRET_KEY privately in .env.local to the server-only secret/service-role key. Never paste it into chat or GitHub.');
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const id = name => fixtureId(url, name);
  const check = async query => { const { data, error } = await query; if (error) throw new Error(error.message); return data; };
  const access = await db.from('role_assignments').select('user_id').limit(0);
  if (access.error) throw new Error(`Backend access check failed: ${access.error.message}. Apply pending migrations with npx supabase db push --linked and confirm .env.local uses the server-only secret key.`);
  // Insert missing fixtures only. Existing bookings, financial records and edited samples are retained.
  const ensure = async (table, row) => {
    const found = await check(db.from(table).select('id').eq('id', row.id).maybeSingle());
    if (!found) await check(db.from(table).insert(row));
    return row.id;
  };
  await mkdir('.cache', { recursive: true });
  const manifestPath = '.cache/development-users.json';
  let saved;
  try { saved = JSON.parse(await readFile(manifestPath, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (saved && saved.project !== url) throw new Error('Credential manifest belongs to another project. Preserve it separately before seeding a different project.');
  saved ||= { project: url, marker, startedAt: new Date().toISOString(), accounts: {} };
  const persist = () => writeFile(manifestPath, JSON.stringify(saved, null, 2), { mode: 0o600 });
  const users = [];
  for (let page = 1; ; page++) {
    const data = await check(db.auth.admin.listUsers({ page, perPage: 1000 }));
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  const naturalProfiles = process.argv.includes('--natural-profiles');
  if (process.argv.includes('--rename-names') || naturalProfiles) {
    // Validate every target before updating anything; never match arbitrary real accounts.
    const targets = [['admin', administratorName], ...providerNames.map((name, i) => [`provider${i + 1}`, name])].map(([accountName, fullName]) => {
      const user = users.find(candidate => candidate.email === `dev-${accountName}@serbisyogo.example.test`);
      if (!user || user.app_metadata?.development_fixture !== marker) throw new Error(`Expected development account ${accountName} was not found; no rename started.`);
      return { user, accountName, fullName };
    });
    for (const [targetIndex, { user, accountName, fullName }] of targets.entries()) {
      await check(db.auth.admin.updateUserById(user.id, { user_metadata: { ...user.user_metadata, full_name: fullName } }));
      await check(db.from('profiles').update({ full_name: fullName }).eq('id', user.id));
      if (accountName !== 'admin') {
        const specialty = targetIndex - 1;
        const copy = naturalProfiles ? { headline: `${specialties[specialty][1]} professional`, bio: providerBios[specialty] } : {};
        await check(db.from('provider_profiles').update({ display_name: fullName, ...copy }).eq('id', user.id));
        if (naturalProfiles) await check(db.from('provider_services').update({ title: specialties[specialty][3] }).eq('id', id(`service${specialty}`)).eq('provider_id', user.id));
      }
      if (saved.accounts[accountName]) saved.accounts[accountName].full_name = fullName;
      await persist();
      console.log(`Updated ${accountName}: ${fullName}`);
    }
    await ensure('audit_logs', { id: id(naturalProfiles ? 'natural_profiles_v1' : 'provided_names_v1'), actor_id: targets[0].user.id, action: naturalProfiles ? 'development_profile_copy_updated' : 'development_display_names_updated', entity: 'development', details: { marker, account_ids: targets.map(target => target.user.id) } });
    console.log('Profile text updated. Existing emails, passwords, roles, bookings and messages retained.');
    return;
  }
  async function account(name, fullName, role) {
    const email = `dev-${name.toLowerCase()}@serbisyogo.example.test`;
    let user = users.find(candidate => candidate.email === email);
    if (user && user.app_metadata?.development_fixture !== marker) throw new Error(`Reserved fixture email ${email} belongs to an unrelated account; refusing to change it.`);
    if (!user) {
      const password = randomBytes(24).toString('base64url');
      const created = await check(db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName }, app_metadata: { development_fixture: marker } }));
      user = created.user;
      saved.accounts[name] = { id: user.id, email, password, role };
      await persist(); // Save each credential before dependent work, including partial runs.
    } else if (!saved.accounts[name]) {
      saved.accounts[name] = { id: user.id, email, role, note: 'Existing password retained. Use your previous private credential file.' };
      await persist();
    }
    const roleRow = await check(db.from('role_assignments').select('role').eq('user_id', user.id).single());
    if (roleRow.role !== role) await check(db.from('role_assignments').update({ role }).eq('user_id', user.id));
    return user.id;
  }
  console.log('Creating fictional development fixtures. No emails, charges, transfers or APKs will be sent.');
  const admin = await account('admin', administratorName, 'admin');
  const customers = [], providers = [];
  for (let i = 0; i < 5; i++) customers.push(await account(`customer${i + 1}`, `Customer ${i + 1} (Demo)`, 'customer'));
  const categories = [];
  for (const [i, [slug, name, icon]] of specialties.entries()) {
    const existing = await check(db.from('categories').select('id').eq('slug', slug).maybeSingle());
    const categoryId = existing?.id || `10000000-0000-4000-8000-00000000000${i + 1}`;
    if (!existing) await ensure('categories', { id: categoryId, slug, name, icon, description: `${name} services` });
    categories.push(categoryId);
  }
  const settings = await check(db.from('app_settings').select('fee_centavos,commission_bps').eq('active', true).maybeSingle());
  if (!settings) await ensure('app_settings', { id: id('settings'), fee_centavos: 5000, commission_bps: 1000, active: true, support_email: 'support@example.test', created_by: admin });
  const fee = settings?.fee_centavos ?? 5000;
  const commissionBps = settings?.commission_bps ?? 1000;
  const instant = (day, hour = 9) => {
    const date = new Date(new Date(saved.startedAt).getTime() + 8 * 3600000 + day * 86400000).toISOString().slice(0, 10);
    return new Date(`${date}T${String(hour).padStart(2, '0')}:00:00+08:00`).toISOString();
  };
  for (let i = 0; i < 10; i++) {
    const approved = i < 5, specialty = i % 5;
    const fullName = approved ? providerNames[i] : `Provider ${i + 1} (Demo)`;
    const provider = await account(`provider${i + 1}`, fullName, approved ? 'provider' : 'customer');
    const profile = { display_name: fullName, headline: `${specialties[specialty][1]} professional`, bio: providerBios[specialty], city: 'Bunawan', service_areas: ['Bunawan, Agusan del Sur'] };
    await ensure('provider_profiles', { id: provider, ...profile, status: approved ? 'approved' : 'pending' });
    await ensure('provider_applications', { id: id(`application${i}`), provider_id: provider, proposed_profile: profile, status: approved ? 'approved' : 'pending', reason: 'Development fixture only; no identity verification has been performed.', reviewed_by: approved ? admin : null, reviewed_at: approved ? saved.startedAt : null });
    const service = { id: id(`service${i}`), provider_id: provider, category_id: categories[specialty], title: specialties[specialty][3], rate_centavos: specialties[specialty][4], duration_minutes: 60, pricing_mode: 'fixed' };
    await ensure('provider_services', service);
    for (let weekday = 0; weekday < 7; weekday++) await ensure('weekly_availability', { id: id(`weekly${i}-${weekday}`), provider_id: provider, weekday, starts_minute: 480, ends_minute: 1080 });
    await ensure('unavailable_periods', { id: id(`blocked${i}`), provider_id: provider, starts_at: instant(40, 8), ends_at: instant(40, 10), reason: 'Fictional development unavailable period.' });
    if (approved) providers.push(service);
  }
  const paths = ['requested', 'confirmed', 'en_route', 'in_progress', 'completed'];
  const statuses = [...paths, 'cancelled', 'declined'];
  for (let i = 0; i < 5; i++) {
    const customer = customers[i], service = providers[i];
    const address = { label: 'Demo home', line1: `Fictional House ${i + 1}, Example Street (not a real address)`, city: 'Bunawan', postal_code: '8506' };
    await ensure('addresses', { id: id(`address${i}`), user_id: customer, ...address });
    await ensure('booking_drafts', { id: id(`draft${i}`), customer_id: customer, provider_service_id: service.id, description: 'Fictional saved development booking draft.', address, starts_at: instant(20) });
    for (const [index, status] of statuses.entries()) {
      const bookedAt = instant(status === 'completed' ? -2 : index + 2);
      const commission = Math.floor((service.rate_centavos * commissionBps + 5000) / 10000);
      const total = service.rate_centavos + fee;
      const bookingId = id(`booking${i}-${status}`);
      await ensure('bookings', { id: bookingId, customer_id: customer, provider_id: service.provider_id, provider_service_id: service.id, idempotency_key: id(`nonce${i}-${status}`), service_title: service.title, description: 'Fictional development job. No actual service or payment took place.', address_snapshot: address, starts_at: bookedAt, ends_at: new Date(new Date(bookedAt).getTime() + 3600000).toISOString(), status, labor_centavos: service.rate_centavos, fee_centavos: fee, commission_bps: commissionBps, commission_centavos: commission, total_centavos: total, is_estimate: false });
      const timeline = paths.includes(status) ? paths.slice(0, paths.indexOf(status) + 1) : ['requested', status];
      for (const [step, to] of timeline.entries()) await ensure('booking_events', { id: id(`event${i}-${status}-${step}`), booking_id: bookingId, actor_id: step === 0 || to === 'cancelled' ? customer : service.provider_id, from_status: timeline[step - 1] || null, to_status: to, reason: 'Fictional development timeline.', created_at: new Date(new Date(saved.startedAt).getTime() - (timeline.length - step) * 60000).toISOString() });
      const conversation = id(`chat${i}-${status}`);
      await ensure('conversations', { id: conversation, booking_id: bookingId });
      await check(db.from('conversation_members').upsert([{ conversation_id: conversation, user_id: customer }, { conversation_id: conversation, user_id: service.provider_id }], { onConflict: 'conversation_id,user_id', ignoreDuplicates: true }));
      for (let m = 0; m < 2; m++) await ensure('messages', { id: id(`message${i}-${status}-${m}`), conversation_id: conversation, sender_id: m ? service.provider_id : customer, body: m ? 'Development sample reply: your service details are available here.' : 'Development sample message: please review the task description.', client_nonce: id(`messageNonce${i}-${status}-${m}`) });
      const completed = status === 'completed';
      const paymentId = id(`payment${i}-${status}`);
      await ensure('payments', { id: paymentId, booking_id: bookingId, method: completed ? 'manual_platform' : 'cash', status: completed ? 'paid' : 'pending', amount_centavos: total, settled_by: completed ? admin : null, settled_at: completed ? bookedAt : null });
      if (completed) {
        await ensure('payment_events', { id: id(`settlement${i}`), payment_id: paymentId, event_key: id(`paymentNonce${i}`), status: 'paid', source: 'authorized_manual', actor_id: admin, reason: 'FICTIONAL DEVELOPMENT SETTLEMENT. No real money received or transferred.' });
        await ensure('invoices', { id: id(`invoice${i}`), booking_id: bookingId, invoice_number: `DEMO-${bookingId.slice(0, 8).toUpperCase()}`, labor_centavos: service.rate_centavos, fee_centavos: fee, total_centavos: total });
        const ledger = id(`ledger${i}`);
        await ensure('commission_ledger', { id: ledger, booking_id: bookingId, provider_id: service.provider_id, labor_centavos: service.rate_centavos, commission_centavos: commission, platform_fee_centavos: fee, held_net_centavos: service.rate_centavos - commission, cash_commission_due_centavos: 0 });
        const payout = id(`payout${i}`);
        await ensure('payout_requests', { id: payout, provider_id: service.provider_id, amount_centavos: service.rate_centavos - commission, reason: 'Fictional payout request. No bank transfer has occurred.' });
        await check(db.from('payout_items').upsert({ payout_id: payout, ledger_id: ledger }, { onConflict: 'payout_id,ledger_id', ignoreDuplicates: true }));
        await ensure('refund_requests', { id: id(`refund${i}`), booking_id: bookingId, requested_by: customer, reason: 'Development refund review request. No money was returned.' });
        await ensure('reviews', { id: id(`review${i}`), booking_id: bookingId, customer_id: customer, provider_id: service.provider_id, rating: i % 2 ? 4 : 5, body: 'Fictional development review for testing the completed-booking experience.' });
      }
    }
    const support = id(`support${i}`);
    const status = ['open', 'reviewing', 'resolved', 'closed', 'open'][i];
    await ensure('support_cases', { id: support, owner_id: customer, booking_id: id(`booking${i}-requested`), subject: `Sample concern ${i + 1}: scheduling question`, body: 'Fictional development support case. Please use this to test customer and admin views.', priority: ['normal', 'high', 'low', 'normal', 'urgent'][i], status, resolution: ['resolved', 'closed'].includes(status) ? 'Fictional resolution recorded for development testing.' : null });
    await ensure('case_messages', { id: id(`caseMessage${i}`), case_id: support, sender_id: admin, body: 'Sample customer-visible reply. Your scheduling question is being reviewed.' });
    await ensure('case_notes', { id: id(`caseNote${i}`), case_id: support, admin_id: admin, body: 'Private development note for administrators only; never shown to the customer.' });
    await ensure('announcements', { id: id(`announcement${i}`), title: `Development sample ${i + 1}: Bunawan services`, body: 'This development project contains fictional people, reviews, prices and operational statistics. Do not book real services here.', audience: ['everyone', 'customers', 'providers', 'everyone', 'everyone'][i], status: i === 4 ? 'draft' : 'published', publish_at: saved.startedAt, created_by: admin });
    for (const [role, user] of [['customer', customer], ['provider', service.provider_id]]) await ensure('notifications', { id: id(`notification${i}-${role}`), user_id: user, title: 'Development samples are ready', body: 'Fictional bookings and conversations are available for testing.', href: role === 'customer' ? '/dashboard/' : '/provider/' });
    await ensure('audit_logs', { id: id(`audit${i}`), actor_id: admin, action: 'development_fixture_created', entity: 'development', entity_id: String(i + 1), details: { marker, fictional: true, customer_id: customer, provider_id: service.provider_id } });
  }
  saved.completedAt = new Date().toISOString();
  saved.plan = developmentPlan;
  await persist();
  console.log(JSON.stringify(developmentPlan, null, 2));
  console.log('Done. Login credentials are saved privately in .cache/development-users.json. Existing sample edits were retained. No APK, ID documents, GPS positions or real transfers created.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(`Development seed stopped: ${error.message}`); console.error('Partial inserts are retained. Correct the issue and rerun the same command to resume.'); process.exitCode = 1; });
}
