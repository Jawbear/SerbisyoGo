# Validation report

## Executed here

| Check | Result | Scope |
| --- | --- | --- |
| `npm test` | **11 passed, 0 failed** | Integer money/rounding, transitions, Philippine phone format, redirect boundaries, file validation, review eligibility, interval overlap, CSV formula escaping, honest cash checkout, malformed and valid binary manifest parsing |
| Offline Babel TypeScript/TSX syntax pass | **Passed** | All application, test, script and Edge source files parsed; this is syntax validation, not typechecking or bundling |
| Offline React rules using an existing installed toolchain | **0 errors** | React hook/compiler rules after stripping TS syntax; this does not substitute for the project's full ESLint configuration |
| Static route inventory | **44 route entrypoints present** | Includes all 20 customer/provider prototype views, all 12 admin views and supporting routes |
| Local module import/export audit | **219 references verified** | Source paths and named exports exist; external dependency types remain unverified |
| Figma inspection | **Main file accessible** | Shared design contexts and frame structures inspected, logo and hero asset recovered; secondary file access denied |

The first domain run found a trailing-slash mismatch in the safe redirect fallback; it was corrected. Offline React rules found render-time clock calls and a synchronous callback error-state update; those were corrected and rechecked. No unresolved failure remains in the checks that could actually execute.

## Attempted but could not run

| Check | Blocking evidence | Status |
| --- | --- | --- |
| Dependency installation / lock generation | npm registry requests rejected by the environment with `EACCES`; local npm cache was inaccessible | **Unrun/blocked** |
| `npm run typecheck` | `tsc` unavailable because installation failed | **Unrun** |
| `npm run lint` | Project `eslint` unavailable because installation failed | **Unrun** |
| `npm run build` | `next` unavailable because installation failed | **Unrun** |
| `npm run test:db` | Supabase CLI, Docker and Postgres not installed/configured here | **Unrun** |
| Official database type introspection | No running local Supabase | **Unrun**; migration-derived snapshot committed and clearly labeled |
| Edge Function type/runtime and RLS/storage integration checks | No local backend, runtime or project credentials | **Unrun** |
| `npm run test:e2e` | Playwright/dependencies unavailable and no running app/backend | **Unrun** |
| In-app desktop/mobile visual check | Browser connection failed before navigation because the environment's sandbox metadata was unavailable | **Unrun** |
| Real APK verification/publication/download | No APK supplied; no local backend | **Unrun**; no fake package or release created |

## Included suites for a configured environment

`supabase/tests/security.test.sql` runs in a rollback transaction. It covers two customers/two providers, role-metadata escalation, protected function calls, profile restrictions, unrelated bookings/conversations/cases/documents, idempotent confirmations/messages/payment events, server prices and changed-price refusal, schedule conflicts, transitions, location authorization/cleanup, quotation ownership/acceptance, invoice/review eligibility, cash-held balance handling, append-only admin audit and incomplete/draft APK permissions.

Playwright public tests cover navigation, unauthenticated admin/private denial, the no-release state, table search and desktop/mobile document overflow. Local integration tests cover account persistence, customer scheduling through completion/invoice/review, member messaging and outsider denial, complaints with separate private notes, admin category/announcement changes and audit, direct non-admin RPC denial, private file signing and draft APK denial. Registration verification requires the configured local test inbox. Valid-release testing requires an actual developer-supplied test APK and is explicitly skipped without it. No integration test is represented as passed here.

## Concrete remaining inputs and gates

1. Allow npm installation, generate/commit a resolved lockfile, and run build, full lint and TypeScript checks. Resolve any library/API/type findings before deployment.
2. Start an isolated Supabase project, apply every migration, run SQL/Edge tests and regenerate introspected types. Configure actual production/staging URL/publishable key only on a compatible operational web host, never the supplied Pages preview.
3. Configure exact Auth redirects, SMTP sender and delivery/rate settings, Edge `ALLOWED_ORIGINS`, explicit fee/commission policy, verified initial admin and production map service.
4. Supply final operator-approved terms/privacy wording and support contact. Policy pages currently disclose implemented behavior and missing approval, rather than inventing business terms.
5. Supply the actual signed APK after later Android development. Validate its certificate using the Android release pipeline; no signing key or Android app is part of this task.
6. Add and test actual gateway/payout integrations only if desired. Current behavior is cash/manual recordkeeping, without online charges, escrow, automatic refunds or transfers.
7. Run the browser workflows and visual review on desktop/mobile, then fix any overflow, alignment, dependency or integration findings. Pixel-perfect fidelity and production readiness have not been established.

The user requested no public deployment or production database changes. Neither occurred. GitHub Pages is prepared for a fictional unconfigured preview; its commercial/sensitive-transaction restrictions are documented in deployment.md.
