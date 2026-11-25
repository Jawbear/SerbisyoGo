# SerbisyoGo — Session Handover

Last updated: 2026-11-25
Primary Target Official Release: **Android 0.5.7** (`release/0.5.7-rc.1`, APK source commit `3e89d7ca1a82dc5658eb7abafde4f6c1c0db7bc6`)
Evidence Packet: `C:\Users\ACER\Desktop\SerbisyoGo-0.5.7-release-evidence`
Production decision status: **NO-GO / HELD ON 0.5.4** (0.5.7 requires migrations 024 & 025; physical-phone testing & production backup are **WAIVED / UNVERIFIED** in this run)

## 1. Release & Draft Status
- **GitHub Draft Release (`android-v0.5.7`)**: Draft ID `457415541` (`draft: true`, `prerelease: false`, invisible publicly) containing `SerbisyoGo-0.5.7.apk` (`56,888,574` bytes, SHA-256 `ab1b16a43af427c09e810aa86cd5504a8cf6a4e6baaa3a6af51fd784e348c6bd`), `SerbisyoGo-0.5.7.apk.sha256`, and `build-metadata.json`.
- **Classroom Demo Removal**: Deleted obsolete `SerbisyoGo-Classroom-0.5.6.apk` (`778453110`) from `android-v0.5.6` (`0` assets remaining; tag & `0.5.4` preserved). Zero `classroom` references remain in `src/`, `mobile/src/`, `public/`, or the `0.5.7` static export `out/`.
- **Public Rollback Preserved**: Live website `https://serbisyogo.sg-team.workers.dev/` and `android-v0.5.4` (`55,271,324` bytes, SHA-256 `cf9baff788ded72f82c0e4a542a32455614355e548f32c42d680189c4adbb506`, `code 12`) remain active and untouched.

## 2. Phase 5 Database Compatibility Finding (Critical Blocker)
Production (`qkopbbxmeqqzomrawltf`) is at **migration `023`**. `0.5.7` is **NOT** fully compatible with schema `023`:
- `discovery_available_services` (`mobile/src/data/backend.js`, `FindScreen.js`) requires **migration `024`**.
- `set_service_area_pin` & `service_latitude`/`service_longitude` require **migration `024`**.
- `accept_booking_quote` (`mobile/src/data/backend.js`, `BookingActions.js`) requires **migration `025`**.
- `notify_message_recipient` trigger and `payments`/`gcash_submissions` Realtime require **migration `025`** (`conversations.js` has fallbacks for `conversation_inbox` and `read_through_message`, but not quote acceptance or date availability).

## 3. Waived / Unverified Checks & Remaining Blockers
1. **Physical-Phone Acceptance**: **WAIVED / UNVERIFIED** in this run (`0` ADB devices attached).
2. **Production Database Backup & Isolated Restore**: **WAIVED / UNVERIFIED** in this run (`0` managed backups, PITR disabled on `qkopbbxmeqqzomrawltf`).
3. **Production Migrations `024` & `025`**: Unapplied (awaiting Data Owner backup + migration approval).
4. **Supabase Staging Slot & Genuine Provider**: `SerbisyoGo` + `MExam` occupy 2/2 active slots; live `public_providers` has `0` genuine non-fixture providers.
5. **Public Cutover**: Do NOT publish draft release `457415541`, merge to `main`, or deploy Cloudflare Worker until migrations `024`/`025` are applied and final GO is authorized.
