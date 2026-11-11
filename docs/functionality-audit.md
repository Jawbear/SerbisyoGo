# Functionality audit — 11 November 2026

The current dark emerald design and account role labels are preserved. This audit verifies the checks below; it does not certify every production interaction as 100% functional.

## Fixes

- Protected pages now carry their path and query parameters into sign-in. A customer returns to the selected booking service, and an administrator returns to the requested admin section. Existing role checks still reject a customer attempting administrator sign-in.
- Protected pages first hydrate their server loading state before rendering the resolved session. This fixes a reproduced hydration error when authentication finishes before a page's Suspense boundary hydrates.

The authentication regressions use intercepted responses and assert that no uncaught browser errors occur during customer and administrator return navigation.

## Checks performed

| Check | Result and scope |
| --- | --- |
| Node tests | 16 passed: pricing, role transitions, redirects, phone validation, uploads, reviews, scheduling, CSV, APK parsing, payment record semantics, development fixture safeguards, request timeout/cancellation. |
| Complete existing browser suite | 46 passed and 20 skipped in desktop and mobile Chrome. Covers public navigation, discovery filters, map controls, private/admin access guards, failed-request retry, preview tables, profile photo UI, account role labels, and responsive widths from 320 to 1920px. This initial run preceded the two fixes above. |
| Final authentication/public regressions | 14 passed after both fixes, including 6 new authentication tests across desktop/mobile and 8 existing public tests. |
| Final profile regressions | 6 passed after both fixes: customer, provider and administrator photo validation, preview/replacement, role labels, navigation and account layout. Responses are intercepted; this does not test hosted file storage writes. |
| Hosted development backend | The read-only development script passed actual account login, role checks, scoped records, outsider booking/message isolation, internal-note and audit isolation, invoices, reviews, admin reports and private release metadata. No application records were changed. |
| Live development browser reads | 3 role checks passed with actual development credentials, covering 23 route visits across customer, provider and administrator workspaces. Includes account/profile, bookings, messages, notifications, support, provider availability, and all 11 admin sections. No application records were changed; credentials and traces are not committed. |
| TypeScript / ESLint / production export | Passed, including TypeScript within the final build. All 46 generated pages completed. |
| Route inventory | 44 documented route entrypoints verified. |
| Exported secret check | 243 exported text assets checked; none contained the configured server-only Supabase key. This is a targeted check, not a general security certification. |

The in-app browser connection remains unavailable because of environment sandbox metadata. The installed Chrome browser successfully ran the repository's Playwright checks instead. Restricted-network attempts were retried with permitted network access before recording hosted-check results.

## Remaining verification limits

- The SQL security suite cannot connect to an isolated local database: `ECONNREFUSED 127.0.0.1:54322`. Start Docker/local Supabase, apply the migrations and run `npm run test:db`.
- The 20 existing integration cases were skipped because local test backend credentials and `.cache/demo-users.json` are absent. Persisted booking submission/completion, quotations, real message delivery, support writes, administrative writes and file authorization still require that isolated environment. Read-only development checks do not replace these write/negative-authorization tests.
- Actual email verification/recovery delivery and real APK publication/download remain unverified. No developer test APK is configured. No APK was fabricated.
- Payment behavior is cash/manual recordkeeping. GCash, Maya, card charging, automatic transfers and automatic refunds are not configured features.
- These checks used the local frontend and the configured development backend. The deployed production frontend, its build-time configuration, SMTP, host security headers and Edge CORS/deployments still need deployment-specific verification.
- The static export continues to warn that Next.js response headers are not applied by a static host. Configure them on the operational host. The external-lockfile warning is specific to this workstation.

## Repeat the live read-only browser checks

Use the existing ignored `.cache/development-users.json` only with its matching development backend and local frontend. These tests never submit application mutation forms. The script deliberately disables traces, screenshots and video for real-credential runs.

```powershell
$env:E2E_BROWSER_CHANNEL = 'chrome'
$env:E2E_BASE_URL = 'http://localhost:3000'
$env:E2E_DEVELOPMENT_READONLY = '1'
npx.cmd playwright test tests/e2e/development-readonly.spec.ts --project=desktop --reporter=line --output=.cache/development-readonly-results
```

Without the explicit opt-in, the live read-only cases skip. The default public suite continues using controlled responses, and the existing write-integration suite continues requiring an isolated localhost backend.
