# ISO/IEC 25010 Quality Evaluation Report — SerbisyoGo

**Developer self-assessment | 15 November 2026**

## Document control

| Item | Detail |
|---|---|
| System | SerbisyoGo — static web application, Expo/React Native Android app, and Supabase backend |
| Repository | `C:\Users\ACER\Desktop\INTREP` |
| Branch / last commit | `alpha-gcash-20261115` / `9220e05` (plus uncommitted evaluation fixes) |
| Evaluation standard | ISO/IEC 25010:2011 product quality model, eight characteristics |
| Evaluation instrument | 41 project-specific criteria, numbered A1–H4 and mapped to the eight characteristics |
| Assessment type | Evidence-based developer self-assessment, not third-party certification |
| Evaluator | AI-assisted development review (OpenCode), with operator-visible evidence |
| Date of evaluation | 15 November 2026 |
| Production changes | None. No production data, database schema, SMTP setting, policy approval, or deployment was changed |
| Main deliverable | This report |

> **Important scope note.** ISO/IEC 25010 defines quality characteristics and sub-characteristics; it does not itself define 41 numbered criteria or a 5–1 score. The A1–H4 numbering below is the evaluation instrument used for this project. Each criterion is explicitly mapped to an ISO/IEC 25010 characteristic so the scoring is traceable. The ratings are professional judgments supported by the evidence cited, not measurements produced by the standard.

---

## 1. Executive summary

SerbisyoGo is a substantial, working service-marketplace system. It has a public website, shared customer/provider accounts, an administrator workspace, a Supabase database with row-level security, three Edge Functions, a signed Android release, and automated tests at unit, browser, database, and workflow levels.

**Overall developer rating: 3.71 / 5 — Good.**

| Result | Value |
|---|---|
| Criteria evaluated | 41 |
| Criteria with a rating | 38 |
| Criteria marked **Not Verified** | 3 (B5 capacity, E1 availability, E3 recoverability) |
| Overall average (excluding Not Verified) | **3.71 / 5** |
| Highest characteristics | Reliability 4.00, Maintainability 4.00, Functional Suitability 3.83, Usability 3.83 |
| Lowest characteristics | Portability 3.25, Performance Efficiency 3.50, Security 3.50 |
| Executed Playwright browser tests | **60 passed**, 30 skipped locally (they require an isolated Supabase environment; the CI run covers the backend workflows) |
| Web unit tests | **20 passed** |
| Mobile unit tests | **15 passed** |
| Static-page audit | **22 / 22 page-and-viewport combinations returned HTTP 200**, zero horizontal overflow, zero unlabeled form controls, zero unnamed buttons or links, exactly one `h1` per page after fixes |
| Current-commit CI | GitHub Actions run **43676676245 passed** for `9220e05`, including isolated Supabase database, RLS/security SQL, generated types, Edge Function type checks, and persisted desktop/mobile workflows |

### What is strong

- The core marketplace workflow is complete: discovery → provider profile → booking request → provider state transitions → messaging → support → invoice/review, with role-specific workspaces.
- Security is designed in depth: RLS on all 36 application tables, a narrow RPC allowlist, `security definer` functions with an empty search path, private storage buckets, and no service-role key in client source or exported assets.
- Money is handled as integer centavos with deterministic half-up commission rounding; timestamps are stored in UTC and displayed in `Asia/Manila`.
- The interface is responsive from 320 px to 1920 px, keeps the green-and-black identity, and has good structural accessibility (skip link, labelled controls, landmarks, focus styles, one main heading per page).
- Automated checks are broad and repeatable: typecheck, lint, unit tests, browser tests, route/import audits, policy gate, static build, and isolated database workflows in CI.

### What prevents a production launch

1. **Policy approval is still a draft.** Terms, privacy, and pricing pages deliberately show a draft banner and `noindex`; the approval record has no approved-by identity, no approval date, no support email, and no DPO email. The deploy gate correctly blocks release.
2. **Production SMTP has not been configured or tested.** Google SMTP credentials and the Supabase dashboard change are operator steps. Verification and password-reset delivery in production remain unverified.
3. **The live Cloudflare Worker is an older build.** `https://serbisyogo.sg-team.workers.dev` responds with HTTP 200, but it does not serve the current source and does not return the security headers present in `out/_headers`.
4. **Production migration and Edge Function rollout are not verified.** The current commit passed isolated CI, but no production `db push` or function deployment was performed or checked during this evaluation.
5. **Physical Android testing is pending.** The phone is broken, Android Studio/emulator is not installed on this workstation, and iOS was not built. Earlier emulator evidence exists in project documentation but was not re-executed here.
6. **Real GCash settlement, refunds, backup/restore, uptime monitoring, and load capacity are unverified.** These are correctly marked **Not Verified**, not assumed to pass.

### Bottom line

The system is **suitable for an academic demonstration and a controlled pilot with fictional or test data**. It is **not yet ready for an unsupervised public launch** until the six launch blockers above are closed. No production data or schema was modified to produce this report.

---

## 2. Scope, method, and evidence

### 2.1 In scope

- Complete Next.js static-export frontend: public pages, authentication, customer workspace, provider workspace, 12 administrator destinations (dashboard plus 11 sections), support, messaging, payments, policies, and APK download.
- Supabase backend: 12 migrations, 36 tables, row-level security policies, RPC allowlist, triggers, audit logs, storage policies, and three Edge Functions (`files`, `releases`, `admin-accounts`).
- Expo/React Native mobile source: authentication, discovery, booking, booking record, messaging, account, GCash receipt submission, and in-app update logic.
- Test and operations assets: Playwright suites, Node unit tests, SQL security tests, GitHub Actions workflows, deployment scripts, headers, and policy approval gate.
- Runtime evidence from a locally served production build, Chrome desktop/mobile Playwright, Expo web, HTTP checks, DOM/accessibility audit, and performance timings.

### 2.2 Out of scope or not executable here

- Mutating production data, production schema, SMTP configuration, policy approval, or deployment.
- Real GCash transfers, refunds, or reconciliation against a live wallet.
- Real Google SMTP delivery and production email templates end-to-end.
- Physical-phone testing, Android emulator re-run, and iOS.
- Load, stress, soak, penetration, and disaster-recovery testing.
- A formal screen-reader, contrast, or WCAG conformance audit.
- A third-party certification audit.

### 2.3 Method

1. **Source inspection.** Reviewed the web routes/components, Supabase migrations and RPCs, Edge Functions, mobile screens and data layer, admin modules, test suites, and deployment configuration.
2. **Runtime observation.** Served the production static export locally, exercised 11 routes at desktop (1440 px) and mobile (390 px) widths with Chrome, measured DOM/accessibility properties and navigation/resource metrics, and captured screenshots.
3. **Automated verification.** Ran typecheck, lint, unit tests, browser tests, build, route/import checks, policy check, and confirmed the current-commit isolated Supabase CI run through the public GitHub API.
4. **Targeted fixes.** Fixed the defects that were concrete, low-risk, and evidence-based, then re-ran the relevant checks.
5. **Scoring.** Rated each of the 41 criteria on the 5–1 scale; marked criteria with no reliable evidence **Not Verified** and excluded them from averages.

### 2.4 Evidence hierarchy

| Level | Evidence type | How it was used |
|---|---|---|
| 1 | Executed test or CI result | Strongest support for a rating |
| 2 | Runtime observation in a served build | Supports performance, usability, and HTTP claims |
| 3 | Source and schema inspection | Supports design, security, and maintainability claims |
| 4 | Project documentation | Context only; not treated as proof of a current runtime result |

### 2.5 Rating scale

| Rating | Label | Definition |
|---:|---|---|
| 5 | Excellent | Fully meets the criterion; repeatable evidence; no material defect found. |
| 4 | Good | Meets the criterion; minor defects or limited conditions; representative evidence. |
| 3 | Fair | Partially meets the criterion; notable gaps or only partial verification. |
| 2 | Poor | Significant gaps; unreliable in important paths. |
| 1 | Very Poor | Does not meet the criterion; unsafe or non-functional. |
| **NV** | **Not Verified** | No reliable evidence was available. Excluded from averages; not treated as a pass or a fail. |

---

## 3. System overview

### 3.1 Architecture

```text
Web browser ──► Cloudflare Worker (static Next.js export, /out)
                    │
Android app ────────┼──► Supabase
(Expo / RN)         │     ├─ Auth (email verification, reset)
                    │     ├─ Postgres + RLS (36 tables)
                    │     ├─ PostgREST + RPC allowlist
                    │     ├─ Realtime (messages)
                    │     ├─ Storage (private buckets, signed URLs)
                    │     └─ Edge Functions (files, releases, admin-accounts)
                    │
GitHub Actions ─────┴──► isolated Supabase stack, Android APK build, Pages preview
```

### 3.2 Components

| Layer | Technology / scale | Notes |
|---|---|---|
| Web | Next.js 16.4.6 App Router, React 19.2, TypeScript 5.9, static export | 45 documented route entrypoints; 49 build page entries; 48 generated `index.html` files |
| Admin | 12 administrator destinations (dashboard + 11 sections) | Dashboard, providers/verification, accounts, customers, bookings, services/pricing, commissions/payouts, transactions, reports, complaints/safety, announcements, settings/audit logs |
| Backend | Supabase Postgres, Auth, Storage, Realtime, Edge Functions | 36 tables; 12 migrations; RLS on all exposed tables; narrow RPC allowlist |
| Edge Functions | `files`, `releases`, `admin-accounts` | Deno; shared CORS/HTTP helpers; service-role use confined to server side |
| Mobile | Expo SDK 55, React Native 0.83.10, React 19.2 | Android package source version 0.4.0; published signed APK 0.3.1; shared Supabase accounts |
| Hosting | Cloudflare Workers static assets | `wrangler.jsonc`; `out/_headers` security and update-feed rules |
| CI/CD | GitHub Actions | Isolated Supabase checks, Expo mobile checks, Android APK, Pages preview, Cloudflare deploy workflow |
| Money | Integer centavos; commission in basis points | `calculatePrice` uses `BigInt` and half-up rounding; database checks constrain 0–10000 bps |
| Time | UTC storage; `Asia/Manila` display | Booking dates and reports use Manila boundaries |
| Payments | Manual GCash transfer + administrator verification | No gateway, escrow, automatic transfer, or automatic refund |
| Policies | Structured terms, privacy, pricing | Draft banner and `noindex` until operator approval; deploy gate enforced |

### 3.3 Roles and main journeys

- **Visitor:** browse services/providers, read policies, download the Android app, register or sign in.
- **Customer:** request a booking, choose a schedule, review price, track status, message the provider, submit a GCash receipt, open support cases, review a completed service.
- **Provider:** manage profile/application, availability, assigned bookings, state transitions, earnings/payout requests, and booking messages.
- **Administrator:** verify providers, manage accounts/services/settings, review transactions and GCash receipts, handle complaints, publish announcements/releases, inspect audit logs and reports.

---

## 4. Results at a glance

| Characteristic | Criteria | Rated | Not Verified | Average |
|---|---|---:|---:|---:|
| A. Functional Suitability | A1–A6 | 6 | 0 | **3.83** |
| B. Performance Efficiency | B1–B5 | 4 | 1 | **3.50** |
| C. Compatibility | C1–C4 | 4 | 0 | **3.75** |
| D. Usability | D1–D6 | 6 | 0 | **3.83** |
| E. Reliability | E1–E5 | 3 | 2 | **4.00** |
| F. Security | F1–F6 | 6 | 0 | **3.50** |
| G. Maintainability | G1–G5 | 5 | 0 | **4.00** |
| H. Portability | H1–H4 | 4 | 0 | **3.25** |
| **Overall** | **41** | **38** | **3** | **3.71** |

The averages above exclude B5, E1, and E3. Including them as zero would be misleading; treating them as five would be fabrication.

---

## 5. Criterion-by-criterion evaluation

### A. Functional Suitability (A1–A6)

| ID | Criterion and ISO mapping | Rating | Evidence | Problems found | Recommended improvement |
|---|---|---:|---|---|---|
| A1 | **Core functional completeness** - end-to-end role workflows (functional completeness) | 4 | 45 documented routes; customer, provider, and 12 admin destinations (dashboard + 11 sections); authentication, discovery, booking, messaging, support, GCash, releases, policies, and APK download; 49 build page entries; mobile app source covers the same core journeys. | Production email and real GCash settlement were not exercised; several administrator actions depend on operator policy and settings that are still draft. | Run a production-like role-by-role smoke matrix after deployment; add a visible system-status/feature page. |
| A2 | **Pricing and commission correctness** — integer money, rounding, bounds (functional correctness) | 4 | `calculatePrice` in `src/lib/domain.ts` uses integer centavos, `BigInt`, and half-up rounding; tests cover ₱450 labor + ₱50 fee + 10% commission and the 101-cent rounding case. `percentToBps` now validates 0–100% and is covered by tests for 10, 10.5, 100, 0, and invalid values. Database checks constrain `commission_bps` to 0–10000. | The admin settings form previously reused the peso parser for a percentage field; values above 100% failed later at the database instead of being rejected in the form, and the error wording referred to pesos. No end-to-end invoice reconciliation against a live database was run in this evaluation. | Add a property-based test for commission rounding and a database-backed invoice reconciliation test; show the computed total beside the admin input before saving. |
| A3 | **Booking lifecycle and state integrity** — controlled transitions, actor rules (functional correctness) | 4 | `transitions` defines customer/provider/admin moves; server-side RPCs enforce the same rules; CI run 43676676245 passed the isolated persisted workflows, including booking through completion, invoice, and review, plus outsider denial. | No production telemetry or alarm for bookings stuck in a state; cancellation/refund handling remains partly manual. | Add state-age alerts and a formal cancellation/refund runbook; test timeout and concurrent-transition cases. |
| A4 | **Account and role workflows** — registration, verification, provider approval, admin provisioning (functional appropriateness) | 4 | Supabase Auth with email verification and password reset; `new_user()` assigns customer role regardless of signup metadata; provider role changes require approval; initial admin provisioning is an owner script; auth-navigation browser tests passed on desktop and mobile; CI account tests passed. | No multi-factor authentication for administrators; session lifetime/revocation policy is not documented as an operator control. | Add MFA for admin accounts and explicit session-revocation procedures; test account recovery after role changes. |
| A5 | **Payments, releases, and support workflows** — GCash, APK release, case handling (functional completeness) | 3 | GCash receipt submission and administrator verification are implemented with dedicated tables/UI; release publication uses an Edge Function and verified metadata; support cases support files and private notes; download fallback works when the release database is unavailable. | Real GCash transfer/settlement/refund was not tested; payment recording is manual; real signed-APK publication cases are intentionally skipped in local automation; the hosted support email is still a placeholder. | Run a controlled GCash pilot with a test wallet and reconcile against the ledger; test one real signed APK through verification, publication, download, and archive. |
| A6 | **Input validation and business rules** — forms, uploads, database constraints (functional appropriateness) | 4 | Web and mobile validation for phone, address, appointment window, password, consent, and upload type/size; database checks and RLS constraints; CSV export neutralizes spreadsheet formulas; 20 web unit tests and 15 mobile unit tests pass. | Validation rules are duplicated across web, mobile, and database, so they can drift; there is no shared generated contract. | Generate shared validation contracts from one source and add fuzz/property tests for the critical fields. |

### B. Performance Efficiency (B1–B5)

| ID | Criterion and ISO mapping | Rating | Evidence | Problems found | Recommended improvement |
|---|---|---:|---|---|---|
| B1 | **Load and navigation performance** — time behavior | 3 | Static audit: 22/22 pages HTTP 200; local navigation 117–181 ms on most page/viewport combinations; JavaScript payload about 1,452 KB (1,597 KB on `/find/`), uncompressed in the local audit. | One mobile `/find/` navigation measured 1,401 ms in the audit, probably waiting on external map tiles; no Lighthouse, Core Web Vitals, field data, or compressed-transfer measurement was run. The JavaScript payload is large for a mobile-first site. | Add a bundle analyzer, route-level budgets, dynamic imports for charts/maps/QR code, and a Lighthouse or WebPageTest check against the deployed build. |
| B2 | **Rendering and responsive performance** — time behavior | 4 | No horizontal overflow at 320, 375, 390, 768, 1024, 1440, or 1920 px; responsive Playwright tests passed on desktop and mobile projects; the DOM audit found 0–1 long tasks per page. | No low-end CPU throttling, interaction-to-next-paint measurement, or animation-cost review. | Run Lighthouse with mobile CPU throttling and add an INP budget; profile the booking and discovery interactions. |
| B3 | **Resource utilization** — memory, images, CPU (resource utilization) | 4 | JS heap stayed between about 7.7 MB and 42.1 MB across 11 client-side routes; optimized cover images total about 407 KB per platform; no crash or runaway memory was observed. | Heap grows as more client routes are visited in one session; external OpenStreetMap tiles are outside the application's control. | Release object URLs and lazy-initialize the map; add a long-session memory profile on a low-end Android device. |
| B4 | **Query and data-fetch efficiency** — resource utilization | 3 | Support cases now query only the signed-in user's bookings; admin gets none. Mobile booking lists resolve provider names with one `.in()` lookup instead of one request per row. Supabase filters are used instead of broad client-side filtering in the fixed paths. | Some admin list/report screens still load broad tables; no server-side pagination on every list; no query-plan or index review. The support scoping fix is verified by typecheck/lint and code review, not by an authenticated browser test. | Add server-side pagination and date filters to admin lists, review indexes with `EXPLAIN ANALYZE`, and add an authenticated support-dropdown regression test. |
| B5 | **Scalability and capacity** — capacity | **NV** | Architecture can scale through static CDN delivery and managed Supabase, but no load, stress, soak, or concurrency test was run. Supabase tier limits, connection pooling, Edge Function concurrency, and peak booking throughput are unknown. | Unknown behavior at expected peak load; no rate-limit or capacity plan was verified. | Run k6 or Artillery against a staging environment at expected and peak concurrency; document Supabase limits, pooling, and Edge Function concurrency. |

### C. Compatibility (C1–C4)

| ID | Criterion and ISO mapping | Rating | Evidence | Problems found | Recommended improvement |
|---|---|---:|---|---|---|
| C1 | **Cross-browser compatibility** — co-existence | 3 | Playwright browser tests passed in installed Chrome on desktop and mobile viewports; the UI uses standard HTML/CSS and progressive enhancement patterns. | Firefox, Safari/WebKit, Edge, and in-app browsers were not tested. Native `dialog`, file upload, clipboard, QR rendering, and download behavior can differ by browser. | Add Playwright Firefox and WebKit projects to CI; run a small Safari/iOS smoke test before launch. |
| C2 | **Responsive and device compatibility** — adaptability | 4 | Automated layouts tested at 320, 375, 390, 768, 1024, 1440, and 1920 px with no horizontal overflow; mobile web tested through Expo web; earlier documentation records Android-emulator installation/navigation checks. | Physical-phone testing is pending; landscape tablet, foldable, and very large text settings were not covered. | Complete the physical-device matrix in `docs/physical-device-testing.md`; add landscape and large-font checks. |
| C3 | **Platform integration** — web, mobile, Supabase, hosting (interoperability) | 4 | Web and mobile share Supabase accounts and data; three Edge Functions are type-checked in CI; static export deploys to Cloudflare Workers; CI run 43676676245 passed the isolated backend and persisted workflows. | The live Worker is older than the current source; local/production configuration can drift; Edge CORS depends on `ALLOWED_ORIGINS`. | Deploy the same build through CI to a staging URL, verify CORS and auth redirects, and expose a build/version marker. |
| C4 | **Data, timezone, and interchange formats** — interoperability | 4 | Timestamps stored in UTC and displayed in `Asia/Manila`; money in integer centavos; APK binary manifest parser tested; `app-update.json` contract tested by mobile unit tests; CSV exports quote and neutralize formulas. | No schema/contract version is exposed to clients; update-manifest and CSV contract tests are not shared across all consumers. | Add versioned API/manifest contracts and consumer-driven contract tests; document date-boundary behavior. |

### D. Usability (D1–D6)

| ID | Criterion and ISO mapping | Rating | Evidence | Problems found | Recommended improvement |
|---|---|---:|---|---|---|
| D1 | **Learnability and navigation** — appropriateness recognizability, learnability | 4 | Role-based navigation, skip link, clear public calls to action, three-step booking progress, return-to-origin after sign-in, and protected-route explanations; auth-navigation tests passed on desktop and mobile. | No first-run onboarding or contextual help tour; error recovery depends on reading form messages. | Add a short first-run checklist for customers/providers and contextual help links at complex steps. |
| D2 | **Accessibility** — accessibility | 4 | DOM audit found 0 unlabeled form controls, 0 unnamed buttons/links, landmarks, a skip link, visible focus styles, labels associated with inputs, and exactly one `h1` on all 22 audited page/viewport combinations. The duplicate `h1` on `/download/` was fixed. Decorative logo/avatar images use empty alt text appropriately; the map has a labelled `role="img"` container. | No axe-core, screen-reader (NVDA/TalkBack), contrast, reduced-motion, or formal WCAG audit was run. | Add axe-core to CI, perform manual NVDA and TalkBack passes, test contrast and reduced motion, and document the conformance target. |
| D3 | **Visual consistency and branding** — user interface aesthetics | 4 | Green-and-black theme tokens preserved; screenshots of `/download/` at 1440 px and 390 px confirm the design hierarchy; responsive review and public-layout tests passed. | Visual quality is partly subjective; there is no screenshot-based visual regression suite. | Add Playwright visual snapshots for key pages and a token/component consistency check. |
| D4 | **Error prevention and feedback** — user error protection | 4 | Inline validation, required fields, confirmation dialogs for destructive actions, `MutationForm` success/error notices, `QueryState` retry states, and clear empty states; validation unit tests pass. | Some destructive administrator actions use `window.confirm`; offline/network errors are sometimes generic. | Replace browser confirmations with typed or explicit destructive-action dialogs; add stable error codes and recovery guidance. |
| D5 | **Help and policy transparency** — appropriateness recognizability | 3 | Support FAQ, Android install steps, structured terms/privacy/pricing pages, draft banner, `noindex`, and a policy check that blocks deployment while draft. | Policies remain unapproved; the hosted support email is `support@example.test`; no DPO email, business identity, or approval date is recorded. | Obtain operator approval, replace placeholder contacts, publish the approved version, and add a policy changelog. |
| D6 | **Mobile operability and touch use** — operability | 4 | Navigation items and primary controls meet roughly 44 px touch targets; phone call-to-action heights are tested; mobile menu, keyboard dismissal, and page navigation tests pass; Expo web suite previously passed 17 checks with 3 intentional skips. | Physical-phone testing is pending; large-font and keyboard-overlap behavior were not fully tested. | Test on a physical Android phone with large font and keyboard open; verify TalkBack and back-navigation behavior. |

### E. Reliability (E1–E5)

| ID | Criterion and ISO mapping | Rating | Evidence | Problems found | Recommended improvement |
|---|---|---:|---|---|---|
| E1 | **Availability** — availability | **NV** | Static hosting and managed Supabase are availability-friendly by design; the hosted Worker returned HTTP 200 during this evaluation. No uptime monitor, status page, incident history, or SLA measurement was available. | Actual availability, recovery time after an incident, and regional failure behavior are unknown. | Add uptime monitors and a status page; record synthetic checks for web, auth, database, and Edge Functions. |
| E2 | **Fault tolerance and graceful degradation** — fault tolerance | 4 | Download page works when the release database is unavailable; query states expose retry; mobile `boundedFetch` now distinguishes a real timeout from caller cancellation; update checks fail closed when offline; CI workflows pass. | No circuit breaker or offline queue for bookings/messages; some partial failures surface as generic errors. | Add retry/backoff and offline-safe drafts; inject failures in tests for Supabase, Edge Functions, and storage. |
| E3 | **Recoverability** — recoverability | **NV** | Draft persistence, idempotent confirmation/message/payment RPCs, immutable audit records, and CI database resets demonstrate parts of recoverability. No backup schedule, restore drill, RPO/RTO target, or point-in-time recovery test was available. | Recovery from data loss or a bad migration is unproven. | Document Supabase backup/PITR settings; run and record a restore drill; add migration rollback procedures. |
| E4 | **Data integrity and consistency** — integrity | 4 | Database constraints, integer centavos, immutable commission ledger and case-note triggers, audit logs, idempotency keys, and CI SQL security tests passed on the current commit; UI calculations are unit-tested. | GCash reconciliation is manual; no end-to-end financial reconciliation job; production migration rollout is not verified. | Add a reconciliation report/job, checksum monitoring, and a staging migration rehearsal. |
| E5 | **Stability and defect trend** — maturity | 4 | 60 browser tests passed, 20 web unit tests passed, 15 mobile unit tests passed, CI passed on the current commit, and seven concrete defects were fixed during this evaluation. | No production error tracking or crash telemetry; defects were found late in the cycle. | Add error tracking, canary releases, and a flake/defect trend review. |

### F. Security (F1–F6)

| ID | Criterion and ISO mapping | Rating | Evidence | Problems found | Recommended improvement |
|---|---|---:|---|---|---|
| F1 | **Authentication** — authenticity | 4 | Supabase Auth with email verification and password reset; `getUser()` verifies the stored session; signup metadata cannot grant a privileged role; separate admin sign-in; mobile and web share accounts. | No multi-factor authentication; production SMTP delivery is unverified, so verification/reset email behavior is not proven. | Require MFA for administrators; test SMTP delivery and redirects on the deployed host; document session lifetime. |
| F2 | **Authorization and row-level security** — confidentiality, integrity | 4 | RLS enabled on all 36 application tables; authenticated role has no broad booking/role/financial/settings/audit writes; narrow RPC allowlist; `security definer` functions use an empty search path; anonymous admin/private route denial passed; CI SQL security and persisted outsider-denial workflows passed on `9220e05`. | Local SQL tests could not run because Docker is unavailable; hosted migration state and production policy rollout are unverified; administrators can read broad datasets by design. | Keep the CI SQL suite mandatory; add a policy coverage map and least-privilege review for admin reads; verify policies on the hosted project. |
| F3 | **Privacy and confidentiality** — confidentiality | 3 | Private storage buckets with signed URLs; RLS separates public provider data from private identity/contact data; no service-role key in client source or exported assets; policy pages disclose implemented behavior. | Policies are draft; support email is a placeholder; no DPO contact; no documented retention schedule or automated erasure/DSAR workflow. | Approve policies, publish real contacts, create a data map/ROPA, define retention, and test export/erasure requests. |
| F4 | **Input validation and injection resistance** — integrity | 4 | Schema validation on forms, parameterized Supabase queries, RPC-based writes, no client-side raw SQL, file type/size validation, CSV formula neutralization, and 20 unit tests. | No Content Security Policy; uploaded files are not malware-scanned; validation is duplicated across clients and database. | Add CSP, server-side validation for every write path, file scanning, and shared validation contracts. |
| F5 | **Transport and security headers** — confidentiality | 3 | HTTPS hosting; `out/_headers` contains `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, and `Permissions-Policy`; update feed has explicit CORS/no-store rules. | The live Worker is an older build and did not return these headers; no HSTS and no CSP; no dependency-audit evidence was collected. | Redeploy the current export, verify headers over HTTPS, add HSTS and a tested CSP, and run dependency/secret scans in CI. |
| F6 | **Auditability and accountability** — accountability, non-repudiation | 3 | `audit_logs`, immutable commission ledger and case-note triggers, administrator actions tied to authenticated identities, and protected release metadata. | No security monitoring, alerting, or SIEM integration; log retention and tamper-evidence outside the database are not documented. | Alert on privileged/financial actions, export audit logs to retained storage, and define retention/access rules. |

### G. Maintainability (G1–G5)

| ID | Criterion and ISO mapping | Rating | Evidence | Problems found | Recommended improvement |
|---|---|---:|---|---|---|
| G1 | **Modularity and separation of concerns** — modularity | 4 | Feature folders (`features/bookings`, `features/admin`, `features/payments`, `features/support`, `features/messaging`), shared `components/ui`, `lib/domain`, `lib/backend`, and shared Edge HTTP helpers; route entrypoints are thin. | The administrator workspace is a large file with several panels; some screens combine data access and presentation. | Split the admin workspace into smaller panels; introduce a thin service layer for data access. |
| G2 | **Type safety and static analysis** — analysability | 4 | TypeScript 5.9 typecheck passes; ESLint passes with 0 errors; mobile ESLint passes; Deno type-checks the Edge Functions in CI; database types are generated. | The mobile app remains JavaScript, so type errors are caught only by lint/tests/runtime; some shapes are inferred rather than generated. | Migrate mobile to TypeScript or JSDoc + `checkJs`; share generated database types with the mobile data layer. |
| G3 | **Testability and automated coverage** — testability | 4 | 20 web unit tests, 15 mobile unit tests, 60 browser tests passed, CI SQL/RLS and persisted workflows passed, route/import checks pass; tests are organized by domain and workflow. | No coverage percentage or threshold; real APK, SMTP, GCash, physical device, availability, and restore paths are not automated. | Add coverage reporting and thresholds; add contract tests for email/payments and a physical-device smoke job. |
| G4 | **Documentation and reusability** — reusability | 4 | 14 documents in `docs/`, including validation, functionality audit, security, deployment, Google SMTP, policy approval, physical-device testing, Android release, and in-app updates; README and route inventory are present. | Some documents contain older counts (for example 44 routes where the current inventory is 45, and 14 mobile tests where the suite now has 15); no architecture decision records. | Update stale counts, add ADRs, and keep a single evidence index per release. |
| G5 | **Build, CI, and change safety** — modifiability | 4 | Static build passes; `check-routes`, `check-imports`, policy check, and typecheck run locally; five GitHub workflows exist; current-commit isolated Supabase CI passed; environment examples and deploy checks exist. | The Cloudflare deploy workflow was not executed; deployment is blocked by policy approval; no staging-to-production promotion or rollback exercise. | Require CI checks on protected branches, add a staging deployment, and rehearse rollback. |

### H. Portability (H1–H4)

| ID | Criterion and ISO mapping | Rating | Evidence | Problems found | Recommended improvement |
|---|---|---:|---|---|---|
| H1 | **Deployment portability** — adaptability | 3 | Next.js static export; `wrangler.jsonc` for Cloudflare Workers; `scripts/deploy-cloudflare.mjs` with explicit confirmation; `.env.production.example`; deployment documentation; export includes 48 `index.html` files. | The hosted Worker is stale and lacks the current headers; no staging environment; deployment cannot complete until policy approval and credentials are supplied; no version marker/rollback test. | Deploy the same artifact to staging and production via CI, add a build/version endpoint, and test rollback. |
| H2 | **Configuration and environment portability** — installability | 4 | Public vs. secret environment separation; `.env.production.example`; `deploy:check` validates site URL, public Supabase values, headers, templates, and policy gate; no service-role key in exported assets. | Operator must still supply the production URL, Supabase values, SMTP credentials, and approved policy contacts; local `.env.production.local` is machine-specific and ignored. | Add startup configuration schema validation and a preflight report that lists every missing operator value. |
| H3 | **Mobile platform portability** - installability | 3 | Expo Android source; minimum Android 7.0 / SDK 24; signed 0.3.1 APK (about 51.2 MB, 53.7 million bytes); earlier emulator install/update/data-retention checks documented; mobile web works; in-app update manifest and signature checks are unit-tested. | No iOS build or test; physical-phone testing remains pending; the APK size is large for constrained networks; no device/OS matrix beyond the emulator. | Build and test iOS if required; test on low-storage/low-RAM Android devices; reduce APK size and document the supported matrix. |
| H4 | **Schema migration and data portability** — replaceability | 3 | All 12 migrations apply from scratch in the isolated CI database; generated database types are produced; schema snapshot exists; money/time formats are explicit; CSV export is available. | No production migration rollout or rollback was exercised; no export/import or restore test; no vendor-exit/portability test. | Rehearse production migrations on staging, add rollback scripts, test a full export/import, and document data ownership. |

---

## 6. Bugs found and fixed during the evaluation

Seven concrete defects were fixed. None required a database migration or a production data change.

| # | Defect | Severity | Root cause | Fix | Verification |
|---:|---|---|---|---|---|
| 1 | Admin commission percentage accepted values above 100% and used peso wording | Medium | `SettingsPanel` passed the `commission` percentage through `pesosToCentavos`, a parser designed for peso amounts. For 0–100% with two decimals the numeric result happens to be the same basis-point value, but the parser accepted values above 100% and produced peso-specific errors. The database range check prevented corrupt values, but the form failed late. | Added `percentToBps()` in `src/lib/domain.ts` with a percentage-specific regex, a 0–100% range, and a clear error. `src/features/admin/workspace.tsx` now uses it. | `tests/domain.test.ts` covers 10 → 1000, 10.5 → 1050, 100 → 10000, 0 → 0, and rejects 100.01, 1000, -1, 1.234, 1e3. Typecheck, lint, 20 web tests, and build pass. |
| 2 | Mobile booking cards showed no provider name | Medium | Booking rows store `provider_id`, not a display name. The mobile list/detail queries selected `bookings.*` and never joined or looked up `provider_profiles.display_name`, while the cards rendered a blank provider field. | Added `withProviderNames()` in `mobile/src/domain.js`; `mobile/src/data/backend.js` now resolves provider names in one `.in()` lookup for lists and one lookup for a booking detail. | New mobile unit test covers a known provider, a missing profile, and preservation of booking IDs. Mobile lint and 15 tests pass. |
| 3 | Support form loaded an unnecessarily broad booking set | Medium | `src/features/support/support.tsx` called `list('bookings')` without a filter. RLS still limited rows, but the query was wasteful and the administrator path loaded all bookings for a dropdown that administrators do not use. | The query is now role-scoped: customers see their own bookings, providers see assigned bookings, and administrators receive an empty list. Case loading remains scoped to the owner. | Typecheck, lint, build, and unchanged public browser tests pass. No authenticated support E2E exists, so this fix is verified by code review and static checks rather than a dedicated browser test. |
| 4 | `/download/` had two `h1` elements | Low | `PageHeading` rendered an `h1` for the page title, and the download hero card rendered a second `h1` for “Take SerbisyoGo with you.” | The card heading is now an `h2` with a `.download-title` class that preserves the original display size and spacing; the page keeps one `h1`. | Static audit now reports exactly one `h1` on 22/22 page/viewport combinations. Desktop and mobile screenshots confirm the visual hierarchy is unchanged. |
| 5 | Public browser test hard-coded APK version `0.1.0` | Low (test defect) | The published release is `0.3.1`, but `tests/e2e/public.spec.ts` asserted a `0.1.0` filename, so a correct application failed the test. | Replaced the literal with a semantic filename guard: `/SerbisyoGo-\d+\.\d+\.\d+\.apk$/`. | Focused public suite passed 8/8; full suite passed 60/60 executed tests. |
| 6 | `check-imports.mjs` crashed on JSON imports | Low (tooling defect) | The audit treated every local import as TypeScript/JavaScript and tried to parse `android-release.json` with Babel. | The check now skips `.json` as well as `.css` imports and still verifies every local TypeScript module and named export. | Reports `Checked 269 local import references; all modules and named exports exist.` |
| 7 | Mobile `boundedFetch` reported caller cancellation as a timeout | Low | Any abort was converted to the timeout message because the code only checked `controller.signal.aborted`, which is also true when the caller cancels. | Added a `timedOut` flag set only by the internal timer; caller cancellation now preserves the original error. | Mobile lint and 15 unit tests pass. A dedicated mobile cancellation test is still recommended; the web equivalent is covered by `tests/http.test.ts`. |

### Defects found but not fixed

These are documented as remaining work rather than silently changed:

- Live Cloudflare Worker is stale and lacks the current security headers (blocked by credentials and policy approval).
- Policies remain draft with placeholder support/DPO contacts (operator decision required).
- Production SMTP is unconfigured and untested (credentials/dashboard access required).
- No Content Security Policy, HSTS, MFA, malware scanning, load test, uptime monitoring, or backup/restore drill.
- Admin lists still use broad queries in places; pagination/server-side filtering is incomplete.
- Physical Android device and iOS were not tested.

---

## 7. Files modified by this evaluation

The following files were changed for the ISO evaluation fixes. The working tree also contains earlier, separate uncommitted policy, SMTP, and deployment work; those files are used as evidence but are not claimed as changes made by this evaluation unless listed here.

| File | Change | Verification |
|---|---|---|
| `src/lib/domain.ts` | Added `percentToBps()` with percentage-specific validation and 0–100% bounds. | Typecheck, lint, 20 unit tests, build. |
| `src/features/admin/workspace.tsx` | Uses `percentToBps()` for `commission_bps` instead of `pesosToCentavos()`. | Typecheck, lint, build; unit coverage of the helper. |
| `tests/domain.test.ts` | Added percentage conversion and invalid-input assertions. | 20/20 web tests pass. |
| `mobile/src/domain.js` | Added `withProviderNames()` to enrich booking rows from provider profiles. | Mobile lint and 15/15 tests pass. |
| `mobile/src/data/backend.js` | Booking list/detail provider-name lookup; timeout-vs-cancellation fix in `boundedFetch`. | Mobile lint and 15/15 tests pass. |
| `mobile/tests/domain.test.mjs` | Added provider-name enrichment test. | Mobile 15/15 tests pass. |
| `src/features/support/support.tsx` | Role-scoped booking dropdown; administrators no longer load bookings for it. | Typecheck, lint, build, public browser tests. |
| `src/features/app-releases/download.tsx` | Demoted the inner download hero heading from `h1` to `h2`. | Static audit 22/22 one `h1`; screenshots. |
| `src/app/theme.css` | Added `.download-title` styling that preserves the original display heading. | Build, screenshots, audit. |
| `src/app/responsive.css` | Preserved the 30 px mobile size for `.download-title`. | Build, screenshots, audit. |
| `tests/e2e/public.spec.ts` | Replaced the stale APK version assertion with a semantic filename guard. | 8/8 focused public tests; 60/60 full executed tests. |
| `scripts/check-imports.mjs` | Skips JSON imports that Babel cannot parse. | 269 local import references verified. |
| `docs/validation.md` | Repaired corrupted policy-check lines and updated the mobile test count from 14 to 15. | `git diff --check` passes; report text is readable. |

Temporary audit harnesses and screenshots live under `.cache/` and are ignored by Git. They are not part of the shipped application.

---

## 8. Test and verification results

### 8.1 Local checks

| Check | Result | Scope and limits |
|---|---|---|
| `npm run typecheck` | **Passed** | Full web TypeScript project. |
| `npm run lint` | **Passed, 0 errors** | Full web ESLint configuration. |
| `npm test` | **20 / 20 passed** | Domain, seed safety, HTTP timeout/cancellation, account fixtures, local inbox. |
| `npm run build` | **Passed** | Next.js 16.4.6 static export; 49 page entries; 48 `index.html` files. |
| `node scripts/check-routes.mjs` | **Passed** | 45 documented route entrypoints verified. |
| `node scripts/check-imports.mjs "$PWD/node_modules"` | **Passed** | 269 local import references; all modules and named exports exist. |
| `npm run policy:check` | **Passed for the draft stage, with 6 warnings** | Correctly warns that the policy is a draft, approval fields are empty, and support/DPO emails are missing; deployment remains blocked. |
| Mobile `npm run lint` | **Passed** | Expo/React Native source. |
| Mobile `npm test` | **15 / 15 passed** | Domain, auth, APK signature, update checks, provider-name enrichment. |
| Full Playwright suite | **60 passed, 30 skipped, 4.8 minutes** | Chrome desktop and Pixel 7 projects. The 30 skips are 24 persisted-workflow cases plus 6 development-readonly cases that require an isolated local Supabase environment. |
| Focused public Playwright suite | **8 / 8 passed** | Desktop and mobile; navigation, private-route denial, overflow, preview table. |

### 8.2 Current-commit CI

GitHub Actions run **43676676245** completed successfully for commit `9220e05` on branch `alpha-gcash-20261115`:

- https://github.com/Jawbear/SerbisyoGo/actions/runs/43676676245

The workflow starts a disposable Supabase stack, applies all 12 migrations, runs the SQL/pgTAP security tests, regenerates database types, type-checks the app, Deno-checks the three Edge Functions, serves the Edge Functions locally, and runs the persisted desktop/mobile workflows. This is the strongest evidence for the backend, RLS, and end-to-end workflow ratings. It does not cover the uncommitted evaluation fixes or production deployment.

### 8.3 Static production audit

The built `out/` directory was served locally on `http://127.0.0.1:4173` with the exported security headers and the same dotted RSC asset resolution used by the hosted Worker.

| Metric | Result |
|---|---|
| Page/viewport combinations | 11 routes × 2 viewports = 22 |
| HTTP 200 | 22 / 22 |
| Horizontal overflow | 0 on every combination |
| Unlabeled form controls | 0 |
| Unnamed buttons/links | 0 |
| One `h1` per page | 22 / 22 after the `/download/` fix |
| JavaScript payload | ~1,452 KB common; ~1,597 KB on `/find/` (uncompressed local transfer) |
| Navigation timing | 117–181 ms on desktop; 122–181 ms on mobile except one 1,401 ms `/find/` outlier |
| Long tasks | 0–1 per page |
| JS heap | ~7.7–42.1 MB across the route sequence |
| Missing alt text | Only decorative brand logo (`alt=""` inside a text link) and OpenStreetMap tiles inside a labelled `role="img"` map; no content image lacked alt text |

### 8.4 Checks that were not run

| Check | Status | Reason |
|---|---|---|
| `npm run test:db` locally | **Not run** | Supabase CLI/Docker is unavailable on this workstation. The same suite passed in CI. |
| Production SMTP delivery | **Not run** | No Google App Password or Supabase dashboard access. |
| Real GCash transfer/settlement/refund | **Not run** | No live wallet or operator authorization; no production data changes were permitted. |
| Physical Android phone | **Not run** | Phone is broken; no Android Studio/emulator installed here. Earlier emulator evidence is documented, not re-executed. |
| iOS build/test | **Not run** | No iOS build target or macOS environment. |
| Cloudflare deployment | **Not run** | No Wrangler login or API token; policy approval gate is closed. |
| Load/stress/soak test | **Not run** | No staging environment or load-test harness. |
| Backup/restore drill | **Not run** | No Supabase backup access or restore environment. |
| Formal WCAG/screen-reader/contrast audit | **Not run** | Only automated structural checks and manual code review were performed. |

---

## 9. Remaining issues and launch blockers

| Priority | Issue | Evidence | Required action |
|---|---|---|---|
| **Launch blocker** | Policies are draft; support and DPO contacts are missing | `policy:check` reports draft version, empty `approvedBy`, empty `approvedAt`, empty support email, empty DPO email; pages show draft banner and `noindex` | Operator supplies business identity, address, support email, DPO email, fee/commission confirmation, and approval identity/date; re-run `policy:check` and `deploy:check`. |
| **Launch blocker** | Production SMTP is unconfigured | No credentials; no real verification/reset email was sent | Configure Google SMTP/App Password in Supabase, set sender/redirects, send test verification and reset messages. |
| **Launch blocker** | Live Cloudflare Worker is stale | Hosted homepage is older than current source; hosted response lacks the headers in `out/_headers` | Redeploy the current approved build; verify HTTPS, headers, auth redirects, and asset resolution. |
| **Launch blocker** | Production database/Edge rollout is unverified | CI passed against a disposable stack; no production `db push` or function deployment was performed | Rehearse on staging, back up, apply migrations, deploy functions, run smoke tests, and record rollback. |
| **High** | Physical Android device and iOS are untested | Phone broken; no emulator here; no iOS target | Complete the device matrix, including install, upgrade, permissions, offline, and large-font behavior. |
| **High** | Real GCash settlement is unverified | Only manual receipt submission/verification code and SQL tests exist | Run a controlled live-wallet pilot with reconciliation and refund cases. |
| **High** | Availability, backup, and restore are unverified | No monitors, SLA history, backup schedule, or restore drill | Add uptime monitoring/status page; document RPO/RTO; run and record a restore drill. |
| **Medium** | Performance/capacity are not proven | 1.45 MB JS; no Lighthouse/CWV/load test; one long `/find/` navigation | Add bundle budgets, Lighthouse/INP checks, and a staging load test. |
| **Medium** | Security hardening is incomplete | No CSP, HSTS, MFA, or malware scanning; hosted headers stale | Add CSP/HSTS, admin MFA, file scanning, dependency/secret scans, and header verification in CI. |
| **Medium** | Admin queries can be broad | Some admin lists load large tables; pagination is incomplete | Add server-side pagination/filtering and review indexes/query plans. |
| **Low** | Documentation drift | Some docs still cite 44 routes / 14 mobile tests | Update counts and keep a release evidence index. |
| **Low** | Mobile is JavaScript-only | No static type checker for mobile source | Migrate to TypeScript or enable `checkJs` with JSDoc. |
| **Low** | No coverage threshold or axe CI | Tests are broad but coverage is not measured; accessibility is structural only | Add coverage reporting and axe-core checks. |

---

## 10. Summary by quality characteristic

### A. Functional Suitability — 3.83 / 5 (Good)

The system implements the complete marketplace journey and the administrator controls needed to operate it. Pricing and state logic are backed by tests, and the current-commit CI exercises persisted booking, messaging, support, administration, and file workflows. The rating is held below 4.5 by the unverified production email and GCash paths and by the manual nature of settlement and refunds. The commission-field fix improved both correctness and operator experience, but it was a validation defect rather than a calculation error for normal 0–100% values.

### B. Performance Efficiency — 3.50 / 5 (Fair to Good)

Static navigation is fast and layout performance is stable across widths, with no overflow and few long tasks. However, the common JavaScript payload is large (~1.45 MB uncompressed in the local audit), no Lighthouse/Core Web Vitals measurement was performed, and capacity is completely unverified. The single 1.4-second mobile `/find/` navigation is probably dominated by external map tiles, but it has not been isolated. B5 is **Not Verified**, so the 3.50 average reflects only the four rated criteria.

### C. Compatibility — 3.75 / 5 (Good)

Responsive behavior is strong from 320 px to 1920 px, and the web/mobile/backend integration is coherent. The main gap is browser coverage: only Chrome was exercised. Firefox, Safari/WebKit, and in-app browsers remain untested, and the hosted Worker is an older build. The system is likely compatible because it uses standard web APIs, but “likely” is not the same as “verified.”

### D. Usability — 3.83 / 5 (Good)

The interface is clear, consistent, and structurally accessible. The audit found no unlabeled controls or unnamed actions, and the duplicate heading defect was fixed. Policy transparency is the weakest usability criterion because the public terms, privacy, and pricing pages still show a draft banner and the support contact is a placeholder. A formal screen-reader, contrast, and WCAG audit is still needed before claiming accessibility conformance.

### E. Reliability — 4.00 / 5 (Good, with important gaps)

The rated reliability criteria are strong: graceful degradation, data integrity, and stability all have concrete evidence. The 4.00 average is **not** a statement that reliability as a whole is proven, because two of the five criteria — availability and recoverability — are **Not Verified**. There is no uptime history, no backup/restore drill, and no incident recovery test. This is the clearest example of why the report separates “rated” from “verified.”

### F. Security — 3.50 / 5 (Fair to Good)

The security architecture is the strongest part of the system: RLS on all 36 tables, a narrow RPC allowlist, empty search paths on security-definer functions, private storage, and isolated CI proof of cross-tenant denial. The rating is lowered by privacy-policy gaps (draft terms, placeholder contacts, no DPO), missing transport hardening (no CSP/HSTS, hosted headers stale), no administrator MFA, no malware scanning, and limited security monitoring. These are deployment and operational gaps, not evidence of a broken authorization model.

### G. Maintainability — 4.00 / 5 (Good)

The codebase is modular, typed on the web, linted on both platforms, documented, and covered by meaningful automated tests. CI passed on the current commit. The main maintainability debt is the JavaScript-only mobile app, the large administrator workspace file, stale counts in some documents, and the absence of coverage thresholds. These are manageable improvements, not structural failures.

### H. Portability — 3.25 / 5 (Fair)

The static export and Cloudflare configuration make the web artifact portable, and migrations apply cleanly from scratch in CI. However, deployment is not reproducible end-to-end without operator credentials and policy approval, the live Worker is stale, iOS is not built, physical-device testing is pending, and no restore/export drill was performed. Portability is therefore the weakest characteristic.

---

## 11. Overall assessment

### 11.1 Computed result

**3.71 / 5 — Good**, based on 38 rated criteria. The three **Not Verified** criteria (B5, E1, E3) are excluded from the average and are not counted as passes.

| Decision | Assessment |
|---|---|
| Academic demonstration | **Suitable.** The system is feature-rich, visually coherent, and supported by substantial test evidence. |
| Controlled pilot with fictional/test data | **Suitable with supervision.** Core flows work and CI proves backend authorization/workflows; operator must avoid real payments until reconciliation is tested. |
| Unsupervised public production launch | **Not yet.** Policy approval, SMTP, hosted redeploy, production migration rollout, physical-device testing, and payment reconciliation are open. |
| High-stakes financial or safety use | **Not suitable without additional controls.** Payments are manual, no escrow/automatic refunds exist, and backup/monitoring/MFA are incomplete. |

### 11.2 Confidence in the assessment

Confidence is **medium**. The functional, maintainability, and structural usability findings are well supported by executed tests and repeated audits. Security authorization has strong isolated CI evidence, but production configuration and hosted rollout were not verified. Performance, availability, recoverability, and capacity have weak or no evidence, which is why they are rated conservatively or marked **Not Verified**.

### 11.3 What would change the result most

1. Closing the policy/SMTP/hosted-deployment launch blockers would raise D5, F3, F5, and H1.
2. A staging load test and Lighthouse/Core Web Vitals run would resolve B1/B5 and improve confidence in B.
3. A backup/restore drill and uptime monitoring would resolve E1/E3.
4. A physical-device and Safari/iOS test pass would raise C1, C2, and H3.
5. Administrator MFA, CSP/HSTS, and malware scanning would raise F5/F6.

No production data, schema, SMTP setting, policy approval, or deployment was changed during this evaluation.

---

## 12. Recommendations for school evaluation

### 12.1 How to present this report

- Present it as a **developer self-assessment**, not a third-party ISO certification. The standard provides the quality model; the 41 criteria and 5–1 ratings are the project's instrument.
- Show both the **computed average (3.71)** and the **three Not Verified criteria**. Do not round up to 4.0 or imply that availability/recoverability passed.
- Use the current-commit CI run and the local test outputs as the primary evidence. The CI run is stronger evidence for backend security/workflows than any screenshot.
- Disclose the production blockers early. A panel is more likely to trust an evaluation that clearly separates “verified,” “partially verified,” and “not verified.”

### 12.2 Suggested 15-minute demonstration sequence

1. **Public site (2 min):** home, services, discovery filters, provider profile, policies, Android download page.
2. **Customer journey (4 min):** register/sign in, request a booking, choose schedule, review price, submit, view booking record.
3. **Provider journey (3 min):** sign in as provider, accept booking, advance state, message the customer.
4. **Administrator journey (4 min):** dashboard, provider verification, booking/transaction review, GCash receipt review (test data only), audit log.
5. **Evidence and limitations (2 min):** show test summary, CI run, static audit, and the launch-blocker table.

### 12.3 Evidence portfolio to submit

| Artifact | Purpose |
|---|---|
| This report | Full 41-criterion assessment and rationale |
| `docs/validation.md` | Historical validation record and known limitations |
| `docs/functionality-audit.md` | Earlier functionality fixes and isolated CI evidence |
| `docs/security.md` | Security design and trust boundary |
| CI run 43676676245 | Current-commit database/RLS/Edge/workflow proof |
| Local test output | 20 web + 15 mobile unit tests, 60 browser tests, build, checks |
| `.cache/iso-audit.json` (ignored) | Per-page DOM/performance audit data |
| Desktop/mobile screenshots | Visual confirmation of branding and the heading fix |

### 12.4 Recommendations for future student batches

- Run the isolated Supabase CI workflow on every branch, not only on `main`, so backend evidence matches the code being demonstrated.
- Keep a single “evidence index” per release with exact commit, commands, outputs, and unverified items.
- Add axe-core and Lighthouse to CI so accessibility and performance do not depend on manual review.
- Never present a skipped test as a pass; label it “not run” with the reason.
- Treat policy approval, SMTP, and deployment credentials as project deliverables, not afterthoughts.
- Add a staging environment and a rollback rehearsal before any public launch.

### 12.5 Suggested checks for the evaluation panel

| Check | How to verify | Expected evidence |
|---|---|---|
| Commission percentage validation | In the admin settings form, enter `100.01`, `1000`, `10.5`, and `10`; save a draft version. | `100.01` and `1000` are rejected in the form; `10.5` becomes 1050 bps; `10` becomes 1000 bps. |
| Mobile provider names | Sign in as a customer with at least one booking and open “My bookings.” | Each card shows the provider display name; a missing profile does not invent a name. |
| Support booking scope | Sign in as customer, provider, and administrator; open `/support/`. | Customer sees own bookings, provider sees assigned bookings, administrator sees no booking dropdown. |
| Download heading structure | Open `/download/` and inspect the DOM. | Exactly one `h1` (“Home care, in your pocket.”); the card heading is an `h2` with the same visual prominence. |
| Public browser suite | Run the focused public Playwright command in Appendix B. | 8/8 pass on desktop and mobile Chrome. |
| Backend security/workflows | Open CI run 43676676245 and inspect the successful database and persisted-workflow stages. | SQL/RLS tests, type generation, Edge checks, and desktop/mobile workflows succeeded. |
| Security headers | Compare `out/_headers` with the response headers from the deployed URL. | The deployed site returns the same four headers; currently it does not because the Worker is stale. |
| Policy gate | Run `npm run policy:check` and open `/terms/`, `/privacy/`, `/pricing/`. | Draft warnings, visible draft banner, `noindex`; deployment is blocked until approval. |

---

## 13. Suggested answers to the five open-ended evaluation questions

> **Disclosure:** these are **recommended, evidence-based answers** prepared for the evaluation instrument. They are not responses collected from customers, providers, administrators, or other respondents. If the instrument's exact wording differs, map these evidence paragraphs to the corresponding questions.

### Q1. What are the strongest qualities of SerbisyoGo?

The strongest qualities are functional completeness and security-by-design. The system covers the full marketplace journey for customers, providers, and administrators, and it enforces authorization in the database rather than relying on the static frontend. All 36 application tables have RLS, writes go through a narrow RPC allowlist, storage is private, and the current-commit isolated CI run passed cross-tenant SQL security and persisted workflow tests. The interface is also responsive from 320 px to 1920 px, keeps a consistent green-and-black identity, and has good structural accessibility. Automated evidence is broad: 20 web unit tests, 15 mobile unit tests, 60 browser tests, and a passing isolated backend CI run.

### Q2. What problems or weaknesses did you find?

Seven concrete defects were found and fixed: the admin commission field used a peso parser, mobile booking cards lacked provider names, the support form over-fetched bookings, `/download/` had two `h1` elements, a browser test hard-coded an old APK version, the import checker crashed on JSON, and mobile timeout handling misclassified caller cancellation. The larger weaknesses are operational: policies are still draft with placeholder contacts, production SMTP is untested, the live Worker is an older build without the current security headers, physical-phone and iOS testing are incomplete, real GCash settlement is unverified, and there is no load, uptime, or backup/restore evidence. These are documented as launch blockers rather than hidden.

### Q3. How well does the system meet the eight ISO/IEC 25010 characteristics?

The computed developer rating is **3.71/5 (Good)** across 38 rated criteria. Reliability and maintainability are the highest at 4.00, followed by functional suitability and usability at 3.83. Performance, security, and compatibility are around 3.5–3.75, and portability is the lowest at 3.25. Three criteria — capacity (B5), availability (E1), and recoverability (E3) — are **Not Verified** and excluded from the average. Security has a strong authorization design and isolated CI proof, but privacy approval, transport hardening, MFA, and monitoring remain incomplete. The rating reflects a system that is strong for demonstration and a controlled pilot but not yet fully production-ready.

### Q4. What improvements were made during the evaluation?

The evaluation fixed the commission percentage validation, added mobile provider-name enrichment, scoped the support booking query by role, removed the duplicate `h1` while preserving the visual design, replaced the stale APK test assertion, fixed the JSON-import audit, and corrected the mobile timeout/cancellation distinction. Each fix was followed by the relevant checks: web typecheck/lint/20 tests/build, mobile lint/15 tests, 60 executed browser tests, route/import checks, policy check, and a 22-page static audit. No production data or database schema was changed.

### Q5. What should be done before the system is used publicly?

Five actions are required: obtain operator approval for the terms, privacy, and pricing pages with real support and DPO contacts; configure and test Google SMTP in Supabase; redeploy the current approved build to Cloudflare and verify the security headers; rehearse and apply production database migrations and Edge Function deployments on staging; and complete physical Android testing. Before accepting real money, run a controlled GCash settlement/reconciliation pilot. Before claiming production reliability, add uptime monitoring, a backup/restore drill, a load test, administrator MFA, CSP/HSTS, and file scanning. Until then, the system should be demonstrated with fictional or test data and described as a controlled pilot, not a fully certified production service.

---

## Appendix A — Static audit detail

Local production export served at `http://127.0.0.1:4173`; Chrome; 1440 × 900 desktop and 390 × 844 mobile; backend calls intercepted with empty fixtures.

| Path | HTTP | `h1` | Overflow | Desktop nav | Mobile nav | Notes |
|---|---:|---:|---:|---:|---:|---|
| `/` | 200 | 1 | 0 | 124 ms | 118 ms | One long task |
| `/find/` | 200 | 1 | 0 | 130 ms | 1,401 ms | External map tiles; 10 flagged images are logo + tiles |
| `/services/` | 200 | 1 | 0 | 141 ms | 133 ms | — |
| `/login/` | 200 | 1 | 0 | 118 ms | 152 ms | Form labelled |
| `/register/` | 200 | 1 | 0 | 166 ms | 139 ms | Form labelled |
| `/support/` | 200 | 1 | 0 | 137 ms | 132 ms | — |
| `/download/` | 200 | 1 | 0 | 169 ms | 153 ms | Duplicate `h1` fixed |
| `/terms/` | 200 | 1 | 0 | 117 ms | 154 ms | Draft banner |
| `/privacy/` | 200 | 1 | 0 | 181 ms | 145 ms | Draft banner |
| `/pricing/` | 200 | 1 | 0 | 132 ms | 122 ms | Draft banner |
| `/preview/?view=admin` | 200 | 1 | 0 | 166 ms | 142 ms | Admin preview |

Aggregate: 22/22 HTTP 200; 0 horizontal overflow; 0 unlabeled controls; 0 unnamed buttons/links; 22/22 one `h1`; 0–1 long tasks; ~1,452 KB common JS (~1,597 KB `/find/`); heap ~7.7–42.1 MB. Timings are local, single-run observations, not field measurements.

## Appendix B — Reproduction commands

```powershell
# Web checks
cd C:\Users\ACER\Desktop\INTREP
npm run typecheck
npm run lint
npm test
npm run build
node scripts/check-routes.mjs
node scripts/check-imports.mjs "$PWD/node_modules"
npm run policy:check

# Mobile checks
cd mobile
npm run lint
npm test

# Browser tests (installed Chrome; local dev server on :3000)
cd ..
$env:E2E_BROWSER_CHANNEL = 'chrome'
npx playwright test --reporter=line --output=.cache/iso-playwright-full
```

The static audit harness is a temporary ignored script (`.cache/iso-audit.mjs`). It serves `out/`, intercepts Supabase calls with empty fixtures, audits 11 routes at two viewports, and writes `.cache/iso-audit.json`. It is not part of the application or the production bundle.

## Appendix C — Evidence artifacts and declaration

| Artifact | Location / reference |
|---|---|
| Current-commit isolated CI | https://github.com/Jawbear/SerbisyoGo/actions/runs/43676676245 |
| Validation history | `docs/validation.md` |
| Functionality audit | `docs/functionality-audit.md` |
| Security design | `docs/security.md` |
| Deployment runbook | `docs/deployment.md` |
| Google SMTP runbook | `docs/google-smtp.md` |
| Policy approval | `docs/policy-approval.md` |
| Physical-device plan | `docs/physical-device-testing.md` |
| Audit data (ignored) | `.cache/iso-audit.json` |
| Screenshots (ignored) | `.cache/download-desktop.png`, `.cache/download-mobile.png` |

**Declaration.** This evaluation did not modify production data, the production database schema, SMTP settings, policy approval records, or the deployed site. The ratings are the evaluator's evidence-based judgments. Items without reliable evidence are marked **Not Verified**, not assumed to pass. The report is suitable as a school/panel self-assessment and as an engineering handover document; it is not a formal ISO/IEC 25010 certification.

