# Deployment handoff

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
npx supabase secrets set ALLOWED_ORIGINS=https://your-domain.example APK_MAX_BYTES=52428800
```

Both functions use `verify_jwt=false` because their public download/avatar GETs must work without a user session and new publishable keys are not JWTs. **Every protected branch independently validates the access token with Supabase Auth and checks database role/ownership before elevated access.** Do not remove those checks.

Configure Auth Site URL, exact callback redirects, email confirmation and SMTP. Verify the private buckets, configured limits, publication/RLS and source-table Realtime settings after migrations. Create/verify the initial administrator and provision its protected role using the documented script. Set explicit fee/commission settings in the admin UI before accepting bookings.

## Release gates

Before a real launch, resolve the outstanding checks in `validation.md`, regenerate introspected types, commit a resolved package lock, and review applicable service terms and privacy notices. Configure sender reputation/rate limits, production map quotas, backups, monitoring and log retention. Run the two-customer/two-provider negative-access tests against staging. Supply an APK only after Android development and signing are complete; this task has not created one.

No source or database workflow automatically deploys a production Supabase project. The backend-check workflow starts an isolated local backend on a GitHub runner and tests it without production credentials.

## Embedded Bunawan satellite map

The owner-supplied Bunawan satellite embed is the default and works without another repository variable. To replace it, in Google Maps select Bunawan and Satellite, then Share or embed map ? Embed a map ? Copy HTML. Set `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_URL` to the iframe's `src` URL, not the full HTML or a short sharing link. Only HTTPS `www.google.com/maps/embed` URLs with Google's `pb` parameter are accepted. Preview the supplied embed to confirm satellite imagery and Bunawan before release. Add the same public variable under GitHub repository Settings ? Secrets and variables ? Actions ? Variables, then rerun the Pages preview workflow. Restart local development after editing `.env.local`. An invalid override disables Satellite; Street continues to work. The satellite iframe stays inside the page and uses the supplied public town view, without transmitting private provider coordinates. It is recorded imagery, not live tracking. Allow `https://www.google.com` in your operational host's CSP `frame-src` policy.
