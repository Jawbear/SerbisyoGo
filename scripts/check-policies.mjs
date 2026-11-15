#!/usr/bin/env node
// Policy readiness check. Read-only: never edits policy text or hosted settings.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  isPolicyApproved,
  policyApproval,
  policyApprovalProblems
} from '../src/lib/policy-approval.ts';

const args = process.argv.slice(2);
const allowed = new Set(['--require-approved', '--hosted']);
for (const arg of args) {
  if (!allowed.has(arg)) {
    console.error(`Usage: node --experimental-strip-types scripts/check-policies.mjs [--require-approved] [--hosted]`);
    process.exit(1);
  }
}

const root = fileURLToPath(new URL('../', import.meta.url));
let failed = false;
const pass = label => console.log(`PASS ${label}`);
const fail = label => { failed = true; console.log(`FAIL ${label}`); };
const warn = label => console.log(`WARN ${label}`);

console.log(`SerbisyoGo policy check — ${policyApproval.version} (${policyApproval.status})`);

for (const path of ['src/lib/policies.ts', 'src/features/policies/policy-page.tsx', 'src/app/terms/page.tsx', 'src/app/privacy/page.tsx', 'src/app/pricing/page.tsx']) {
  (existsSync(`${root}${path}`) ? pass : fail)(`${path} exists`);
}

const source = readFileSync(`${root}src/lib/policies.ts`, 'utf8');
for (const placeholder of ['support@serbisyogo.ph', 'dpo@serbisyogo.ph']) {
  (source.includes(placeholder) ? fail : pass)(`no unverified placeholder ${placeholder}`);
}
(source.includes('<h2>Information used by the service</h2>') ? fail : pass)('legacy inline disclosure is not rendered');

const problems = policyApprovalProblems(policyApproval);
if (!isPolicyApproved(policyApproval)) {
  warn('policy record is a draft; policy pages show the review banner and production deploy is blocked');
  for (const problem of problems.filter(problem => problem !== 'policy record is still marked as draft')) warn(problem);
} else {
  for (const problem of problems) fail(problem);
}
if (!isPolicyApproved(policyApproval) && args.includes('--require-approved')) {
  fail('operator approval is required for this command');
}
if (isPolicyApproved(policyApproval)) {
  pass(`effective ${policyApproval.effectiveDate}, approved by ${policyApproval.approvedBy} on ${policyApproval.approvedAt}`);
  pass(`support ${policyApproval.supportEmail}; DPO ${policyApproval.dpoEmail}`);
  pass(`pricing ${policyApproval.bookingFeeCentavos} centavos fee, ${policyApproval.commissionBps} bps commission`);
}

if (args.includes('--hosted')) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    fail('--hosted requires NEXT_PUBLIC_SUPABASE_URL and the server-only SUPABASE_SECRET_KEY');
  } else {
    try {
      const response = await fetch(`${url}/rest/v1/app_settings?select=version,fee_centavos,commission_bps,support_email,active&active=eq.true`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const rows = await response.json();
      const active = Array.isArray(rows) ? rows[0] : null;
      if (!active) {
        fail('no active app_settings row is configured');
      } else {
        (Number(active.fee_centavos) === policyApproval.bookingFeeCentavos ? pass : fail)(
          `hosted booking fee ${active.fee_centavos} matches policy ${policyApproval.bookingFeeCentavos}`
        );
        (Number(active.commission_bps) === policyApproval.commissionBps ? pass : fail)(
          `hosted commission ${active.commission_bps} bps matches policy ${policyApproval.commissionBps}`
        );
        if (policyApproval.supportEmail && active.support_email) {
          (String(active.support_email).toLowerCase() === policyApproval.supportEmail.toLowerCase() ? pass : warn)(
            `hosted support email ${active.support_email} ${active.support_email === policyApproval.supportEmail ? 'matches' : 'differs from'} policy`
          );
        } else {
          warn('hosted support email or approved policy email is still empty');
        }
      }
    } catch (error) {
      fail(`hosted settings query failed: ${error.message}`);
    }
  }
}

console.log(failed
  ? 'Policy check failed. Resolve every FAIL before publishing or deploying.'
  : 'Policy check passed for its current stage. Draft pages remain unindexed and deployment-blocking.');
process.exitCode = failed ? 1 : 0;
