# SerbisyoGo — Development Progress

Last updated: 2026-11-25
Primary Official Release Branch: `release/0.5.7-rc.1` (`3e89d7ca1a82dc5658eb7abafde4f6c1c0db7bc6` in `C:\Users\ACER\Desktop\INTREP-0.5.7-rc.1`)
Evidence Packet: `C:\Users\ACER\Desktop\SerbisyoGo-0.5.7-release-evidence`

## Verified Completed Milestones

### 1. Android 0.5.7 Official Release Candidate (`release/0.5.7-rc.1`)
- Built private unsigned `0.5.7` APK (`com.serbisyogo.mobile`, versionCode `15`) via temporary Windows drive-alias pathing (`windows-tool-paths.init.gradle`), resolving the Desktop long-path Win32 error 5 issue without modifying tracked source.
- Verified APK integrity via `verify-windows-apk.mjs` (`56,781,979` bytes, SHA-256 `9cb53066f383d9d71182b72ca41b99a00b6965256f56fbeb9b8c4949f67bfaa5`, Hermes v96, 14,008 strings scanned with 0 secrets, production Supabase URL/public key matching `0.5.4`, byte-identical 5.874s intro MP4).
- Verified `0.5.7` mobile test suite (`37/37` unit tests), ESLint (`0` errors), and mobile Playwright E2E (`30` passed, `3` skipped).
- Removed obsolete `SerbisyoGo-Classroom-0.5.6.apk` asset from `android-v0.5.6` (`0` assets remain; tag & `0.5.4` preserved) and created private GitHub draft release `android-v0.5.7` (`457415541`, `draft: true`) with `SerbisyoGo-0.5.7.apk`, `.sha256`, and `build-metadata.json`.
- Applied `download-copy.patch`, updated `android-release.json` to `0.5.7` (`ab1b16a4...`, `code 15`) on `release/0.5.7-rc.1`, and verified `54`-route build, `deploy:check`, `out/app-update.json`, `CLASSROOM_MATCHES_IN_OUT=0`, and `34/34` `public`/`responsive` E2E tests.
- Completed schema compatibility audit: `0.5.7` requires pending migrations `024` & `025` (`discovery_available_services`, `set_service_area_pin`, `accept_booking_quote`, `payments`/`gcash_submissions` Realtime); public `0.5.4` remains active while physical-phone QA and production DB backup remain **WAIVED / UNVERIFIED** in this run.

### 2. Core Web Marketplace & Supabase Backend (`src/`, `supabase/`)
- Static export (`54` routes in `out/`), strict policy approval (`1.0 (approved)`), deployment readiness (`npm run deploy:check`), web unit tests (`33/33`), TypeScript/ESLint, Playwright E2E (`92` passed, `38` skipped with Chrome channel), and embedded PostgreSQL pgTAP (`232/232` assertions across migrations `001`–`025`) all verified passing.
- Verified live production Supabase (`qkopbbxmeqqzomrawltf`) remains untouched at migration `023`, and verified signed `0.5.4` remains live publicly at `android-v0.5.4` (`55,271,324` bytes, SHA-256 `cf9baff7...`).

### 3. Persistent Continuation System
- Maintained `AGENTS.md`, `MASTER_PROMPT.md`, `PROGRESS.md`, `TASKS.md`, `HANDOVER.md`, `TEST_RESULTS.md`, and `RELEASE_CHECKLIST.md` in `C:\Users\ACER\Desktop\INTREP`, plus `CONTINUATION_STATUS.md` in `C:\Users\ACER\Desktop\SerbisyoGo-0.5.7-release-evidence`.

## 2026-11-25 Finalization Run (Phases 1-3)

### Verified in this run
- **Live baseline (browser-rendered, not curl HTML):** `https://serbisyogo.sg-team.workers.dev/download/` shows the `Classroom demo v0.5.6` card, a `Download classroom APK` button, and the official `0.5.4` `Download APK` button. The live `/app-update.json` still advertises `0.5.4` (code `12`, SHA-256 `cf9baff7...`).
- **PR #3:** head `0ffeee0`, mergeable, no branch protection on `main`. GitHub checks: `build` success, `database` success, Copilot success, `deploy` skipped, `Workers Builds: serbisyogo` failure. `node --test tests/release-controls.test.mjs` passes `2/2` locally.
- **PR #3 merge simulation:** clean merge into `phase1/cleanup-20261125` at `1880e0a` (no conflicts).
- **PR #2 merge simulation:** one conflict in `src/features/app-releases/download.tsx`; resolved in favor of PR #2's final download page. Final merge `11d1dc4` on `phase2/release-20261125`. `src/`, `public/`, `mobile/src/` contain **zero** Classroom references.
- **Signed 0.5.7 APK re-verified:** `56,888,574` bytes, SHA-256 `ab1b16a43af427c09e810aa86cd5504a8cf6a4e6baaa3a6af51fd784e348c6bd`, package `com.serbisyogo.mobile`, version `0.5.7` / code `15`, minSdk `24`, targetSdk `36`, ABIs `arm64-v8a`/`armeabi-v7a`/`x86_64`, zipaligned, v2/v3 signatures, cert `671506d9e3247ef43ae8d77d17f0a59afc9ba9b26cde855e90456a2a3becfefa`. `verify-signed-057-handoff.mjs` passed.
- **Draft release 457415541:** draft, tag `android-v0.5.7`, target `3e89d7c...`; APK asset matches the verified signed APK; `build-metadata.json` asset matches the local draft metadata.
- **Emulator smoke passed** on `serbisyogo-local` (API 35, x86_64) against the signed APK: installed, opened Home without Metro, onboarding/restart, discovery navigation, hardware Back, rotation, public guides. Evidence in `SerbisyoGo-0.5.7-release-evidence\emulator` with screenshots.
- **Cloudflare Worker history:** every recorded deployment is `source: wrangler` by `joverarocha@gmail.com`; no Workers Builds deployment is recorded. The Cloudflare Workers Builds integration is still installed and triggered a failed build for PR #3, so it must be disconnected or confirmed non-deploying before `main` is pushed.
- **Phase 2 validation (merged PR #2 tree `11d1dc4`):** web tests `33/33`, `tsc --noEmit` pass, ESLint pass, production build pass; mobile tests `37/37`, mobile ESLint pass. Built `out/` contains **zero** Classroom references, one official APK URL (`android-v0.5.7/SerbisyoGo-0.5.7.apk`), and a built `app-update.json` for `0.5.7` (code `15`, SHA-256 `ab1b16a4...`). Browser-rendered local export shows exactly one `Download for Android` button, zero Classroom matches, version `0.5.7`.
- **Production Supabase backup (read-only):** via a temporary CLI login role and `pg_dump` in Docker, wrote `production-public.sql` (`321,482` bytes; schema+data for all `38` public tables; SHA-256 `92aece9691163c8dc7b29c5106c3f850f20f6fdb15210460a79efdb456d4e41a`), `production-auth.sql` (`158,203` bytes; `27` auth tables; SHA-256 `b0406a69f8bbf0135ad1ff808e8c4d7cf060de03571510265511d408b033f914`), `production-storage-data.sql` (`18,832` bytes; `3` buckets / `15` objects; SHA-256 `419586b7f32ef5cfdc075a18e93be21784b4815614de94a30b409fd3865c38b1`), and `production-migrations.sql` (`161,000` bytes; SHA-256 `99753e77b86afe8fd4eb92f74193b85bd1ee6c5b905586039a5fa2bb9967defa`). Evidence: `SerbisyoGo-0.5.7-release-evidence\production-backup-20261125`.
- **Production data snapshot:** `35` auth users, `35` profiles, `36` bookings, `62` messages, `36` payments, `36` conversations, `15` files; public `686` rows across `38` tables, auth `392` rows across `27` tables, storage `99` rows across `3` tables.
- **Isolated restore verified:** public dump restored into a fresh Postgres 17 database with all `38/38` table counts matching exactly; auth dump restored with all `27/27` table counts matching (`35` users). Storage metadata counts match.
- **Migrations 024/025 validated against the restored production copy:** both applied cleanly (`ON_ERROR_STOP=1`), all `38` public table counts remained unchanged, and `service_latitude`/`service_longitude`, `public_service_point_valid`, `set_service_area_pin`, `marketplace_account`, `discovery_available_services`, `accept_booking_quote`, `read_through_message`, `notify_message_recipient`, `conversation_inbox`, `messages_conversation_recent_idx`, `notify_new_message`, and Realtime membership for `payments`/`gcash_submissions` were verified. Existing provider pins remain null (`0/10`).
- **GitHub deploy guard:** `cloudflare-production` environment created with required reviewer `Jawbear` and a `main`-only deployment branch policy. `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` secrets are **still missing** (only Android signing secrets exist).
- **Supabase CLI:** production project `qkopbbxmeqqzomrawltf` linked; migration list confirms remote is at `202611170023` and `024`/`025` (plus `026`/`027` on the separate QA branch) are not applied.

### Remaining mandatory gates
1. Owner disconnects or suspends the Cloudflare Workers Builds Git integration (it still triggered a failed PR #3 build and cannot be managed with the current API token).
2. Owner adds `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets; the `cloudflare-production` environment now enforces reviewer + `main` branch.
3. Owner approves applying migrations `024`/`025` to production (backup, isolated restore, and compatibility validation are complete).
4. Physical Android device acceptance (currently `0` ADB devices; emulator only).
5. Publish release `457415541` with final `build-metadata.json` (including `emulatorSmoke`/`inAppUpdate`), then run the real in-app update check.
6. Update `android-release.json` `published_at` from the actual GitHub `published_at`, merge, and deploy through the guarded workflow.
7. Live verification: one official APK button, no Classroom references, live `app-update.json` 0.5.7, actual APK SHA-256, Android upgrade path.

### Current worktrees
- `C:\Users\ACER\Desktop\INTREP-finalize` — `phase1/cleanup-20261125` (PR #3) and `phase2/release-20261125` (PR #2 merged, conflict resolved).
- `C:\Users\ACER\Desktop\INTREP-pr3` — detached PR #3 test worktree.
- `C:\Users\ACER\Desktop\INTREP-0.5.7-rc.1` — original release branch worktree.
