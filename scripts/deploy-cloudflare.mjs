#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
if (!args.includes('--dry-run') || args.some(arg => !['--confirm', '--dry-run'].includes(arg))) {
  console.error('For local validation use npm run deploy:cloudflare -- --dry-run. For publication, use the reviewed Cloudflare production workflow on main.');
  process.exit(1);
}
if (existsSync(root + '.env.production.local')) process.loadEnvFile(root + '.env.production.local');

function run(command, arguments_, shell = false) {
  const result = spawnSync(command, arguments_, { cwd: root, stdio: 'inherit', shell });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const preflight = ['--experimental-strip-types', 'scripts/production-deploy.mjs', '--check'];
run(process.execPath, preflight);
const windows = process.platform === 'win32';
run(windows ? 'npm.cmd' : 'npm', ['run', 'build'], windows);
run(process.execPath, [...preflight, '--require-build']);
run(windows ? 'npx.cmd' : 'npx', ['--yes', 'wrangler@4.164.0', 'deploy', '--config', 'wrangler.jsonc', '--dry-run'], windows);
console.log('Cloudflare package validation completed locally.');
