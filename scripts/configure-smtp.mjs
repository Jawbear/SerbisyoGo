#!/usr/bin/env node
/**
 * Production SMTP & Email Configuration Guide for SerbisyoGo
 *
 * This script outputs a step-by-step checklist for configuring
 * production email delivery through Supabase.
 *
 * Usage: node scripts/configure-smtp.mjs
 */

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';

function heading(text) { console.log(`\n${BOLD}${GREEN}═══ ${text} ═══${RESET}\n`); }
function step(n, text) { console.log(`  ${CYAN}${n}.${RESET} ${text}`); }
function info(text) { console.log(`     ${DIM}${text}${RESET}`); }
function warn(text) { console.log(`     ${YELLOW}⚠ ${text}${RESET}`); }

console.log(`${BOLD}${GREEN}
╔═══════════════════════════════════════════════════════════╗
║       SerbisyoGo — Production SMTP Configuration         ║
║       Email Delivery Setup Guide                         ║
╚═══════════════════════════════════════════════════════════╝${RESET}`);

heading('STEP 1: Choose an SMTP Provider');
console.log('  Recommended providers (all have free tiers for alpha/beta):');
console.log('');
step(1, `${BOLD}Resend${RESET} (Recommended)`);
info('Free: 100 emails/day, 3,000/month');
info('https://resend.com');
info('Host: smtp.resend.com | Port: 465 | User: resend | Pass: re_YOUR_KEY');
console.log('');
step(2, `${BOLD}Brevo (Sendinblue)${RESET}`);
info('Free: 300 emails/day');
info('Host: smtp-relay.brevo.com | Port: 587');
console.log('');
step(3, `${BOLD}SendGrid${RESET}`);
info('Free: 100 emails/day');
info('Host: smtp.sendgrid.net | Port: 587 | User: apikey');

heading('STEP 2: Configure Sender Domain');
step(1, 'Register/use your domain (e.g. serbisyogo.ph)');
step(2, 'Add DNS: SPF, DKIM, DMARC records per your SMTP provider');
step(3, 'Verify domain in SMTP provider dashboard');
step(4, 'Set sender: noreply@serbisyogo.ph');
warn('Without proper DNS, emails land in spam');

heading('STEP 3: Supabase Dashboard SMTP');
step(1, 'Dashboard → Authentication → Email Templates → SMTP Settings');
step(2, 'Enable "Custom SMTP"');
step(3, 'Sender: noreply@serbisyogo.ph / SerbisyoGo');
step(4, 'Enter Host, Port, Username, Password from your provider');
step(5, 'Save and send test email');

heading('STEP 4: Deploy Email Templates');
step(1, 'Dashboard → Authentication → Email Templates');
step(2, 'Confirmation → paste supabase/templates/confirmation.html');
info('Subject: "Verify your SerbisyoGo account"');
step(3, 'Recovery → paste supabase/templates/recovery.html');
info('Subject: "Reset your SerbisyoGo password"');
step(4, 'Email Change → paste supabase/templates/email_change.html');
info('Subject: "Confirm your email change — SerbisyoGo"');

heading('STEP 5: Auth Settings');
step(1, 'Site URL: https://serbisyogo.sg-team.workers.dev');
step(2, 'Redirect URLs:');
info('https://serbisyogo.sg-team.workers.dev/auth/callback/');
info('http://localhost:3000/auth/callback/  (remove for production)');
step(3, 'Rate limits: 4 emails/hour/address, OTP expiry 3600s');
step(4, 'Min password: 12 chars (already configured)');

heading('STEP 6: Test Email Delivery');
step(1, 'Register a test account on live website');
step(2, 'Check confirmation email in inbox (and spam)');
step(3, 'Click verify link → should redirect to site');
step(4, 'Test password recovery flow');
step(5, 'Test with Gmail, Yahoo, Outlook');
warn('Test on mobile email clients too');

heading('PRODUCTION CHECKLIST');
[
  'SMTP provider created and verified',
  'Domain DNS records set (SPF, DKIM, DMARC)',
  'Supabase Custom SMTP enabled',
  'All 3 email templates deployed',
  'Test emails received (Gmail, Yahoo, Outlook)',
  'Verification links work correctly',
  'Recovery links work correctly',
  'Rate limits configured',
  'Localhost redirect removed from production',
].forEach(item => console.log(`  ☐ ${item}`));

console.log(`\n${GREEN}${BOLD}Guide complete.${RESET}\n`);
