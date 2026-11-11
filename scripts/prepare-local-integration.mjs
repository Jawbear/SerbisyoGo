import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';

// Obtain credentials from this checkout's local stack, never from hosted .env.local.
const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const raw = execFileSync(command, ['supabase', 'status', '-o', 'json'], {
  encoding: 'utf8', shell: process.platform === 'win32', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000
});
const status = JSON.parse(raw);
const url = status.API_URL;
const key = status.PUBLISHABLE_KEY || status.ANON_KEY;
const secret = status.SECRET_KEY || status.SERVICE_ROLE_KEY;
const inbox = status.LOCAL_SMTP_URL || status.INBUCKET_URL || status.MAILPIT_URL || 'http://127.0.0.1:54324';
for (const endpoint of [url, inbox]) {
  if (!endpoint || !['localhost', '127.0.0.1', '::1', '[::1]'].includes(new URL(endpoint).hostname)) {
    throw new Error('Integration tests require a local API and local test inbox.');
  }
}
if (!key || !secret) throw new Error('The local Supabase stack did not supply its test keys.');
const values = {
  NEXT_PUBLIC_SITE_URL: 'http://localhost:3000', NEXT_PUBLIC_BASE_PATH: '',
  NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
  SUPABASE_SECRET_KEY: secret,
  TEST_SUPABASE_URL: url, TEST_SUPABASE_PUBLISHABLE_KEY: key, TEST_SUPABASE_SECRET_KEY: secret,
  TEST_INBOX_URL: inbox, TEST_APK_PATH: ''
};
if (Object.values(values).some(value => /[\r\n]/.test(value))) throw new Error('Invalid local test configuration.');
mkdirSync('.cache', { recursive: true });
writeFileSync('.cache/local-integration.env', Object.entries(values).map(([name, value]) => `${name}=${JSON.stringify(value)}`).join('\n') + '\n', { mode: 0o600 });
writeFileSync('.cache/edge-test.env', 'ALLOWED_ORIGINS=http://localhost:3000\nAPK_MAX_BYTES=52428800\n', { mode: 0o600 });
if (process.env.GITHUB_ACTIONS === 'true' && process.env.GITHUB_ENV) {
  for (const value of [key, secret]) console.log(`::add-mask::${value}`);
  appendFileSync(process.env.GITHUB_ENV, Object.entries(values).map(([name, value]) => `${name}=${value}`).join('\n') + '\n');
}
console.log('Prepared ignored local integration configuration; hosted settings were not changed.');
