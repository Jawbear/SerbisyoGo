// Build a disposable checkout from the candidate, including untracked release files.
// File preparation only. Starting Supabase requires a Docker host.
import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const paths = [
  '.github/scripts/check-release.mjs',
  'package.json', 'package-lock.json', 'next.config.ts', 'next-env.d.ts', 'tsconfig.json',
  'postcss.config.mjs', 'playwright.config.ts', 'src', 'public', 'tests',
  'mobile/src/data/discovery.js', 'mobile/src/data/conversations.js', 'mobile/src/data/receiptReviews.js',
  'scripts/verify-published-apk.mjs', 'scripts/prepare-local-integration.mjs', 'scripts/seed-demo.mjs', 'scripts/wait-for-local-edge.mjs',
  'scripts/test-db-embedded.mjs', 'scripts/recovery-manifest.sql', 'scripts/run-staging-056.sh',
  'scripts/check-staging-bindings.mjs', 'scripts/generate-types.mjs',
  'supabase/config.toml', 'supabase/seed.sql', 'supabase/migrations/*.sql', 'supabase/tests/*.sql',
  'supabase/templates/*.html', 'supabase/functions/deno.json', 'supabase/functions/deno.lock', 'supabase/functions/*/*.ts',
];
const files = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', ...paths],
  { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
const migrations = files.filter(file => file.startsWith('supabase/migrations/')).sort();
if (migrations.length !== 27 || !migrations[22].endsWith('202611170023_provider_trust_badges.sql') ||
    !migrations[23].endsWith('202611190024_discovery.sql') || !migrations[24].endsWith('202611190025_booking_communications.sql') ||
    !migrations[25].endsWith('202611240026_booking_reliability.sql') || !migrations[26].endsWith('202611240027_booking_consent_and_location.sql')) {
  throw new Error('Expected the reviewed migration set through 027.');
}
const cache = join(root, '.cache');
await mkdir(cache, { recursive: true });
const staging = await mkdtemp(join(cache, 'serbisyogo-056-'));
for (const file of files) {
  const destination = join(staging, file);
  await mkdir(dirname(destination), { recursive: true });
  if (file === 'supabase/config.toml') {
    const config = await readFile(join(root, file), 'utf8');
    if (!/^project_id = "serbisyogo"\r?$/m.test(config) || !/^major_version = 17\r?$/m.test(config)) {
      throw new Error('Expected the SerbisyoGo local configuration for PostgreSQL 17.');
    }
    const allowedSections = new Set(['api', 'db', 'db.seed', 'studio', 'auth', 'auth.email',
      'auth.email.template.confirmation', 'auth.email.template.recovery', 'auth.email.template.email_change',
      'storage', 'functions.files', 'functions.releases', 'functions.admin-accounts']);
    const sections = [...config.matchAll(/^\s*\[([^\]]+)\]/gm)].map(match => match[1]);
    if (sections.some(section => !allowedSections.has(section)) ||
        !/^site_url = "http:\/\/localhost:3000"\r?$/m.test(config) || /^\s*[^#\s].*env\(/m.test(config)) {
      throw new Error('Review staging isolation before adding an integration or changing Auth endpoints.');
    }
    await writeFile(destination, config.replace('project_id = "serbisyogo"', 'project_id = "' + basename(staging).toLowerCase() + '"'));
  } else {
    await copyFile(join(root, file), destination);
  }
}
console.log(relative(root, staging));
