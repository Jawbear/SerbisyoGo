#!/usr/bin/env node
/**
 * SerbisyoGo — Production Deployment Checklist
 * Usage: node scripts/production-deploy.mjs
 */

const R = '\x1b[0m', B = '\x1b[1m', G = '\x1b[32m', X = '\x1b[31m', C = '\x1b[36m', D = '\x1b[2m';
const h = t => console.log(`\n${B}${G}═══ ${t} ═══${R}\n`);
const s = t => console.log(`\n${B}${C}── ${t} ──${R}\n`);
const ck = t => console.log(`  ${D}☐${R} ${t}`);
const cm = t => console.log(`    ${C}$ ${t}${R}`);
const nt = t => console.log(`    ${D}${t}${R}`);
const dg = t => console.log(`    ${X}✘ ${t}${R}`);

h('SerbisyoGo Production Deployment');

s('PHASE 1 — Pre-deployment');
ck('All tests passing'); cm('npm test && npm run typecheck && npm run lint && npm run build');
ck('Package lock committed');
ck('Env vars audited');
nt('NEXT_PUBLIC_SITE_URL = https://serbisyogo.sg-team.workers.dev');
dg('NEVER put SUPABASE_SECRET_KEY in build vars');

s('PHASE 2 — Supabase');
ck('Project linked'); cm('npx supabase link --project-ref qkopbbxmeqqzomrawltf');
ck('Migrations applied'); cm('npx supabase db push');
ck('Edge Functions deployed');
cm('npx supabase functions deploy files');
cm('npx supabase functions deploy releases');
cm('npx supabase functions deploy admin-accounts');
ck('Secrets set');
cm('npx supabase secrets set ALLOWED_ORIGINS=http://localhost:3000,https://serbisyogo.sg-team.workers.dev APK_MAX_BYTES=52428800');
ck('Types regenerated'); cm('npm run db:types');
ck('Admin provisioned'); cm('npm run admin:provision -- admin@email.com --confirm admin@email.com');
ck('Fee/commission/GCash configured in admin dashboard');

s('PHASE 3 — SMTP & Auth');
ck('SMTP configured'); cm('node scripts/configure-smtp.mjs');
ck('Site URL: https://serbisyogo.sg-team.workers.dev');
ck('Redirect: https://serbisyogo.sg-team.workers.dev/auth/callback/');
dg('Remove localhost redirects for production');
ck('Email templates deployed (3 templates)');
ck('Registration + verification tested');
ck('Password recovery tested');

s('PHASE 4 — Cloudflare Worker');
ck('Build vars in Cloudflare Dashboard (NEXT_PUBLIC_*)');
ck('Deploy tested'); cm('npm run build && npx wrangler deploy --config wrangler.jsonc');
ck('CI/CD secrets: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID');
ck('HTTPS verified on live URL');

s('PHASE 5 — Security');
ck('Response headers (X-Content-Type-Options, X-Frame-Options, CSP)');
ck('Private Storage buckets verified');
ck('RLS enabled on all tables');

s('PHASE 6 — Post-deploy Smoke Tests');
ck('Landing page loads'); ck('Registration works'); ck('Login/logout works');
ck('Booking flow end-to-end'); ck('GCash payment works');
ck('Provider dashboard loads'); ck('Admin dashboard at /admin/login/');
ck('Messages/Realtime works'); ck('Map tiles load');
ck('Photo upload works'); ck('APK download page');
ck('Responsive: 320px, 375px, 428px');
ck('Terms + Privacy pages display');

s('PHASE 7 — Monitoring');
ck('Supabase Dashboard monitoring'); ck('Cloudflare analytics');
ck('Error alerts configured'); ck('Backup schedule confirmed');

console.log(`\n${B}${G}35 items across 7 phases — complete before alpha/beta launch${R}\n`);
