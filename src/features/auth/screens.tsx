'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ShieldCheck, CalendarDays, MessagesSquare, MailCheck } from 'lucide-react';
import { requireDb, rpc } from '@/lib/backend';
import { backendConfigured, config } from '@/lib/config';
import { normalizePhone, safeRedirect } from '@/lib/domain';
import { Card, Field, MutationForm, Notice, PageHeading, ButtonLink } from '@/components/ui';
import { useSession } from '@/components/session';
function redirectUrl(next = '/dashboard/') {
  return `${config.siteUrl.replace(/\/$/, '')}/auth/callback/?next=${encodeURIComponent(next)}`;
}
export function AuthScreen({
  mode = 'login'
}: {
  mode?: 'login' | 'register' | 'verify' | 'forgot' | 'reset' | 'admin';
}) {
  const router = useRouter(),
    params = useSearchParams();
  const session = useSession();
  const admin = mode === 'admin';
  const [sent, setSent] = useState(false);
  const headings = {
    login: ['Welcome back', 'Your home services, all together.', 'Sign in to manage bookings, messages, and your service history.'],
    admin: ['Admin workspace', 'A trusted community starts with you.', 'Oversee service quality, support local providers, and keep every booking accountable.'],
    register: ['Join your local community', 'A little help starts here.', 'Create your customer account to request home services.'],
    verify: ['One last step', 'Check your inbox.', 'Use the verification link sent to your email address to finish setting up your account.'],
    forgot: ['Account recovery', 'Let’s get you back in.', 'Request a secure password reset link.'],
    reset: ['Account security', 'Choose a new password.', 'Set a strong password for your SerbisyoGo account.']
  }[mode];
  const title = admin ? 'Administrator sign in' : mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create an account' : mode === 'verify' ? 'Verify your email' : mode === 'forgot' ? 'Reset password' : 'Update password';
  return <div className="auth-layout"><div className="auth-story"><p className="eyebrow green">{headings[0]}</p><h1>{headings[1]}</h1><p>{headings[2]}</p><div className="auth-benefits"><div><ShieldCheck size={20} /><span>{admin ? 'Review provider applications' : 'Compare provider profiles'}</span></div><div><CalendarDays size={20} /><span>{admin ? 'Monitor bookings and settlements' : 'Schedule around your day'}</span></div><div><MessagesSquare size={20} /><span>{admin ? 'Resolve concerns with clear records' : 'Keep your service records'}</span></div></div></div><Card className="auth-card"><h2>{title}</h2><p className="small muted">{admin ? 'Use your authorized administrator account.' : mode === 'verify' ? 'Email verification is enabled. No SMS code is required.' : 'Your details stay with your account.'}</p>{!backendConfigured && <Notice>Authentication is unavailable until Supabase is configured.</Notice>}{sent && <Notice>Check your email for the secure link. If the account is eligible, a message will arrive shortly.</Notice>}<MutationForm key={mode} submit={mode === 'verify' ? 'Resend verification email' : mode === 'forgot' ? 'Send reset link' : title} disabled={!backendConfigured} success={mode === 'reset' ? 'Password updated successfully.' : mode === 'verify' || mode === 'forgot' ? 'Email request submitted.' : 'Account request completed.'} onSubmit={async f => {
        const client = requireDb();
        const email = String(f.get('email') || '').trim();
        const password = String(f.get('password') || '');
        if (mode === 'register') {
          if (password.length < 12 || password !== f.get('confirm')) throw new Error('Use at least 12 characters and matching passwords.');
          if (!f.get('consent')) throw new Error('Please confirm your consent to create an account.');
          const phone = normalizePhone(String(f.get('phone')));
          const full_name = String(f.get('full_name')).trim();
          if (full_name.length < 2) throw new Error('Please enter your full name.');
          const {
            error
          } = await client.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: redirectUrl(),
              data: {
                full_name,
                phone,
                consent: true
              }
            }
          });
          if (error) throw error;
          router.push('/verify/');
        } else if (mode === 'login' || admin) {
          const {
            error
          } = await client.auth.signInWithPassword({
            email,
            password
          });
          if (error) throw error;
          const context = await rpc<{
            role: string;
            profile: {
              status: string;
            };
          }>('user_context');
          if (context.profile.status !== 'active') throw new Error('Your account is restricted. Contact support.');
          if (admin && context.role !== 'admin') {
            await client.auth.signOut();
            throw new Error('Administrator access is required.');
          }
          router.push(safeRedirect(params.get('next'), admin || context.role === 'admin' ? '/admin/' : context.role === 'provider' ? '/provider/' : '/dashboard/'));
          session.refresh();
        } else if (mode === 'forgot') {
          const {
            error
          } = await client.auth.resetPasswordForEmail(email, {
            redirectTo: redirectUrl('/reset-password/')
          });
          if (error) throw error;
          setSent(true);
        } else if (mode === 'verify') {
          const {
            error
          } = await client.auth.resend({
            type: 'signup',
            email,
            options: {
              emailRedirectTo: redirectUrl()
            }
          });
          if (error) throw error;
          setSent(true);
        } else {
          if (password.length < 12 || password !== f.get('confirm')) throw new Error('Use at least 12 characters and matching passwords.');
          const {
            data: {
              user
            },
            error: identityError
          } = await client.auth.getUser();
          if (identityError || !user) throw new Error('Open the latest recovery link in your email first.');
          const {
            error
          } = await client.auth.updateUser({
            password
          });
          if (error) throw error;
          router.push('/account/');
        }
      }}>
 {mode === 'register' && <><Field label="Full name" name="full_name" autoComplete="name" required minLength={2} maxLength={100} /><Field label="Philippine mobile number" name="phone" type="tel" autoComplete="tel" placeholder="09XXXXXXXXX" required /></>}
 {mode !== 'reset' && <Field label={admin ? 'Work email' : 'Email address'} name="email" type="email" autoComplete="email" placeholder="you@example.com" required />}
 {['login', 'admin', 'register', 'reset'].includes(mode) && <Field label={mode === 'reset' ? 'New password' : 'Password'} name="password" type="password" autoComplete={mode === 'register' || mode === 'reset' ? 'new-password' : 'current-password'} minLength={mode === 'register' || mode === 'reset' ? 12 : undefined} required />}
 {['register', 'reset'].includes(mode) && <Field label="Confirm password" name="confirm" type="password" autoComplete="new-password" required minLength={12} />}
 {mode === 'register' && <label className="check-field"><input type="checkbox" name="consent" required /><span>I consent to processing my account and booking information as described in the <Link href="/privacy/">privacy notice</Link> and acknowledge the <Link href="/terms/">service terms</Link>.</span></label>}
 {(mode === 'login' || admin) && <Link className="small" href="/forgot-password/">Forgot password?</Link>}
 </MutationForm><div className="small" style={{
        marginTop: 24
      }}>{mode === 'login' ? <>New here? <Link href="/register/">Create an account</Link></> : mode === 'register' ? <>Already have an account? <Link href="/login/">Sign in</Link></> : <Link href="/login/">Back to sign in</Link>}</div>{mode === 'register' && <p className="small muted" style={{
        marginTop: 16
      }}>Want to offer services? Create your account, then <Link href="/provider/apply/">apply as a provider</Link>.</p>}{admin && <p className="small muted" style={{
        marginTop: 16
      }}>Admin privileges are provisioned securely. Account actions are recorded in the audit log.</p>}</Card></div>;
}
export function AuthCallback() {
  const session = useSession(),
    params = useSearchParams(),
    router = useRouter();
  const [error, setError] = useState('');
  useEffect(() => {
    const url = new URL(window.location.href);
    const message = url.searchParams.get('error_description');
    if (message) queueMicrotask(() => setError(message));
    const token_hash = url.searchParams.get('token_hash');
    const type = url.searchParams.get('type');
    if (token_hash && (type === 'signup' || type === 'recovery' || type === 'email')) {
      void requireDb().auth.verifyOtp({
        token_hash,
        type
      }).then(({
        error
      }) => {
        if (error) setError(error.message);
      });
    }
  }, []);
  useEffect(() => {
    if (session.user && !session.loading) {
      const next = safeRedirect(params.get('next'), session.role === 'provider' ? '/provider/' : session.role === 'admin' ? '/admin/' : '/dashboard/');
      router.replace(next);
    }
  }, [session.user, session.loading, session.role, params, router]);
  return <><PageHeading title="Verifying your account" /><Card><div className="empty"><MailCheck size={40} />{error ? <Notice error>{error}</Notice> : session.user ? <p>Verified. Opening your account…</p> : <p className="muted">Validating the secure email link. If the link has expired, request a new one.</p>}<ButtonLink href="/verify/" secondary>Request a new verification link</ButtonLink><ButtonLink href="/forgot-password/" secondary>Password recovery</ButtonLink></div></Card></>;
}
