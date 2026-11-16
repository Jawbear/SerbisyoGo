import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { policyApproval, policyApprovalProblems } from '../src/lib/policy-approval.ts';

export function publicHttpsOrigin(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password &&
      url.pathname === '/' && !url.search && !url.hash &&
      !/^(localhost|127\.|0\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[.*\])/.test(url.hostname) &&
      url.hostname.includes('.') && !/\.(localhost|test|example|invalid|local)$/.test(url.hostname);
  } catch { return false; }
}

export function isPublishableKey(value) {
  if (typeof value !== 'string' || !value || value.startsWith('sb_secret_')) return false;
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(value)) return true;
  try { return JSON.parse(Buffer.from(value.split('.')[1], 'base64url')).role === 'anon'; }
  catch { return false; }
}

export function deploymentProblems(root, env, requireBuild = false) {
  const problems = [];
  if (!publicHttpsOrigin(env.NEXT_PUBLIC_SITE_URL)) problems.push('NEXT_PUBLIC_SITE_URL must be a public HTTPS origin.');
  if (!publicHttpsOrigin(env.NEXT_PUBLIC_SUPABASE_URL)) problems.push('NEXT_PUBLIC_SUPABASE_URL must be a public HTTPS origin.');
  if (!isPublishableKey(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)) problems.push('Use a publishable or legacy anon key in NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
  if (env.NEXT_PUBLIC_BASE_PATH) problems.push('Cloudflare deployment requires an empty NEXT_PUBLIC_BASE_PATH.');
  problems.push(...policyApprovalProblems(policyApproval).map(value => `Policy: ${value}`));
  const read = file => existsSync(join(root, file)) ? readFileSync(join(root, file), 'utf8') : '';
  try {
    const worker = JSON.parse(read('wrangler.jsonc'));
    if (worker.assets?.directory !== './out' || worker.assets?.html_handling !== 'force-trailing-slash') problems.push('Worker assets must serve ./out with trailing slashes.');
  } catch { problems.push('Worker configuration is missing or invalid.'); }
  const headers = read('public/_headers');
  for (const name of ['X-Content-Type-Options: nosniff', 'Referrer-Policy:', 'X-Frame-Options: DENY', 'Permissions-Policy:']) {
    if (!headers.includes(name)) problems.push(`Missing host security header: ${name}`);
  }
  for (const template of ['confirmation', 'recovery', 'email_change', 'magic_link']) {
    if (!/\{\{\s*\.ConfirmationURL\s*\}\}/.test(read(`supabase/templates/${template}.html`))) problems.push(`Email template ${template} is missing its confirmation link.`);
  }
  if (requireBuild) {
    for (const path of ['index.html', '404.html', 'login/index.html', 'register/index.html', 'auth/callback/index.html', 'admin/login/index.html', 'download/index.html', 'terms/index.html', 'privacy/index.html', 'pricing/index.html']) {
      if (!existsSync(join(root, 'out', path))) problems.push(`Missing exported route: ${path}`);
    }
    if (!headers || read('out/_headers') !== headers) problems.push('Exported host headers are missing or stale; rebuild.');
    const secrets = Object.entries(env).filter(([name, value]) =>
      /^(SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY)$/.test(name) && value?.length > 16
    ).map(([, value]) => value);
    const walk = dir => {
      if (!existsSync(dir)) return;
      for (const item of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, item.name);
        if (item.isDirectory()) walk(path);
        else if (/\.(html|js|json|txt|css)$/.test(item.name) && secrets.some(secret => readFileSync(path, 'utf8').includes(secret))) {
          problems.push('A configured server-only key was found in the export. Remove it and rebuild.');
          return;
        }
      }
    };
    if (secrets.length) walk(join(root, 'out'));
  }
  return [...new Set(problems)];
}
