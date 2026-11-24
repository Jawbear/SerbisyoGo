# SerbisyoGo — Production Release Checklist (0.5.7)

Current Status: **HOLD / NO-GO** (Production remains on Web Worker `2fe5ecc1-...` / Android `0.5.4` code 12 / Supabase migration `023`)

## 1. 0.5.7 Candidate & Automated Verification Gates
- [x] `release/0.5.7-rc.1` clean at `3e89d7ca1a82dc5658eb7abafde4f6c1c0db7bc6` (`com.serbisyogo.mobile`, `0.5.7`, code `15`)
- [x] `verify-windows-apk.mjs` passes on `SerbisyoGo-0.5.7-unsigned.apk` (`9cb53066f383d9d71182b72ca41b99a00b6965256f56fbeb9b8c4949f67bfaa5`)
- [x] `0.5.7` mobile unit tests (`37/37`), ESLint (`0`), and mobile Playwright E2E (`30 passed, 3 skipped`) pass
- [x] Base web unit tests (`33/33`), `typecheck`, `lint`, `test:db:embedded` (`232/232`), `build` (`54` routes), and Playwright E2E (`92 passed, 38 skipped` via Chrome) pass
- [x] `src/lib/policy-approval.ts` approved (`1.0 (approved)`); `policy:check -- --require-approved` and `deploy:check` pass
- [x] Live signed `0.5.4` verified intact (`cf9baff7...`) and remote tag `android-v0.5.7` confirmed free

## 2. Private Signing & Two-Phone Physical QA Gates
- [x] Policy amendment `SG-POL-SIGN-057-PRIVATE-01` recorded (`PRIVATE_TESTING_SIGNING_POLICY_AMENDMENT.md`)
- [x] Privately signed `SerbisyoGo-0.5.7-signed-private.apk` generated (`ab1b16a43af427c09e810aa86cd5504a8cf6a4e6baaa3a6af51fd784e348c6bd`) matching cert `671506d9e3247ef43ae8d77d17f0a59afc9ba9b26cde855e90456a2a3becfefa` and verified via `verify-signed-057-handoff.mjs`
- [x] `download-copy.patch` applied & `android-release.json` updated to `0.5.7` (`ab1b16a4...`, `code 15`, `source_commit: 3e89d7ca...`) on `release/0.5.7-rc.1`
- [x] Classroom Demo asset (`SerbisyoGo-Classroom-0.5.6.apk`) removed from `android-v0.5.6`; `CLASSROOM_MATCHES_IN_OUT=0`
- [x] GitHub Draft Release `android-v0.5.7` (`457415541`, `draft: true`) created with `SerbisyoGo-0.5.7.apk`, `.sha256`, and `build-metadata.json`
- [x] `0.5.7` website export (`54` routes), `deploy:check`, and `public.spec.ts` + `responsive.spec.ts` (`34/34`) pass
- [ ] Two-phone acceptance (`two-phone-057-acceptance-checklist.md`): **WAIVED / UNVERIFIED** in current run (pending physical devices before public GO)

## 3. Backup, Recovery, Staging & Catalog Gates
- [ ] Production backup/recovery point (`qkopbbxmeqqzomrawltf`): **WAIVED / UNVERIFIED** in current run (`0` managed backups, PITR disabled; required before `024`/`025`)
- [ ] Isolated restore verified (`scripts/verify-storage-recovery.mjs` + `scripts/recovery-manifest.sql`): **WAIVED / UNVERIFIED** in current run
- [ ] `serbisyogo-staging` slot freed/provisioned in `ap-south-1` and hosted acceptance verified
- [ ] At least 1 genuine non-fixture approved provider with active service & availability (or explicit Product sign-off for empty directory after migration `024`)

## 4. Production Rollout Gates (BLOCKED — Schema `023` Incompatible With `0.5.7`)
- [ ] `npx supabase db push --linked` applies `024` & `025` with explicit operator approval (mandatory before activating `0.5.7`!)
- [ ] `main` merge/promotion & Cloudflare Worker deployment (`cloudflare-production`)
- [ ] Publish Draft GitHub Release `457415541` (`android-v0.5.7`) and verify live download (`npm run apk:verify:published`)
