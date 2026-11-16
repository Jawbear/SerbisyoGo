# Validation report

The [17 November update rollout](release-2026-11-17.md) records the subsequent
main-branch push, hosted migrations/Edge Functions and Android publication status.

17 November continuation: [staging validation](staging-validation-2026-11-17.md)
records the current isolated Supabase, APK and mobile CI evidence. It supersedes
the older environment limitations below. Production rollout and physical-phone
checks remain separate.

12 November cover-photo follow-up: supplied cabinet, plumbing, appliance, air-conditioning and carpentry photos now appear on the website and mobile Home/service browsing screens. Optimized JPEGs total 406,997 bytes per platform; the mobile copies are bundled for offline display. The existing dark green palette remains. TypeScript, website/mobile lint, three focused mobile browser navigation/update checks, the 320px website category layout check and live website photo-loading/overflow checks at 390px and 1440px passed. Website and native Android Home screenshots were reviewed; the signed 0.3.1 APK passed startup, discovery and hardware Back checks on the dedicated Android 15 emulator. The actual released 0.3.0 to 0.3.1 in-app upgrade also passed, including Android confirmation and retained private data. The automation initially tapped an offscreen control; corrected scrolling allowed the same downloaded APK to complete installation. Physical-phone testing remains pending.

The [11 November functionality audit](functionality-audit.md) is the latest validation record. It includes actual read-only development-backend checks, customer/provider/admin browser reads, and fixes for sign-in return navigation and protected-page hydration. The older results and environment limitations below are retained as validation history; refer to the new audit for current scope and remaining gaps.

## Executed here

Visitor-layout follow-up: anonymous visitors now have discovery navigation, signed-in users retain workspace navigation, categories precede featured providers, and phone category tiles use a compact two-column layout. Supporting text was enlarged. TypeScript, full lint, 16 Node tests and the static export pass. Desktop/mobile screenshots were reviewed. Browser checks cover 320–1920px and the 700/1100/1101/1280px navigation boundaries, using controlled backend responses. Overlapping test runs caused one trace-output filesystem failure; affected mobile cases were rerun sequentially in a separate output directory. This is UI verification, not a new hosted backend certification.

Latest profile-photo/theme follow-up: 20 desktop public/responsive/photo UI cases passed with intercepted backend responses, followed by all 6 customer/provider/admin photo cases passing in desktop and touch emulation. Photo previews, replacement, unsupported-type rejection and account widths of 320/375/768/1440px were checked. Fifteen Node tests, TypeScript, full lint and an isolated static build also passed. Real Storage authorization tests were added to the local-only workflow suite but remain unrun; deploy the updated `files` Edge Function before hosted testing.

The forest/ivory/sage/gold palette and serif/sans typography were visually inspected on desktop/mobile screenshots. Contrast checks passed for body text (14.65:1), secondary text (8.51:1), primary button text (8.95:1), gold text (7.65:1), and input borders (3.53:1), against their designated surfaces. These checks cover the specified pairs, not a full WCAG audit.

| Check | Result | Scope |
| --- | --- | --- |
| `npm test` | **16 passed, 0 failed** | Domain rules, development-target safeguards, stable fixture identity, safe credential-update plans, request timeout/cancellation |
| Public/responsive browser checks | **34 distinct cases passed across full run and targeted reruns** | Installed Chrome desktop and touch emulation; 320–1920px, intercepted backend responses. See responsive-review.md for exact scope and corrected failures |
| Dependency installation / lock generation | **Completed by the user** | Installed dependencies are now available locally; resolved `package-lock.json` generated |
| `npm run typecheck` | **Passed** | Current application and tests; extracted archives/generated artifacts excluded, Edge Functions checked separately |
| `npm run lint` | **Passed, 0 errors and 0 warnings** | Full project ESLint configuration |
| `npm run build` | **Passed** | Static export with `/SerbisyoGo` base path and no backend credentials; all routes generated |
| Offline Babel TypeScript/TSX syntax pass | **Passed** | All application, test, script and Edge source files parsed; this is syntax validation, not typechecking or bundling |
| Offline React rules using an existing installed toolchain | **0 errors** | React hook/compiler rules after stripping TS syntax; this does not substitute for the project's full ESLint configuration |
| Static route inventory | **44 route entrypoints present** | Includes all 20 customer/provider prototype views, all 12 admin views and supporting routes |
| Local module import/export audit | **219 references verified** | Source paths and named exports exist; external dependency types remain unverified |
| Figma inspection | **Main file accessible** | Shared design contexts and frame structures inspected, logo and hero asset recovered; secondary file access denied |

The first domain run found a trailing-slash mismatch in the safe redirect fallback; it was corrected. Full checks later identified nullable callback data, synchronous query loading state updates, and lint issues; these were corrected. TypeScript also included an old extracted source copy under `handoff/`; generated and archive directories are now explicitly excluded. The static build warns that Next.js response headers do not apply to exported files; configure headers on the operational host as described in deployment.md. A warning about a lockfile outside the repository is specific to this local machine.

## Attempted but could not run

| Check | Blocking evidence | Status |
| --- | --- | --- |
| `npm run test:db` | Supabase CLI, Docker and Postgres not installed/configured here | **Unrun** |
| Official database type introspection | No running local Supabase | **Unrun**; migration-derived snapshot committed and clearly labeled |
| Edge Function type/runtime and RLS/storage integration checks | No local backend, runtime or project credentials | **Unrun** |
| Authenticated backend workflow browser suite | No isolated local Supabase/test environment; public UI browser tests now run in installed Chrome | **Unrun** for real backend workflows |
| Hosted development read-only smoke check | `npm run check:development -- --development-project qkopbbxmeqqzomrawltf` stopped with `fetch failed` | **Blocked by network**, not passed |
| In-app desktop/mobile visual check | Browser connection failed before navigation because the environment's sandbox metadata was unavailable | **Unrun** |
| Real APK verification/publication/download | No APK supplied; no local backend | **Unrun**; no fake package or release created |

## Included suites for a configured environment

`supabase/tests/security.test.sql` runs in a rollback transaction. It covers two customers/two providers, role-metadata escalation, protected function calls, profile restrictions, unrelated bookings/conversations/cases/documents, idempotent confirmations/messages/payment events, server prices and changed-price refusal, schedule conflicts, transitions, location authorization/cleanup, quotation ownership/acceptance, invoice/review eligibility, cash-held balance handling, append-only admin audit and incomplete/draft APK permissions.

Playwright public tests cover navigation, unauthenticated admin/private denial, the no-release state, table search and desktop/mobile document overflow. Local integration tests cover account persistence, customer scheduling through completion/invoice/review, member messaging and outsider denial, complaints with separate private notes, admin category/announcement changes and audit, direct non-admin RPC denial, private file signing and draft APK denial. Registration verification requires the configured local test inbox. Valid-release testing requires an actual developer-supplied test APK and is explicitly skipped without it. No integration test is represented as passed here.

## Concrete remaining inputs and gates

1. Commit the resolved lockfile and validated build fixes, then confirm GitHub Actions succeeds on that commit. Local build, full lint, TypeScript and domain checks have passed; remote execution is not represented as verified here.
2. Start an isolated Supabase project, apply every migration, run SQL/Edge tests and regenerate introspected types. Configure actual production/staging URL/publishable key only on a compatible operational web host, never the supplied Pages preview.
3. Configure exact Auth redirects, SMTP sender and delivery/rate settings, Edge `ALLOWED_ORIGINS`, explicit fee/commission policy, verified initial admin and production map service.
4. Supply final operator-approved terms/privacy wording and support contact. Policy pages currently disclose implemented behavior and missing approval, rather than inventing business terms.
5. Supply the actual signed APK after later Android development. Validate its certificate using the Android release pipeline; no signing key or Android app is part of this task.
6. Add and test actual gateway/payout integrations only if desired. Current behavior is cash/manual recordkeeping, without online charges, escrow, automatic refunds or transfers.
7. Run the browser workflows and visual review on desktop/mobile, then fix any overflow, alignment, dependency or integration findings. Pixel-perfect fidelity and production readiness have not been established.

The user requested no public deployment or production database changes. Neither occurred. GitHub Pages is prepared for a fictional unconfigured preview; its commercial/sensitive-transaction restrictions are documented in deployment.md.
## Deployment preparation verification — 2026-11-15

The continuation prepared local deployment tooling; no website, hosted database,
SMTP settings or APK was published or changed.

- Website Node tests: 20 passed. Mobile Node tests: 14 passed.
- Website TypeScript check and both website/mobile linters passed.
- Website production static export passed using the intended public site URL
  supplied to the build process. Local `.env.local` was left unchanged.
- `deploy:check` passed with that HTTPS site URL and the existing public Supabase
  configuration. The default localhost site URL was correctly rejected.
- Exported `_headers` contains the security headers and preserves both Android
  update-feed CORS/no-store rules. This is file verification, not hosted HTTP QA.
- All four email templates retain the Supabase confirmation link placeholder.
  Support links use the configured Site URL; fixed expiry claims were removed.
- `git diff --check` passed.
- Database tests could not connect to local PostgreSQL at `127.0.0.1:54322`.
  Docker is not available on PATH. SQL runtime/RLS tests remain unverified here.

Cloudflare workflow changes have not been executed remotely. SMTP delivery,
physical-device behavior, hosted migration rollout and real GCash settlement
remain pending. See `physical-device-testing.md` and `alpha-beta-gcash.md`.

## Policy, Google SMTP and deployment gate — 2026-11-15

This continuation added the operator policy approval record, public pricing page,
Google SMTP runbook/delivery check and an explicit Cloudflare deploy command. No
hosted setting, SMTP credential, policy approval or deployment was changed.

- Website typecheck, full lint, 20 Node tests, 15 mobile Node tests and the static
  export passed. The export contains 45 documented route entrypoints, including
  /pricing/.
- /terms/, /privacy/ and /pricing/ render the structured policy text with a
  visible DRAFT banner and `noindex, nofollow` while the approval record is a draft.
  The pricing text renders the configured ₱50 fee and 10% commission rather than
  separate hard-coded values.
- `npm run policy:check:hosted` matched the active development settings
  (fee 5000 centavos, commission 1000 bps). The hosted support address is still
  `support@example.test` and must be replaced before approval.
- `npm run deploy:check` passed configuration, worker, header, template and export
  checks and correctly failed the approved-policy gate while the record is a draft.
- `npm run email:guide` passed all four template checks. No real recovery email or
  Google SMTP delivery was attempted; SMTP credentials and the Supabase dashboard
  change remain operator steps.
- The live Worker at `https://serbisyogo.sg-team.workers.dev` responds, but its
  rendered homepage is older than the current source. It was not redeployed.
- Physical-phone testing remains pending. The acceptance document now includes a
  laptop-browser and Android-emulator substitute with a test-record template.
# Account identity and administrator navigation continuation — 2026-11-17

The subsequent broader audit is recorded in
[full-project-audit-2026-11-17.md](full-project-audit-2026-11-17.md), including
current fixes, measured bundle reduction, browser reruns, public APK 404 evidence,
dependency results and remaining backend/device verification.

- Web TypeScript check and production static export passed.
- Web Node suite: 22 passed, including the account audit regression test now
  included in `npm test`. Mobile Node suite: 16 passed.
- Web lint passed with two existing `no-img-element` warnings in `gcash.tsx`.
  Mobile lint passed after removing unused imports/results and using
  `globalThis.window` for web-only OAuth origin detection.
- All 16 authentication/navigation browser checks passed on desktop and mobile
  against the production export, using installed Chrome via
  `E2E_BROWSER_CHANNEL=chrome`. These intercept Auth/API calls and create no
  hosted accounts. They cover duplicate email/name rejection, availability
  failure, registration normalization, return destinations and admin navigation.
- Mobile registration now propagates availability errors and rejects malformed
  responses before signup. Native signup was not exercised on a device.
- Local database tests could not connect to `127.0.0.1:54322`; Docker is not
  available on PATH. The new identity migration and pgTAP tests remain unverified
  at runtime. No hosted migration, Edge Function or website was deployed during
  this continuation.

## Payment defaults and provider credentials — 2026-11-17

The follow-up now applies all 20 migrations and the actual pgTAP tests to an
isolated embedded PostgreSQL instance without Docker: **168 assertions passed**.
The runner emulates Supabase Auth/Storage SQL schemas; live service HTTP tests
remain a separate integration check.

Payment-recipient verification, changes to verified recipients, old RPC bypass
attempts, provider credential groups, services, availability, approval and
reactivation are covered. A successful-approval test exposed an existing
ambiguous SQL `reason` reference, corrected by migration 20.

Web TypeScript, web/mobile lint, 25 web Node tests, 16 mobile Node tests, production
export and all three Edge Function type checks passed. Six focused web browser
checks and three focused mobile browser checks passed after the changes.
See [payment-credential-hardening.md](payment-credential-hardening.md) for rollout
effects: existing wallets require re-verification; older uncategorized documents
remain readable but require resubmission to count toward approval.

These are local source/test changes. Hosted migrations, Edge Functions, website
and APK have not been published by this continuation.
