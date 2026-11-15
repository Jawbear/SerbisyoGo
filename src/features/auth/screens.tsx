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
  const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : config.siteUrl.replace(/\/$/, '');
  return `${origin}/auth/callback/?next=${encodeURIComponent(next)}`;
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
    </svg>
  );
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
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthError, setOauthError] = useState('');
  const headings = {
    login: ['Welcome back', 'Your home services, all together.', 'Sign in to manage bookings, messages, and your service history.'],
    admin: ['Admin workspace', 'A trusted community starts with you.', 'Oversee service quality, support local providers, and keep every booking accountable.'],
    register: ['Join your local community', 'A little help starts here.', 'Create your customer account to request home services.'],
    verify: ['One last step', 'Check your inbox.', 'Use the verification link sent to your email address to finish setting up your account.'],
    forgot: ['Account recovery', 'Let’s get you back in.', 'Request a secure password reset link.'],
    reset: ['Account security', 'Choose a new password.', 'Set a strong password for your SerbisyoGo account.']
  }[mode];
  const title = admin ? 'Administrator sign in' : mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create an account' : mode === 'verify' ? 'Verify your email' : mode === 'forgot' ? 'Reset password' : 'Update password';

  const handleGoogleAuth = async () => {
    try {
      setOauthLoading(true);
      setOauthError('');
      const client = requireDb();
      const targetNext = safeRedirect(params.get('next'), '/dashboard/');
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl(targetNext)
        }
      });
      if (error) throw error;
    } catch (err: unknown) {
      setOauthError(err instanceof Error ? err.message : 'Unable to connect to Google account. Please try again.');
      setOauthLoading(false);
    }
  };

  return <div className="auth-layout"><div className="auth-story"><p className="eyebrow green">{headings[0]}</p><h1>{headings[1]}</h1><p>{headings[2]}</p><div className="auth-benefits"><div><ShieldCheck size={20} /><span>{admin ? 'Review provider applications' : 'Compare provider profiles'}</span></div><div><CalendarDays size={20} /><span>{admin ? 'Monitor bookings and settlements' : 'Schedule around your day'}</span></div><div><MessagesSquare size={20} /><span>{admin ? 'Resolve concerns with clear records' : 'Keep your service records'}</span></div></div></div><Card className="auth-card"><h2>{title}</h2><p className="small muted">{admin ? 'Use your authorized administrator account.' : mode === 'verify' ? 'Email verification is enabled. No SMS code is required.' : 'Your details stay with your account.'}</p>{!backendConfigured && <Notice>Authentication is unavailable until Supabase is configured.</Notice>}{sent && <Notice>Check your email for the secure link. If the account is eligible, a message will arrive shortly.</Notice>}{oauthError && <Notice error>{oauthError}</Notice>}

<MutationForm key={mode} submit={mode === 'verify' ? 'Resend verification email' : mode === 'forgot' ? 'Send reset link' : title} disabled={!backendConfigured} extraActions={!admin && (mode === 'login' || mode === 'register') ? (
  <button
    type="button"
    className="google-btn"
    disabled={!backendConfigured || oauthLoading}
    onClick={handleGoogleAuth}
    aria-label={mode === 'register' ? 'Sign up with Google (Gmail)' : 'Sign in with Google (Gmail)'}
    title="Continue with Google (Gmail)"
  >
    <GoogleIcon />
    <span>{oauthLoading ? 'Connecting…' : mode === 'register' ? 'Sign up with Gmail' : 'Continue with Gmail'}</span>
  </button>
) : undefined} success={mode === 'reset' ? 'Password updated successfully.' : mode === 'verify' || mode === 'forgot' ? 'Email request submitted.' : 'Account request completed.'} onSubmit={async f => {
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
            data, error
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
          if (error) {
            if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('already exists')) {
              throw new Error('An account with this email already exists. Please sign in or use password recovery.');
            }
            throw error;
          }
          router.push(data.session ? '/dashboard/' : `/verify/?email=${encodeURIComponent(email)}`);
          session.refresh();
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
 {mode !== 'reset' && <Field label={admin ? 'Work email' : 'Email address'} name="email" type="email" autoComplete="email" placeholder="you@example.com" defaultValue={mode === 'verify' ? params.get('email') || '' : ''} maxLength={254} required />}
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
    const rawError = url.searchParams.get('error_description') || url.searchParams.get('error');
    if (rawError) {
      const friendly = rawError.includes('Unable to exchange external code')
        ? 'Google rejected the authentication token exchange. Please ensure your Google Cloud OAuth consent screen is Published (or your Gmail address is added under Test Users), and that the Client Secret in Supabase has no spaces.'
        : rawError;
      queueMicrotask(() => setError(friendly));
    }
    const token_hash = url.searchParams.get('token_hash');
    const type = url.searchParams.get('type');
    const code = url.searchParams.get('code');

    const client = requireDb();
    if (code) {
      void client.auth.getSession().then(({ data: { session: existingSession } }) => {
        if (existingSession) {
          session.refresh();
          return;
        }
        return client.auth.exchangeCodeForSession(code).then(({ error: exchangeError }) => {
          if (exchangeError && !exchangeError.message.toLowerCase().includes('already')) {
            setError(exchangeError.message);
          } else {
            session.refresh();
          }
        });
      });
    } else if (token_hash && (type === 'signup' || type === 'recovery' || type === 'email')) {
      void client.auth.verifyOtp({
        token_hash,
        type
      }).then(({
        error: otpError
      }) => {
        if (otpError) setError(otpError.message);
        else session.refresh();
      });
    }
  }, [session]);
  useEffect(() => {
    if (session.user && !session.loading) {
      const next = safeRedirect(params.get('next'), session.role === 'provider' ? '/provider/' : session.role === 'admin' ? '/admin/' : '/dashboard/');
      router.replace(next);
    }
  }, [session.user, session.loading, session.role, params, router]);
  return <><PageHeading title="Verifying your account" /><Card><div className="empty"><MailCheck size={40} />{error ? <Notice error>{error}</Notice> : session.user ? <p>Verified. Opening your account…</p> : <p className="muted">Validating your authentication. If you were signing in with Google or an email link, you will be redirected shortly.</p>}<ButtonLink href="/verify/" secondary>Request a new verification link</ButtonLink><ButtonLink href="/forgot-password/" secondary>Password recovery</ButtonLink></div></Card></>;
}
