# SERBISYOGO website

A Next.js App Router / TypeScript / Tailwind website with a customer experience, provider workspace and protected administration. Supabase Postgres, Auth, private Storage and Realtime are shared with the later Android client. **No Android app or APK has been fabricated.**

## Current validation status

The implementation is reviewable source, **not a verified production deployment**. Fifteen Node tests, TypeScript, full ESLint and the static production build pass locally, including the `/SerbisyoGo` Pages path. Browser UI checks passed across six viewport widths using controlled backend responses. Live database/RLS, authenticated workflow, Edge and real-APK integration checks remain unverified. See the [responsive review](docs/responsive-review.md) and [validation report](docs/validation.md).

## Hosting: GitHub and Supabase

The UI exports static files and needs no Next.js server. Every trusted mutation runs in Supabase functions. Record identifiers use query parameters (for example `/providers/profile/?id=...`) so future records work on static hosts without rewrites.

**GitHub Pages is configured as an unconfigured, fictional preview only.** GitHub's [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) prohibit operating an online business on Pages and advise against sensitive transactions such as password submission. A real service launch needs a compatible static web host in addition to GitHub and Supabase, or another explicitly reviewed hosting arrangement. The Pages workflow intentionally does not inject Supabase credentials. See [deployment instructions](docs/deployment.md). No public deployment or production database change was made.

## Local installation

Requirements: Node 22.19+, npm, Docker Desktop for local Supabase, and an environment that allows npm registry access.

```sh
npm install
```

Copy `.env.example` to `.env.local`. Keep `.env.local` and `.cache/` private. No secrets belong in `NEXT_PUBLIC_*` variables. Commit `package-lock.json` with dependency changes; subsequent environments should use `npm ci`. Extracted source archives under `handoff/` are excluded from application checks and must not be uploaded as a second application.

```sh
npm run db:start
npm run db:reset
npx supabase status
```

Copy the local API URL, publishable/anon key and server-only service/secret key into their corresponding local variables. Do not print or commit them. Start the two Edge Functions in a second terminal:

```sh
npx supabase functions serve --env-file supabase/functions/.env.local
```

Create that ignored environment file with:

```dotenv
ALLOWED_ORIGINS=http://localhost:3000
APK_MAX_BYTES=52428800
```

Local Supabase supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` to its Edge runtime. In production Supabase supplies the project equivalents; `SUPABASE_SECRET_KEY` in the website's local environment is used only by owner-controlled seed/provisioning scripts.

```sh
npm run db:types
npm run dev
```

Open `http://localhost:3000`. The currently committed `database.types.ts` is an explicitly marked **offline migration-derived snapshot**. `db:types` replaces it with official CLI introspection of the running local schema. The SQL migrations are the authoritative contract.

## Authentication

Enable email/password login and email confirmation. Set the Supabase Site URL to the full deployed website URL and allow the exact `/auth/callback/` URL under it. Keep local and production redirect allowlists separate. Email verification and recovery are real Supabase flows; no SMS integration is assumed.

Default Supabase confirmation links work with PKCE in the initiating browser. The callback also accepts configured `token_hash` links for `signup`, `email` and `recovery`. A custom recovery email URL should include `next=/reset-password/`. Configure an actual SMTP sender and delivery/rate limits before accepting public registrations.

The static browser uses Supabase's official browser client. SSR cookies and `@supabase/ssr` are not used because the chosen export has no application server. UI session information is not an authorization boundary: RLS and trusted functions independently check database roles and active account status.

## Initial administrator

Create an account through registration, verify its email, and then run this owner-controlled script with a server-only key:

```sh
npm run admin:provision -- your-email@example.com --confirm your-email@example.com
```

The script provisions an existing verified user and records the action. There is no public admin password, metadata-based role assignment, or admin signup form. Remove local elevated credentials when setup is complete. Admin access starts at `/admin/login/`.

## Local fictional demo data

`supabase/seed.sql` initializes only the service catalog. Production initialization does not invent fees, commission policy, users or releases.

```sh
npm run seed:demo
```

The separate script refuses non-local hosts. It creates two customers, two approved fictional providers, one pending application and one administrator, with bookings, messages, a completed invoice, a manual settlement, support threads and private notes. Example pricing is a configurable ₱50 booking fee and 10% commission for **local development only**. Random account credentials are saved to ignored `.cache/demo-users.json`, never bundled into the website. No real identities or government documents are seeded.

Without backend credentials the public catalog uses clearly labeled fictional previews. Private actions show a setup state and do not save to localStorage. `/preview/` provides a screen directory and sample workspace records. Supabase Auth's own token persistence is separate from business-data storage.

## Hosted development sample data

For an explicitly designated **development project only**, `npm run seed:development -- --development-project YOUR_PROJECT_REF` creates 5 customers, 5 approved providers, 5 pending applications and a private development administrator, plus 6 categories, 10 services, 35 bookings (5 per status), 35 conversations, 70 messages, 5 invoices/reviews/payout requests/refund requests/support cases/announcements and related availability, addresses, notifications and audit entries. All identities, reviews, settlements and prices are fictional. No APK, private verification document, live GPS, charge or bank transfer is invented.

Set the server-only `SUPABASE_SECRET_KEY` privately in ignored `.env.local` before running. This must be a secret/service-role key, never the publishable key. Keep it out of GitHub, chat, screenshots and all `NEXT_PUBLIC_*` variables. The script checks the exact hosted project reference and creates records through the owner-controlled API. Existing real records are not deleted. Existing active pricing is retained; if none exists, development-only settings use a PHP 50 fee and 10% commission. These values are examples, not approved business policy.

Random sample login credentials are saved only in ignored `.cache/development-users.json`, including after each account creation. Keep that file private. Fictional `.test` email addresses cannot receive messages; these fixture accounts are confirmed through the admin API for development login only. Existing non-fixture accounts are never reused, and a rerun inserts missing fixture records while preserving edits and append-only history. It is not a single transaction: on error, fix the reported issue and rerun to resume. Do not delete sample Auth users individually because related history is retained. Prefer a fresh disposable development project when starting over.

Preview counts without connecting: `npm run seed:development -- --plan`. The hosted seed has not been executed or integration-validated by the agent without credentials. Remove the local secret key after seeding. The deployed GitHub Pages preview remains disconnected from this database.

## Main routes

All 20 prototype views and 12 admin views are mapped in [routes.json](docs/routes.json) and `/preview/`. Supporting routes include account recovery, auth callbacks, provider onboarding/profile/services, availability, notifications and booking details. Related links preserve record IDs through query parameters.

## Booking and payment rules

- Only an active customer can submit their own saved draft. A draft UUID is the booking idempotency key. The server recomputes pricing and rejects a changed total until it has been reviewed.
- New requests await the assigned approved provider. Only the provider accepts, starts travel, starts work and completes the job. Customers can cancel requested/confirmed bookings with a reason. Admin cancellation is controlled and audited.
- A provider row lock, availability rechecks and a Postgres exclusion constraint prevent overlapping accepted jobs. Adjacent appointments are allowed. Scheduling is displayed in `Asia/Manila`; timestamps persist as UTC instants.
- Money is integer centavos. Commission uses basis points and deterministic integer rounding. Rates/fees/commission are snapshotted into bookings; invoices issue on completion. Quotation-based work requires explicit customer acceptance before provider confirmation.
- Only cash/manual settlements are supported. There is no mock GCash, Maya, card, escrow, bank transfer or gateway-success page. Admins must independently verify receipts and record a reference. No card data is collected.
- Payout requests use platform-held balances only; cash jobs create a receivable. Approval does not move money. Refund review does not return money. Actual external transfers/refunds require a separate recorded verification step. Ledger amounts and invoices are retained; refunds add a reversal marker and payment event.

## Maps and tracking

Leaflet uses configurable light tiles with attribution. The default is OpenStreetMap's standard layer. Configure a tile service appropriate for production traffic and its usage policy. No Google Maps key is assumed.

Discovery shows a service-area map, not invented provider GPS positions. A professional can explicitly share their current coordinate during an assigned active job. Only booking participants/admins can read it. Coordinates older than 15 minutes are not presented as a current position; closing the job removes them. No fabricated routes or arrival estimates are generated.

## Files, realtime and administration

All three buckets are private. The `files` Edge Function validates size, MIME, extension, file signatures, identity and resource ownership before creating an immutable generated path. It supplies 60-second signed URLs after access checks. Approved provider avatars have an explicitly checked public serving endpoint. The browser cannot directly upload, replace or delete storage objects.

Postgres Changes subscriptions rely on source-table RLS. Messages, notifications and bookings refresh through Realtime and a 30-second/focus fallback. Subscriptions are removed on navigation and sign-out. No public broadcast/presence channel carries private coordinates or conversations.

Admin reads require the protected role through RLS; all mutations go through explicitly authorized functions. Account restrictions retain reason history. Provider profile changes wait for review. Internal case notes and customer-visible replies use separate tables. Important admin mutations write an append-only audit trail that excludes private file contents, passwords and keys. Admin tables support search, sorting, pagination, filtering and CSV export. Date scopes/metric definitions are shown alongside reports.

## Android APK releases

Use `/admin/settings/` to upload an **actual developer-supplied APK** and matching metadata. The Edge Function checks the ZIP entries, parses Android binary manifest version/minimum SDK, computes SHA-256, uploads to a versioned private path, reads it back, and verifies the stored bytes. Version name/code and minimum Android version must match the manifest. Draft notes can be edited; artifacts are not overwritten.

Publication locks the release flow and checks verification and stored-object size transactionally. Downloads accept published releases only and return fresh short-lived URLs. Empty, incomplete or archived releases are never offered as valid public APKs. The public page shows the actual version, compatibility, size, publication date, release notes, checksum and a QR code generated from `NEXT_PUBLIC_SITE_URL`. It shows **coming soon** until a release exists.

The maximum configured upload is 50 MB and may be reduced by project or Edge limits. This task does not develop the Android client. APK certificate/signature verification with the Android SDK's `apksigner` and a known expected certificate belongs in the future Android release pipeline; manifest/checksum validation is not a claim of code safety or certificate verification.

## Checks

```sh
npm test
npm run typecheck
npm run lint
npm run build
npm run test:db
npx playwright install chromium
npm run test:e2e
```

Domain tests use Node's TypeScript stripping and run without installed dependencies. Database tests require local Supabase/Postgres and roll back all fixtures. Browser integration tests require local `TEST_SUPABASE_*` variables, running Edge Functions, and `.cache/demo-users.json`; they intentionally skip without that setup. Registration verification also needs a local Inbucket inbox API. The valid-release test requires `TEST_APK_PATH` pointing to an actual test APK and runs only against loopback Supabase. Use a fresh reset/seed for each full integration run. Tests cover two customers and two providers, direct backend denial, quote/transition rules, schedule conflicts, invoice/review eligibility, private notes/files, payment idempotency and APK draft restrictions. See [validation.md](docs/validation.md) for the checks actually executed here.

## Design sources and handoff

The main [SERBISYOGO Figma file](https://www.figma.com/design/h3Lkpwb6xxLVgn8jzuP0js/SERBISYOGO?node-id=0-1) supplied the dark workspace structure, 216px sidebar, 72px header, Plus Jakarta Sans, tokens and card/forms proportions. The original 34px logo and technician image were recovered as exact rendered assets from that file in `public/brand/`. No substitute logo was invented. The secondary file was access-restricted, and final browser comparison was blocked; no pixel-perfect claim is made. No pitch deck existed in the empty repository. Neither Figma file was modified.

See [Android shared-backend contract](docs/android-backend.md), [security notes](docs/security.md), [deployment](docs/deployment.md), and [validation results](docs/validation.md). Final operator-approved terms/privacy wording, business pricing policy, SMTP sender, real payment/payout integrations if desired, production tile configuration, actual Supabase credentials and the future APK remain setup inputs.

To apply the owner's supplied display names to existing development accounts without reseeding, run `npm run seed:development -- --development-project YOUR_PROJECT_REF --rename-names`. It renames only the five approved fixture providers and fixture administrator, verifies protected development metadata first, and preserves their IDs, login credentials, roles and related history. Customer and pending-provider sample names remain unchanged. Restart the session or sign out/in if an old display name remains cached.

Use `--natural-profiles` instead of `--rename-names` to also replace development wording in the five approved providers' headlines, bios and seeded service titles. It preserves prices, historical booking snapshots and fixture metadata. Development disclosure remains in the seed documentation and seeded announcement.
