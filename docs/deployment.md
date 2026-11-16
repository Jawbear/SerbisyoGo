# Deployment handoff

## Current deployment preparation

`npm run deploy:guide` and `npm run email:guide` print instructions without
changing hosted settings or sending email. After building with the intended
public environment, run `npm run deploy:check` to check local configuration,
email placeholders and required export files. This does not inspect the hosted
database, validate SMTP delivery, or establish production readiness.

The Cloudflare workflow validates pushes to `main` and uploads a
`cloudflare-website` artifact. Publication requires a manual workflow run with
`publish` enabled. Set repository `NEXT_PUBLIC_*` variables for the intended
website and Supabase project, plus `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID` secrets. Use an empty base path for the configured Worker.
Supabase secrets remain outside the browser build. This workflow does not apply
migrations or deploy Edge Functions.

`public/_headers` supplies static response headers for Cloudflare Workers assets;
Next.js `headers()` does not apply to static exports. Geolocation remains allowed
on the same origin. See [Cloudflare static asset headers](https://developers.cloudflare.com/workers/static-assets/headers/).

The templates in `supabase/templates/` must be copied into the intended project's
Auth template settings. Configure a verified sender through
[Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp), then test
actual delivery and callback/recovery links. Printing a guide or validating a
template does not configure the service. See the
[Google SMTP runbook](google-smtp.md) for Workspace/Gmail settings, limits and
troubleshooting; `npm run email:test -- you@example.com` requests one real recovery
message through the configured project.

Run [physical-device acceptance checks](physical-device-testing.md) and the
[manual GCash rollout checks](alpha-beta-gcash.md) before accepting the build.
The [policy approval gate](policy-approval.md) keeps `/terms/`, `/privacy/` and
`/pricing/` marked as drafts until the operator completes
`src/lib/policy-approval.ts`; the production preflight fails while the record is
still a draft.

## One-command Cloudflare deployment

For a local deployment instead of the GitHub workflow:

```powershell
Copy-Item .env.production.example .env.production.local
# fill in the public Supabase URL/key and the real Worker URL
npx.cmd wrangler login
npm.cmd run deploy:cloudflare -- --confirm
```

The script loads `.env.production.local`, builds with the production public
environment, runs the existing preflight (including the approved-policy gate), and
then runs `wrangler deploy --config wrangler.jsonc`. Add `--dry-run` to validate the
build and Worker bundle without publishing. In CI, the same steps use repository
`NEXT_PUBLIC_*` variables and the `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID`
secrets. Never put `SUPABASE_SECRET_KEY` or the Google App Password in either place.

## GitHub Pages preview

1. Push this repository to a GitHub repository whose default branch is `main`.
2. In Settings → Pages, choose GitHub Actions as the source.
3. Set repository variables `NEXT_PUBLIC_SITE_URL` to the **full preview URL** and `NEXT_PUBLIC_BASE_PATH` to `/repository-name`. For an owner site or custom domain, use an empty base path.
4. On upload/push, `pages.yml` installs, tests, typechecks, lints, exports `out/`, and prepares the preview artifact. It does not publish a website automatically. To publish later, explicitly use Actions → the Pages workflow → Run workflow and enable `publish_preview`.
5. The workflow **forces the Supabase URL and key empty**. It serves fictional public previews and gated private screens without live account operations. Do not use it as an operational marketplace.

GitHub documents that [Pages is not intended or allowed for operating an online business](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits). The original GitHub-and-Supabase-only request is therefore supported as a source/backend arrangement and a non-operational Pages preview, not as an approved commercial production-hosting arrangement.

## Real website host

The current application is a static export and can run on a compatible static host, including one connected to your GitHub repository. The host must permit commercial applications and authenticated browser traffic. No Next.js server or paid Vercel dependency is required by this code. Set public build variables, run `npm run build`, and serve `out/` with directory-index routing and HTTPS.

Use an empty `NEXT_PUBLIC_BASE_PATH` for a normal custom domain. Set `NEXT_PUBLIC_SITE_URL=https://your-domain.example` (or include the full subdirectory when using one). The QR, auth redirects and release page use that exact canonical URL.

Only these variables belong in the browser build:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_BASE_PATH`
- Optional public map tile/attribution variables

Never supply a service-role/secret key to the web build. Static export means server-side Next headers do not apply; configure `X-Content-Type-Options: nosniff`, an appropriate CSP, frame restrictions, `Referrer-Policy`, and `Permissions-Policy` at the actual host. Review CSP against your chosen Supabase and map origins.

## Cloudflare Worker with static assets

The account subdomain was changed from the owner's personal name to `sg-team`. The intended canonical address is now `https://serbisyogo.sg-team.workers.dev`. Set Cloudflare's **build** variable `NEXT_PUBLIC_SITE_URL` to that address and rebuild; the local `.env.local` should continue using `http://localhost:3000` for development. In Supabase Auth set the Site URL to the new address and allow `https://serbisyogo.sg-team.workers.dev/auth/callback/`; remove the old personal-domain callback while retaining the localhost callback if still used. Update Edge Function CORS from the owner terminal:

```sh
npx supabase secrets set --project-ref qkopbbxmeqqzomrawltf ALLOWED_ORIGINS=http://localhost:3000,https://serbisyogo.sg-team.workers.dev
```

Check login, email verification/recovery, QR download-page links and photo uploads on the new hostname. This changes frontend origins, not Supabase user IDs or stored data. The agent has not independently verified the live hostname or changed dashboard settings.

If the Cloudflare Git import created a **Worker** instead of Pages, keep it: the tracked `wrangler.jsonc` deploys the Next.js static export directly, without a Worker script or Next.js server. Keep build command `npm run build`, deploy command `npx wrangler deploy --config wrangler.jsonc`, project name `serbisyogo`, and root `/`. The assets directory is `out`; directory indexes preserve trailing-slash routes and unknown routes serve the exported 404 page.

In Cloudflare's **Settings → Build → Build variables and secrets**, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` using the public values from your local environment. Set `NEXT_PUBLIC_SITE_URL` to the actual HTTPS Worker/custom-domain URL when it is assigned, and rebuild after changing these variables. Remove `NEXT_PUBLIC_BASE_PATH` for deployment at the domain root; do not copy `/SerbisyoGo` from the GitHub preview. Runtime-only Worker variables do not configure a previously compiled browser bundle. Never copy `SUPABASE_SECRET_KEY`, service-role keys, test credentials, or `.env.local` into the build/deployment configuration.

After deployment, configure Supabase's Site URL and exact `/auth/callback/` redirect for that actual host, update Edge `ALLOWED_ORIGINS` with the host's origin, and deploy the updated `files` function for private avatar access. Keep `http://localhost:3000` in the allowlist only while needed for development. Do not treat successful asset deployment as successful authentication/storage integration testing. Wrangler deployment was not executed from this restricted environment.

Official reference: https://developers.cloudflare.com/workers/static-assets/

## Supabase project

Do this first in a disposable local project, then a staging project. No commands were run against a remote project in this task.

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REFERENCE
npx supabase db push --dry-run
```

Review the migration plan. An explicitly authorized operator can then run `supabase db push`, deploy `files` and `releases`, and set Edge Function secrets. Do not reset a remote project or apply the fictional demo seed to production.

```sh
npx supabase functions deploy files
npx supabase functions deploy releases
npx supabase secrets set ALLOWED_ORIGINS=https://your-domain.example APK_MAX_BYTES=67108864
```

Both functions use `verify_jwt=false` because their public download/avatar GETs must work without a user session and new publishable keys are not JWTs. **Every protected branch independently validates the access token with Supabase Auth and checks database role/ownership before elevated access.** Do not remove those checks.

The APK bucket and global project Storage limit must both permit 64 MiB. Hosted plan limits may prevent that setting; check the actual project before rollout. The admin uploader creates an unverified draft, then sends the binary APK to `releases?id=...`; the function checks its manifest and stored SHA-256 before allowing publication. Large APKs must use this binary path; legacy multipart uploads are limited to 16 MiB. If an internal gateway/proxy is used, set `PUBLIC_SUPABASE_URL` to the browser-accessible Supabase API root. Otherwise it defaults to `SUPABASE_URL`. Signed Storage URLs retain their path and token; server-side read-back still uses the internal service address.

Configure Auth Site URL, exact callback redirects, email confirmation and SMTP. Verify the private buckets, configured limits, publication/RLS and source-table Realtime settings after migrations. Create/verify the initial administrator and provision its protected role using the documented script. Set explicit fee/commission settings in the admin UI before accepting bookings.

## Production SMTP & email delivery

SerbisyoGo uses Supabase Auth for email verification, password recovery and email change. Production requires a real SMTP provider.

### Quick setup

```sh
node scripts/configure-smtp.mjs
```

This prints a full step-by-step guide. The short version:

1. **Choose an SMTP provider** — Resend (recommended), Brevo or SendGrid all have free tiers sufficient for alpha/beta.
2. **Configure domain DNS** — Add SPF, DKIM and DMARC records for your sender domain.
3. **Enable Custom SMTP in Supabase** — Dashboard → Authentication → Email Templates → SMTP Settings.
4. **Deploy branded email templates** — Copy the HTML from `supabase/templates/` into the Supabase Dashboard:
   - `confirmation.html` — Subject: "Verify your SerbisyoGo account"
   - `recovery.html` — Subject: "Reset your SerbisyoGo password"
   - `email_change.html` — Subject: "Confirm your email change — SerbisyoGo"
5. **Set Auth redirect URLs** — Allow `https://serbisyogo.sg-team.workers.dev/auth/callback/`. Remove localhost for production.
6. **Test** — Register a test account, verify the email arrives, click the link, test password recovery.

Templates use the SerbisyoGo forest/ivory/sage/gold palette with bilingual English/Filipino messaging.

### Cloudflare CI/CD

The `.github/workflows/cloudflare-deploy.yml` workflow automatically deploys to Cloudflare Workers on every push to `main`:

1. Installs dependencies, runs tests/lint/typecheck
2. Builds the static export with `NEXT_PUBLIC_*` variables from repository variables
3. Deploys to Cloudflare Workers using `wrangler deploy`

**Required repository secrets** (Settings → Secrets and variables → Actions → Secrets):
- `CLOUDFLARE_API_TOKEN` — Create at Cloudflare Dashboard → My Profile → API Tokens → Create Token → Edit Cloudflare Workers
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare Dashboard → Workers & Pages → Account ID (right sidebar)

**Required repository variables** (Settings → Secrets and variables → Actions → Variables):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL` = `https://serbisyogo.sg-team.workers.dev`

### Full production checklist

```sh
node scripts/production-deploy.mjs
```

Prints 35 items across 7 phases: pre-deployment, Supabase setup, SMTP/Auth, Cloudflare deployment, security hardening, post-deployment smoke tests and monitoring.

## Release gates

Before a real launch, resolve the outstanding checks in `validation.md`, regenerate introspected types, commit a resolved package lock, and review the operator-approved terms/privacy/pricing policies at `/terms/`, `/privacy/` and `/pricing/`. Configure sender reputation/rate limits, production map quotas, backups, monitoring and log retention. Run the two-customer/two-provider negative-access tests against staging. Supply an APK only after Android development and signing are complete; this task has not created one.

No source or database workflow automatically deploys a production Supabase project. The backend-check workflow starts an isolated local backend on a GitHub runner and tests it without production credentials.

## Embedded Bunawan satellite map

The owner-supplied Bunawan satellite embed is the default and works without another repository variable. To replace it, in Google Maps select Bunawan and Satellite, then Share or embed map ? Embed a map ? Copy HTML. Set `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_URL` to the iframe's `src` URL, not the full HTML or a short sharing link. Only HTTPS `www.google.com/maps/embed` URLs with Google's `pb` parameter are accepted. Preview the supplied embed to confirm satellite imagery and Bunawan before release. Add the same public variable under GitHub repository Settings ? Secrets and variables ? Actions ? Variables, then rerun the Pages preview workflow. Restart local development after editing `.env.local`. An invalid override disables Satellite; Street continues to work. The satellite iframe stays inside the page and uses the supplied public town view, without transmitting private provider coordinates. It is recorded imagery, not live tracking. Allow `https://www.google.com` in your operational host's CSP `frame-src` policy.
