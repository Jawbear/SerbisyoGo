# Project audit — 17 November 2026

Follow-up: the payment defaults and backend credential checks below have now
been fixed in source, with 168 embedded PostgreSQL assertions passing. See
[payment and credential hardening](payment-credential-hardening.md) for the
implementation, rollout effects and remaining service-integration checks.
The findings below retain the original audit evidence; these fixes are not yet
deployed to the hosted project.

The audit covers the web app, Expo app, Supabase source, public endpoints,
dependencies, build/export configuration, automated workflows, and responsive
layouts. Findings below distinguish source defects, public endpoint results,
and checks that still need infrastructure. No hosted settings, accounts,
payments, database schema, release or website were changed.

## Highest priorities still open

| Priority | Finding and evidence | Required improvement |
| --- | --- | --- |
| 1 | The advertised Android 0.4.0 APK returns HTTP 404 to unauthenticated requests. The corresponding GitHub release API returns 404 with quota remaining, so this was not API rate limiting. Both live download browser cases fail. | Restore public access to the existing artifact, or publish the intended signed artifact and update the manifest from its actual size/hash. Re-run download and installation checks. Do not fabricate a successful release. |
| 1 | `202611160016_gcash_qr_and_enhancements.sql` seeds an **enabled** wallet with `09171234567` when settings are absent. Ownership of that default number is not established by this audit. | Require the operator to configure and independently verify the actual recipient before enabling payments. Keep a fresh installation disabled until this is done. Review existing hosted settings separately. |
| 1 | Provider approval in `202611160015_admin_crud_enhancements.sql` checks only that **one** verification file exists. The UI describes government ID, profession evidence, and clearance as required. | Enforce the complete category set in the approval transaction, with explicit administrator review. Prefer stored categories over trusting filename prefixes. Add isolated SQL tests for missing categories and approval bypasses. |
| 1 | Mobile dependency audit still reports 12 affected package entries: 2 high, 9 moderate, 1 low. These include Expo tooling's Zod 3 dependency and glob/minimatch/deepmerge dependencies. Compatible updates did not resolve them. | Assess a supported Expo upgrade or upstream fixes with native rebuild and device checks. Do not apply npm's proposed forced SDK downgrade to Expo 52. This count includes parent packages affected by transitive dependencies, not 12 independent exploits. |
| 1 | Current identity/CORS/backend changes lack a fresh local persisted database run: PostgreSQL at `127.0.0.1:54322` is unavailable, Docker and Deno are not on PATH. | Run the isolated backend CI against the final changes: migrations, pgTAP, Edge types, persisted signup/recovery, uploads/deletion, account management, booking/payment authorization. Existing historical CI evidence does not validate this working tree. |
| 2 | Public homepage returns 200 and the configured basic security headers, but no `Content-Security-Policy` or `Strict-Transport-Security` header. | Rehearse CSP with the actual Supabase, map, iframe, image and script requirements; verify the deployed policy and HTTPS/HSTS configuration. |
| 2 | Web-generated GCash QR content uses `get.gcash.com/pay` without demonstrated wallet-app interoperability. Mobile additionally sends wallet number and amount to `api.qrserver.com` for generation. | Use an operator-supplied, wallet-verified payment QR or a verified supported payment flow. Validate scanning, recipient, amount and reconciliation on a real device; avoid disclosing payment details to a third-party QR renderer. |
| 2 | Mobile discovery silently caps providers at 50 and services at 500. Mobile booking/message lists have no explicit pagination. Web `list()` eagerly accumulates up to 50,000 records. | Add server-filtered, stable cursor pagination and bounded queries; show loading/more-results states and retain filter state. Test catalogs and conversations beyond one API page. |
| 2 | Production email delivery, physical Android behavior, backup restoration, load capacity and alerting were not exercised. | Verify SMTP and OAuth callbacks on the actual deployed origin, run the physical-device checklist, and capture restore/load/monitoring evidence before broader rollout. |

The publicly checked APK endpoints were:

- [Release API](https://api.github.com/repos/Jawbear/SerbisyoGo/releases/tags/android-v0.4.0)
- [Advertised APK](https://github.com/Jawbear/SerbisyoGo/releases/download/android-v0.4.0/SerbisyoGo-0.4.0.apk)
- [Live website](https://serbisyogo.sg-team.workers.dev/)

A GitHub 404 can also hide a private resource. The confirmed impact is that an
unauthenticated user cannot fetch the advertised artifact; this audit does not
claim the owner has no private copy.

Advisory references: [Zod memory exhaustion](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5),
[deepmerge prototype poisoning](https://github.com/advisories/GHSA-gcqx-w48m-w2h4),
[minimatch resource consumption](https://github.com/advisories/GHSA-g3hv-75wg-m249),
[glob cancellation](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4).
Exploitability depends on the code path and input trust; audit severity alone is
not proof of an exploitable public application endpoint.

## Fixed during this audit

- Shared file-function CORS now advertises `DELETE`, enabling the browser
  preflight used to remove verification files. Exact origin restrictions remain
  enforced. Added a regression test for allowed and rejected origins.
- `deploy:check` previously printed a guide and returned success without checking
  its flags. It now rejects invalid public configuration, private keys in public
  key fields, incomplete policy records, missing exports, stale host headers and
  configured server keys found in exported text. It checks all four email
  templates. Cloudflare CI now runs it before publishing. This is an offline
  artifact/configuration gate, not proof of hosted delivery or runtime behavior.
- The Windows deploy helper can launch `.cmd` npm/npx commands through the
  Windows shell. Deployment itself was not run.
- Web dependency updates removed all seven initially reported moderate package
  entries; npm audit returned zero vulnerabilities. Mobile compatible dependency
  updates were retained, without forcing an SDK change.
- Admin, booking, messaging, provider, account, support and download feature
  modules now load dynamically instead of joining every public route's bundle.
  The desktop homepage measured **1,478 KiB → 944 KiB** of local transferred JS,
  approximately **36% less**. The discovery page measured 1,623 → 1,089 KiB.
  These are local uncompressed transfer observations, not field performance
  scores. Further splitting remains useful.
- Mobile registration normalizes repeated name whitespace and email case like
  the web flow. Browser fixtures now include availability responses and a valid
  successful signup identity. Four regressions check duplicate email/name,
  failed requests and malformed responses without allowing signup.
- Mobile sign-in accepts the provider-credentials screen as a return destination.
  Added a browser regression for the anonymous application → sign-in → application
  path. The assertion targets the visible React Navigation screen.
- Mobile browser configuration accepts an externally served test URL, allowing
  checks to finish independently of Windows Expo child-process teardown.
- GCash QR images use explicit dimensions through Next Image; web lint warnings
  were removed without enabling an image proxy for private/data URLs.
- Added the missing administrator accounts route to the inventory. The route
  checker now rejects undocumented pages as well as missing implementations.

## Verification

| Check | Result |
| --- | --- |
| Web TypeScript and production export | Passed; 49 generated pages including framework/special pages. |
| Web ESLint | Passed without warnings after QR image cleanup. |
| Web Node tests | 25 passed, including new CORS and deployment gate regressions. |
| Mobile ESLint and Node tests | Passed; 16 Node tests. |
| Expo dependency compatibility | Offline check says dependencies are up to date; offline validation is limited. |
| Android JavaScript/Hermes export | Passed after rerunning outside the sandbox that blocked `hermesc.exe`. This is bundling, not APK signing or installation. |
| Route inventory | 46 documented page entrypoints verified in both directions. |
| Import and syntax audits | 264 local import references and 144 TypeScript/JS source files passed. Dynamic-import export names are also checked by TypeScript/build. |
| Deployment readiness | Passed against the existing production environment and export. Invalid-key/origin/missing-build regressions also passed. |
| Initial complete web browser suite | 66 passed, 30 skipped, 2 failed. Failures are the confirmed public APK 404. Skips require explicitly enabled isolated/live-backend workflows. |
| Responsive/accessibility structure audit | 22/22 page/viewport visits returned 200 with one h1, zero overflow, zero unlabeled controls and zero unnamed links/buttons. Tested desktop 1440px and mobile 390px. Existing browser tests also cover widths 320–1920px. |
| Database runtime / fresh Deno types | Not run successfully; infrastructure unavailable locally. |

The structural image audit counts intentionally empty decorative logo/avatar/map
tile alt text; those counts are not automatically accessibility defects. This
was not a full contrast, screen-reader, keyboard, or WCAG conformance audit.

Final web browser rerun after feature splitting: **66 passed, 30 skipped**, with
the two already-confirmed live APK failures excluded from that rerun. The
complete initial run and the network-enabled APK retry retain the failure evidence.

Final mobile suite validated 21 cases and skipped 3 live-account cases. Its new
credentials-return test initially used an ambiguous selector because React
Navigation retains hidden screens. After scoping both assertions to the visible
screen, the targeted rerun passed: **22 distinct mobile cases validated** across
the suite and that final rerun. No product assertion was removed.

## Evidence and reproduction

Ignored local evidence: `.cache/full-audit-web`, `.cache/full-audit-download`,
`.cache/full-audit-web-final`, `.cache/full-audit-mobile-verified`,
`.cache/full-audit-layout-before.json`, `.cache/iso-audit.json`,
`.cache/npm-audit-web.json`, `.cache/npm-audit-mobile.json`.
The npm JSON files capture the initial scans; update commands returned the final
counts described above. No audit artifact includes account passwords.

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd run deploy:check
npm.cmd --prefix mobile test
npm.cmd --prefix mobile run lint
npm.cmd --prefix mobile run export:android

# Serve the current web export locally, then:
$env:E2E_BROWSER_CHANNEL = 'chrome'
$env:E2E_BASE_URL = 'http://127.0.0.1:4173'
npx.cmd playwright test --reporter=line

# From mobile/, with Expo running on :8081:
$env:E2E_MOBILE_BASE_URL = 'http://localhost:8081'
npm.cmd run test:e2e -- --reporter=line
```

The complete web command intentionally retains the live APK check, which should
keep failing until public artifact access is repaired. Isolated backend checks
must run against a disposable local Supabase stack, not real accounts.
