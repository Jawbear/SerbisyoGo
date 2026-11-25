# SerbisyoGo — Test & Verification Results

Last updated: 2026-11-25

> Every entry below reflects directly observed command output from this workspace. External/hosted checks not executed remain explicitly marked as not run / blocked.

## 1. Official Android 0.5.7 Candidate (`C:\Users\ACER\Desktop\INTREP-0.5.7-rc.1`, `3e89d7ca1a82dc5658eb7abafde4f6c1c0db7bc6`)

| Check | Command / Tool | Result | Details |
| --- | --- | --- | --- |
| 0.5.7 Unsigned APK Verification | `node C:\Users\ACER\Desktop\SerbisyoGo-0.5.7-release-evidence\verify-windows-apk.mjs` | **PASS** | `56,781,979` bytes; SHA-256 `9cb53066f383d9d71182b72ca41b99a00b6965256f56fbeb9b8c4949f67bfaa5`; `com.serbisyogo.mobile` `0.5.7` code `15`; minSdk `24`, targetSdk `36`; ABIs `arm64-v8a`, `armeabi-v7a`, `x86_64`; Hermes v96 (`14,008` strings scanned, 0 secrets); production Supabase config & byte-identical 5.874s intro MP4; confirmed unsigned |
| 0.5.7 Evidence Digest Parity | `Get-FileHash -Algorithm SHA256` | **PASS** | `unsigned-provenance.json` (`616e4396...`), `private-signing-in-place.yml` (`a1ced5fc...`), `candidate-057.bundle` (`06ab8951...`) all match recorded digests |
| 0.5.7 Mobile Unit Tests | `npm --prefix C:\Users\ACER\Desktop\INTREP-0.5.7-rc.1\mobile test` | **PASS** (37/37) | 0 failed, 0 skipped (221 ms) |
| 0.5.7 Mobile ESLint | `npm --prefix C:\Users\ACER\Desktop\INTREP-0.5.7-rc.1\mobile run lint` | **PASS** (exit 0) | Clean |
| 0.5.7 Mobile Web Playwright E2E | `npm --prefix C:\Users\ACER\Desktop\INTREP-0.5.7-rc.1\mobile run test:e2e` | **PASS** (30 passed, 3 skipped) | 3 `live-readonly.spec.mjs` skipped without `E2E_MOBILE_LIVE_READONLY=1` |
| 0.5.7 Private Signed APK | `apksigner` + `aapt` + `zipalign` + `verify-signed-057-handoff.mjs --handoff-sha256` | **PASS (Private Testing)** | `SerbisyoGo-0.5.7-signed-private.apk` (`56,888,574` bytes, SHA-256 `ab1b16a43af427c09e810aa86cd5504a8cf6a4e6baaa3a6af51fd784e348c6bd`), v2/v3 verified with cert `671506d9...`, `com.serbisyogo.mobile`, `0.5.7`, `code 15`, non-debuggable; `adbDevices: []` |
| 0.5.7 Updater Compatibility | `mobile/src/updates/policy.js` (`validateRelease`, `mayPrompt`) | **PASS** | Validated `0.5.4` (`code 12`) → `0.5.7` (`code 15`, `56,888,574` bytes, `ab1b16a4...`, cert `671506d9...`), `null` at `code 15`, rejects mismatched cert/hash/URL |
| Storage Recovery Verifier | `scripts/verify-storage-recovery.mjs` (synthetic 3-bucket self-test) | **PASS** | `Verified 3 buckets and 1 objects including restored SHA-256 values.` |
| 0.5.4 Baseline & Tool Readiness | `node C:\Users\ACER\Desktop\SerbisyoGo-0.5.7-release-evidence\verify-signed-057-handoff.mjs --check-readiness` | **PASS (0 ADB devices)** | Verified `0.5.4` baseline (`cf9baff7...`, cert `671506d9...`), `apksigner.jar`, `aapt.exe`, `zipalign.exe`, `adb.exe` (`adbDevices: []`, `readyForTwoPhoneExecution: false`) |

## 2. Live Production & Rollback Baseline Checks (Read-Only, 2026-11-25)

| Check | Command | Result | Details |
| --- | --- | --- | --- |
| Live Public 0.5.4 APK | `npm run apk:verify:published` | **PASS** | `https://github.com/Jawbear/SerbisyoGo/releases/download/android-v0.5.4/SerbisyoGo-0.5.4.apk` (`55,271,324` bytes, SHA-256 `cf9baff7...`, code `12`, `0.5.4`) |
| Remote Release Tags | `git ls-remote --refs origin "refs/tags/android-v0.5.*"` | **PASS** | `0.5.0`–`0.5.4` and `0.5.6` exist; `android-v0.5.7` does not exist |
| Linked DB Migrations | `npx supabase migration list --linked` | **PASS** | Applied through `202611170023`; pending: `202611190024` & `202611190025` |
| Linked Backups | `npx supabase backups list --project-ref qkopbbxmeqqzomrawltf` | **PASS** (0 backups) | `walg_enabled: true`, `pitr_enabled: false`, `backups: []` |
| Org Project Slots | `npx supabase projects list` | **PASS** | `SerbisyoGo` + `MExam` both `ACTIVE_HEALTHY`; 3 `INACTIVE`; no `serbisyogo-staging` |
| Public Provider Directory | `GET /rest/v1/public_providers` | **PASS** (HTTP 200) | 4 fixture providers returned (`0` non-fixture providers once migration `024` applies) |
| Public Provider Services | `GET /rest/v1/provider_services` | **PASS** (HTTP 200) | 4 active services returned, all owned by the 4 fixture providers (`0` genuine provider listings) |
| Public Categories Catalog | `GET /rest/v1/categories` | **PASS** (HTTP 200) | 6 active categories returned (`Electrical`, `Plumbing`, `Carpentry`, `Appliance repair`, `Air-conditioning`, `General maintenance`) |
| `0.5.7` Website Build & E2E | `typecheck`, `lint`, `build`, `deploy:check`, `public.spec.ts` + `responsive.spec.ts` | **PASS** (54 routes; 34/34 E2E) | Built with `0.5.7` `android-release.json` (`ab1b16a4...`); `out/app-update.json` verified (`code 15`, `cert 671506d9...`); `CLASSROOM_MATCHES_IN_OUT=0`; 34/34 Chrome E2E passed |
| Physical-Phone Acceptance | `adb devices -l` / `two-phone-057-acceptance-checklist.md` | **WAIVED / UNVERIFIED** | Explicitly waived by owner in current run (`0` ADB devices attached; never marked passed) |
| Prod DB Backup & Restore | `supabase backups list --project-ref qkopbbxmeqqzomrawltf` | **WAIVED / UNVERIFIED** | Explicitly waived by owner in current run (`0` managed backups, PITR disabled) |
| `0.5.7` vs Schema `023` Compatibility | Source & SQL inspection (`backend.js`, `024`, `025`) | **INCOMPATIBLE (Blocked)** | `0.5.7` requires `discovery_available_services` (`024`), `set_service_area_pin` (`024`), `accept_booking_quote` (`025`), and `payments`/`gcash_submissions` Realtime (`025`); public `0.5.7` activation held |
| Classroom Demo Asset Removal | GitHub API `DELETE /releases/assets/778453110` | **PASS** | Deleted `SerbisyoGo-Classroom-0.5.6.apk` from `android-v0.5.6` (`0` assets remain); tag & `0.5.4` preserved |
| GitHub Draft `android-v0.5.7` | GitHub API `POST /releases` (`draft: true`) | **PASS (Draft Only)** | Draft ID `457415541` (`SerbisyoGo-0.5.7.apk`, `.sha256`, `build-metadata.json`); invisible publicly (`public057Visible: false`) |
| Live Website & Update Feed | `GET https://serbisyogo.sg-team.workers.dev/` (`/`, `/download/`, `/app-update.json`) | **PASS** (HTTP 200) | `/app-update.json` advertises `0.5.4` (code `12`, cert `671506d9...`, SHA-256 `cf9baff7...`) |
| Docker Desktop | `docker info --format "{{.ServerVersion}}"` | **Not running** | `dockerDesktopLinuxEngine` pipe unavailable |
| Attached ADB Devices | `adb devices -l` | **0 devices** | No physical phones or emulators connected |

## 3. Base Repo Web / DB Baseline (`C:\Users\ACER\Desktop\INTREP`, `release/0.5.6-rc.1`)

| Suite / Gate | Command | Result | Notes / Scope |
| --- | --- | --- | --- |
| Web Unit Tests | `npm test` | **PASS** (33/33) | 0 failed, 0 skipped |
| Web TypeScript & ESLint | `npm run typecheck; npm run lint` | **PASS** (exit 0) | Clean |
| Embedded PostgreSQL / pgTAP | `npm run test:db:embedded` | **PASS** (232/232) | All 25 migrations (`001`–`025`) applied; 0 failures |
| Policy Check (Strict) | `npm run policy:check -- --require-approved` | **PASS** (exit 0) | `1.0 (approved)`, `support@serbisyogo.ph`, `dpo@serbisyogo.ph` |
| Static Build & Preflight | `npm run build; npm run deploy:check` | **PASS** (54/54 routes) | Exported to `out/` |
| Web Playwright E2E | `E2E_BROWSER_CHANNEL=chrome npm run test:e2e` | **PASS** (92 passed, 38 skipped) | 32 `workflows.spec.ts` skipped (needs local `TEST_SUPABASE_URL`), 6 `development-readonly.spec.ts` skipped |
| Mobile Unit / Lint / E2E | `npm --prefix mobile test; lint; test:e2e` | **PASS** | 37/37 unit, lint 0, 30 passed / 3 skipped E2E |
