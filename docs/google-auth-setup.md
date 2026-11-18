# Google (Gmail) OAuth Authentication Setup Guide

This guide explains how to enable **Sign in / Sign up with Google (Gmail)** for SerbisyoGo so users can create accounts and sign in with their Google/Gmail credentials.

---

## 1. Google Cloud Console Configuration

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Select or create a project (e.g. `SerbisyoGo`).
3. Navigate to **APIs & Services** → **OAuth consent screen**:
   - Choose **External** user type and click **Create**.
   - **App name**: `SerbisyoGo`
   - **User support email**: Your support email (e.g. `support@serbisyogo.ph`)
   - **Developer contact information**: Your email
   - Under **Scopes**, ensure the standard scopes are selected:
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
     - `openid`
   - Save and proceed.
4. Navigate to **APIs & Services** → **Credentials**:
   - Click **+ Create Credentials** → **OAuth client ID**.
   - **Application type**: `Web application`
   - **Name**: `SerbisyoGo Web & Mobile`
   - **Authorized JavaScript origins**:
     - `https://serbisyogo.sg-team.workers.dev`
     - `http://localhost:3000` (for local testing)
   - **Authorized redirect URIs**:
     - `https://qkopbbxmeqqzomrawltf.supabase.co/auth/v1/callback`
   - Click **Create**.
5. Copy your **Client ID** and **Client Secret**.

---

## 2. Supabase Dashboard Configuration

1. Log into your [Supabase Dashboard](https://supabase.com/dashboard/project/qkopbbxmeqqzomrawltf).
2. Go to **Authentication** → **Providers**.
3. Locate **Google** in the list and click to expand:
   - Toggle **Enable Sign in with Google** to **ON**.
   - Paste your **Client ID** from Google Cloud Console.
   - Paste your **Client Secret** from Google Cloud Console.
   - Click **Save**.
4. In **Authentication** → **URL Configuration**:
   - **Site URL**: `https://serbisyogo.sg-team.workers.dev`
   - **Redirect URLs**: Ensure the following are listed:
     - `https://serbisyogo.sg-team.workers.dev/auth/callback/`
     - `http://localhost:3000/auth/callback/` (for local development)
     - `serbisyogo://sign-in` (required for the installed Android app)
   - Click **Save**.

---

## 3. How It Works in SerbisyoGo

1. **One-Click Sign Up / Sign In**:
   - On the web `/register/` or `/login/` screen, users can click **"Sign up with Google (Gmail)"** or **"Continue with Google (Gmail)"**.
   - Google opens a prompt for the user to choose their Google/Gmail account.
   - Upon authorization, Google securely returns the user to SerbisyoGo's `/auth/callback/`.
2. **Automatic Account Provisioning**:
   - The PostgreSQL database trigger `public.new_user()` runs automatically.
   - It extracts the user's Google display name (`full_name` / `name`) and populates `public.profiles`.
   - It automatically grants the `customer` role in `public.role_assignments`.
   - Since Google accounts already have verified emails, the user does not need email verification links and is immediately taken to their `/dashboard/`.
3. **Standard Email & Password Registration**:
   - Users can still create accounts with any standard email (including `@gmail.com`) using a strong password.

---

## 4. Verification & Testing

### Installed mobile app

The mobile app and website share accounts, but use separate return addresses.
Keep the existing website Site URL and redirect URLs. Add `serbisyogo://sign-in`
to **Authentication → URL Configuration → Redirect URLs** in the hosted Supabase
project. Updating `supabase/config.toml` only configures local Supabase; it does
not change the hosted project's settings.

The installed app starts Google OAuth and opens the system browser.
After account selection, Supabase returns to `serbisyogo://sign-in`.
The app receives both initial links and links while running, completes the
returned session, verifies the account, and continues inside the app. Google Cloud's
authorized redirect URI remains the Supabase `/auth/v1/callback` address above.

Install a newly built APK containing these changes. Test both **Continue with
Gmail** and Google registration, including returning while the app is running,
returning after Android closes the app, cancellation, and retrying. Verify that
the app displays the signed-in account and the browser does not land on the
website dashboard. A browser preview cannot verify Android return behavior.

- Run tests:
  ```bash
  npm test
  npm run typecheck
  npm run lint
  ```
- Test on localhost or Cloudflare deployment:
  - Visit `/login/` or `/register/`.
  - Click **Continue with Google (Gmail)**.
  - Sign in with a Google account.
  - Verify redirection to `/dashboard/`.
