import { createClient } from '@supabase/supabase-js';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export function duplicateAccounts(rows) {
  const groups = field => {
    const index = new Map();
    for (const row of rows) {
      if (row.status === 'deleting' && !row.email) continue;
      const value = String(row[field] || '').trim().replace(/\s+/g, ' ').toLowerCase();
      if (!value) continue;
      if (!index.has(value)) index.set(value, []);
      index.get(value).push(row.id);
    }
    return [...index].filter(([, ids]) => ids.length > 1).map(([value, ids]) => ({ value, ids }));
  };
  return { duplicateEmails: groups('email'), duplicateFullNames: groups('full_name') };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const flag = process.argv.indexOf('--credentials-file');
  let email = process.env.ACCOUNT_AUDIT_EMAIL, password = process.env.ACCOUNT_AUDIT_PASSWORD;
  if (flag >= 0) {
    const manifest = JSON.parse(await readFile(process.argv[flag + 1], 'utf8'));
    if (manifest.project !== url) throw new Error('Saved credentials belong to another project.');
    ({ email, password } = manifest.accounts.admin);
  }
  if (!url || !key || !email || !password) throw new Error('Configure the Supabase URL, publishable key and administrator audit credentials.');
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(20000) }) }
  });
  const login = await client.auth.signInWithPassword({ email, password });
  if (login.error) throw new Error('Administrator audit sign-in failed: ' + login.error.message);
  try {
    const rows = [];
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await client.rpc('admin_accounts', { p_offset: offset, p_limit: 100 });
      if (error) throw new Error(error.message);
      if (!data || !Array.isArray(data.rows)) throw new Error('Account listing returned an invalid response.');
      rows.push(...data.rows);
      if (rows.length >= data.total) break;
      if (!data.rows.length) throw new Error('Account pagination ended before the reported total.');
    }
    const report = { scannedAt: new Date().toISOString(), accountsScanned: rows.length, ...duplicateAccounts(rows) };
    const outputFlag = process.argv.indexOf('--output');
    if (outputFlag >= 0) await writeFile(process.argv[outputFlag + 1], JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
    if (report.duplicateEmails.length || report.duplicateFullNames.length) process.exitCode = 2;
  } finally {
    await client.auth.signOut({ scope: 'local' });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error('Account audit failed: ' + error.message); process.exitCode = 1; });
}
