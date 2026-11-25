# SerbisyoGo — Test Results & Verification Evidence

Last updated: 2026-11-25
Branch: `release/0.5.6-rc.1` (base `4f3d766` + uncommitted RC2/submission/test changes)

> Rule: Only directly observed command outputs and file artifacts are recorded here. Never fabricate or extrapolate results.

## 1. Directly Observed Local Verification (2026-11-25)

| Check | Command | Result | Scope & Notes |
| --- | --- | --- | --- |
| Web Unit Tests | `npm.cmd test` | **33 passed, 0 failed** (duration 541ms) | `domain`, `development-seed`, `http`, `development-accounts`, `local-inbox`, `account-audit`, `cors`, `deployment-readiness`, `release-controls`, `upload-stream`, `public-information` |
| Web TypeScript | `npm.cmd run typecheck` | **Passed (0 errors)** | `tsc --noEmit` |
| Web ESLint | `npm.cmd run lint` | **Passed (0 errors)** | `eslint .` |
| Embedded PostgreSQL DB Tests | `npm.cmd run test:db:embedded` | **232 assertions passed, 0 failed** | All 25 migrations (`001`–`025`) + 8 pgTAP test files (`account_identity`, `admin_accounts`, `backend_grants`, `discovery`, `gcash`, `payment_recipient`, `provider_credentials`, `security`, `trust_badges`) |
| Mobile Unit Tests | `npm.cmd --prefix mobile test` | **37 passed, 0 failed** (duration 190ms) | `domain`, `auth`, `apk-signature`, `updates`, `lab4`, `opening` |
| Mobile ESLint | `npm.cmd --prefix mobile run lint` | **Passed (0 errors)** | `eslint App.js index.js src tests scripts` |
| Git Whitespace Check | `git diff --check` | **Passed (0 errors)** | Working tree clean of whitespace/conflict markers |
| Production Static Build | `npm.cmd run build` | *Pending current run* | `next build --webpack` |
| Playwright E2E Suite | `npm.cmd run test:e2e` | *Pending current run* | Desktop + mobile browser checks |

## 2. Prior Recorded Verification & Known Gaps (From Project Docs)
- **Official Android 0.5.6 Inspection Build (`docs/release-056-official-android.md`, 2026-11-22)**:
  - Unsigned local inspection APK at `.cache/official-056/SerbisyoGo-0.5.6-unsigned.apk` (`com.serbisyogo.mobile`, code 14, 56,781,947 bytes, SHA-256 `3e15bef3e7d79b99519dbe2aa718a8896e886801ac9c2fe90516a097635f7d99`).
  - **Gap**: Unsigned; production release requires protected `android-signing` workflow build and physical-device acceptance.
- **Physical Device Testing (`docs/physical-device-testing.md`)**:
  - **Status**: **Pending / Unverified** (no Android handset attached via ADB).
- **Hosted Staging & Production Backup (`docs/release-056-execution-2026-11-20.md`, `docs/release-056-recovery.md`)**:
  - **Staging**: Blocked on Supabase Free-tier 2-project limit (`SerbisyoGo` + `MExam` active).
  - **Backup/Recovery**: Supabase reported 0 managed backups and PITR disabled on `qkopbbxmeqqzomrawltf`; production restore is **UNVERIFIED**.
  - **Cloudflare Branch Preview**: Build `33ddd961-1906-408e-b4ca-84b5d4d5d2dd` on `release/0.5.6-rc.1` failed; log access returned HTTP 403.
