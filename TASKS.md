# SerbisyoGo — Remaining Tasks & Priorities

Last updated: 2026-11-25
Primary Target: **Android 0.5.7** (`release/0.5.7-rc.1`, commit `3e89d7ca1a82dc5658eb7abafde4f6c1c0db7bc6`)

## Completed Local Verification (2026-11-25)
- [x] Verified `SerbisyoGo-0.5.7-unsigned.apk` (`9cb53066...`) and all evidence hashes (`verify-windows-apk.mjs`, `Get-FileHash`).
- [x] Verified `0.5.7` mobile unit tests (`37/37`), ESLint, and mobile web E2E (`30 passed, 3 skipped`).
- [x] Confirmed remote `android-v0.5.7` tag does not exist and signed `0.5.4` (`cf9baff7...`) remains live publicly.
- [x] Confirmed live production Supabase (`qkopbbxmeqqzomrawltf`) is on migration `023`, `0` managed backups, PITR disabled, 2/2 Free org slots occupied, and 4 fixture providers in `public_providers`.
- [x] Prepared `SG-POL-SIGN-057-PRIVATE-01`, privately signed `SerbisyoGo-0.5.7-signed-private.apk` (`ab1b16a43af427c09e810aa86cd5504a8cf6a4e6baaa3a6af51fd784e348c6bd`, cert `671506d9...`), and verified via `verify-signed-057-handoff.mjs`.
- [x] Prepared `verify-signed-057-handoff.mjs`, `two-phone-057-acceptance-checklist.md`, `recovery-and-onboarding-readiness.md`, `provider-and-empty-launch-decision.md`, and `website-cutover-and-rollback-checklist.md`.

- [x] Removed obsolete `SerbisyoGo-Classroom-0.5.6.apk` asset from `android-v0.5.6` (`0` assets remaining); verified `0` classroom refs in `0.5.7` source & `out/`.
- [x] Created private GitHub **draft** release `android-v0.5.7` (`457415541`, `draft: true`) with `SerbisyoGo-0.5.7.apk` (`ab1b16a4...`), `.sha256`, and `build-metadata.json`.
- [x] Verified `0.5.7` website build (`54` routes), `deploy:check`, `out/app-update.json`, and `public`/`responsive` E2E (`34/34`).
- [x] Audited `0.5.7` vs production schema `023`: **incompatible** (`024` & `025` required for `discovery_available_services`, `set_service_area_pin`, `accept_booking_quote`, and payment Realtime), so public `0.5.7` remains **HELD** and `0.5.4` remains active.

## Priority 1 — Waived Checks & Database Compatibility Gate (Before Public 0.5.7 Activation)
1. **Two-Phone Physical QA (`WAIVED / UNVERIFIED` in current run)**:
   - Attach Phone A (baseline `0.5.4` customer) and Phone B (provider) via ADB and execute `two-phone-057-acceptance-checklist.md` using `SerbisyoGo-0.5.7-signed-private.apk`.
2. **Production Backup, Isolated Restore & Migrations `024`/`025` (`WAIVED / UNVERIFIED` in current run)**:
   - Mandatory before activating `0.5.7` publicly because production is on `023` and `0.5.7` calls `024`/`025` RPCs.

## Priority 2 — Recovery, Staging, Onboarding & Web Cutover (Operator-Blocked)
3. **Production Backup & Isolated Restore**:
   - Run `readonly-inventory.sql` on `qkopbbxmeqqzomrawltf`, execute an authorized logical + Storage export, and verify isolated restore + timings for `024` & `025`.
4. **Supabase Staging Slot**:
   - Free or upgrade a project slot (`SerbisyoGo` + `MExam` occupy both active slots) to provision `serbisyogo-staging` and run hosted acceptance tests.
5. **Genuine Provider Onboarding**:
   - Onboard at least 1 genuine non-fixture provider (consent, 1 credential, admin approval, active service, availability) or record explicit Product approval for empty-directory launch after `024`.
6. **Cloudflare Preview & Production Cutover (After Gates 1–5 Pass)**:
   - Investigate Cloudflare build `33ddd961-...` HTTP 403 error, apply `download-copy.patch` + signed `0.5.7` `android-release.json` metadata when authorized, push migrations `024` & `025`, deploy Worker, and publish `android-v0.5.7`.
