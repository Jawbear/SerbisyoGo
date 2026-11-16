#!/usr/bin/env node
// Builds and deploys the static export to Cloudflare Workers.
// Requires explicit --confirm and either `npx wrangler login` or
// CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID.
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const allowed = new Set(['--confirm', '--dry-run']);
for (const arg of args) {
  if (!allowed.has(arg)) {
    console.error('Usage: node scripts/deploy-cloudflare.mjs --confirm [--dry-run]');
    process.exit(1);
  }
}
const confirm = args.includes('--confirm');
const dryRun = args.includes('--dry-run');

for (const name of ['.env.production.local', '.env.local']) {
  const path = `${root}${name}`;
  if (existsSync(path)) {
    process.loadEnvFile(path);
    console.log(`Loaded ${name}`);
    break;
  }
}

const site = process.env.NEXT_PUBLIC_SITE_URL || '';
let publicSite = false;
try {
  const url = new URL(site);
  publicSite = url.protocol === 'https:' && !['localhost', '127.0.0.1', '::1'].includes(url.hostname) && !/\.(test|example|invalid)$/i.test(url.hostname);
} catch { /* reported below */ }

if (!publicSite) {
  console.error('Refusing to deploy: NEXT_PUBLIC_SITE_URL must be a public HTTPS origin, not localhost.');
  console.error('Create .env.production.local from .env.production.example and set the real Worker/custom-domain URL.');
  process.exit(1);
}
for (const name of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']) {
  if (!process.env[name]) {
    console.error(`Refusing to deploy: ${name} is not set.`);
    process.exit(1);
  }
}

if (!confirm) {
  console.log(`Cloudflare deploy plan for ${site}
1. npm run build with the loaded public environment.
2. node --experimental-strip-types scripts/production-deploy.mjs --check --require-build.
3. npx wrangler deploy --config wrangler.jsonc.
No changes were made. Re-run with --confirm to execute. Add --dry-run to validate without publishing.`);
  process.exit(1);
}

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

if (!process.env.CLOUDFLARE_API_TOKEN) {
  const whoami = spawnSync(npx, ['wrangler', 'whoami'], { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' });
  const output = `${whoami.stdout || ''}${whoami.stderr || ''}`;
  if (whoami.status !== 0 || /not authenticated/i.test(output)) {
    console.error('Wrangler is not authenticated. Run `npx wrangler login` or set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID.');
    process.exit(1);
  }
}

const build = spawnSync(npm, ['run', 'build'], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
if (build.status !== 0) process.exit(build.status ?? 1);

const preflight = spawnSync(process.execPath, ['--experimental-strip-types', 'scripts/production-deploy.mjs', '--check', '--require-build'], {
  cwd: root,
  stdio: 'inherit'
});
if (preflight.status !== 0) {
  console.error('Preflight failed; nothing was deployed.');
  process.exit(preflight.status ?? 1);
}

const deployArgs = ['wrangler', 'deploy', '--config', 'wrangler.jsonc'];
if (dryRun) deployArgs.push('--dry-run');
const deploy = spawnSync(npx, deployArgs, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
if (deploy.status !== 0) process.exit(deploy.status ?? 1);

console.log(dryRun ? 'Cloudflare dry run completed; nothing was published.' : `Published ${site}`);
