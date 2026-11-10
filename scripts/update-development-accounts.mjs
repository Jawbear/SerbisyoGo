import { createClient } from '@supabase/supabase-js';
import { constants } from 'node:fs';
import { readFile, writeFile, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { developmentTarget } from './seed-development.mjs';

export function planAccountUpdates(manifest, updates) {
  if (!updates || Array.isArray(updates) || typeof updates !== 'object') throw new Error('Updates must be an object keyed by existing account labels.');
  const emails = new Set();
  return Object.entries(updates).map(([label, update]) => {
    const existing = manifest.accounts?.[label];
    if (!existing?.id) throw new Error(`Unknown development account: ${label}`);
    if (!update || Object.keys(update).some(key => !['email', 'password'].includes(key))) throw new Error(`Only email and password may be changed for ${label}.`);
    const email = String(update.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(`Invalid email for ${label}.`);
    if (emails.has(email)) throw new Error('Two updates cannot use the same email.');
    emails.add(email);
    if (typeof update.password !== 'string' || update.password.length < 8 || update.password.length > 128) throw new Error(`Supply an 8–128 character password for ${label}. Supabase also enforces its configured password policy.`);
    return { label, id: existing.id, email, password: update.password };
  });
}

async function main() {
  const flag = process.argv.indexOf('--development-project');
  const project = developmentTarget(process.env.NEXT_PUBLIC_SUPABASE_URL || '', flag < 0 ? undefined : process.argv[flag + 1]);
  const path = '.cache/development-users.json';
  const manifest = JSON.parse(await readFile(path, 'utf8'));
  if (manifest.project !== project) throw new Error('Credential file belongs to a different project.');
  const updates = JSON.parse(await readFile('.cache/development-account-updates.json', 'utf8'));
  const plan = planAccountUpdates(manifest, updates);
  if (!plan.length) throw new Error('No account updates supplied.');
  for (const item of plan) console.log(`${item.label}: ${item.email} (password hidden; account ID retained)`);
  if (!process.argv.includes('--apply')) { console.log('Preview only. Add --apply to update these development accounts.'); return; }
  if (!process.env.SUPABASE_SECRET_KEY) throw new Error('A server-only secret key is required privately in .env.local.');
  const db = createClient(project, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) } });
  const check = async request => { const response = await request; if (response.error) throw new Error(response.error.message); return response.data; };
  const users = [];
  for (let page = 1; ; page++) {
    const data = await check(db.auth.admin.listUsers({ page, perPage: 1000 }));
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  // Validate every target before changing any credentials. Never merge identities.
  for (const item of plan) {
    const user = users.find(candidate => candidate.id === item.id);
    if (user?.app_metadata?.development_fixture !== 'serbisyogo-development-v1') throw new Error(`${item.label} is not an authorized development fixture.`);
    if (user.app_metadata.development_account && user.app_metadata.development_account !== item.label) throw new Error(`Fixture label mismatch for ${item.label}.`);
    if (users.some(candidate => candidate.id !== item.id && candidate.email?.toLowerCase() === item.email)) throw new Error(`Requested email for ${item.label} already belongs to another account.`);
  }
  await copyFile(path, '.cache/development-users.before-account-update.json', constants.COPYFILE_EXCL).catch(error => { if (error.code !== 'EEXIST') throw error; });
  const admin = manifest.accounts.admin?.id;
  for (const item of plan) {
    const user = users.find(candidate => candidate.id === item.id);
    const previous = manifest.accounts[item.label];
    if (previous.credentials_updated_at && previous.email === item.email && previous.password === item.password && user.email?.toLowerCase() === item.email) {
      console.log(`${item.label} already matches the saved update; skipped.`);
      continue;
    }
    await check(db.auth.admin.updateUserById(item.id, {
      email: item.email, password: item.password, email_confirm: true,
      app_metadata: { ...user.app_metadata, development_account: item.label }
    }));
    Object.assign(manifest.accounts[item.label], { email: item.email, password: item.password, credentials_updated_at: new Date().toISOString() });
    await writeFile(path, JSON.stringify(manifest, null, 2), { mode: 0o600 });
    await check(db.from('audit_logs').insert({ actor_id: admin, action: 'development_credentials_updated', entity: 'auth.users', entity_id: item.id, details: { development: true, fields: ['email', 'password'], account: item.label } }));
    console.log(`Updated ${item.label}. Password saved privately; no password logged.`);
  }
  console.log('Done. Existing IDs, roles, profile names, bookings and messages were retained. Sign out and sign in with the updated credentials.');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(`Account update stopped: ${error.message}`); console.error('Earlier completed updates remain saved in the private credential file.'); process.exitCode = 1; });
