# Physical Device Testing Plan

## 0.5.6 release acceptance

**Every physical test is pending.** For the reviewed 0.5.6 source at `301eeea2766de8b843dd370622d00ae68cd642fb`, the official package is `com.serbisyogo.mobile`, code 14. QA needs the private, signer-verified artifact and its signed-file digest from release custody. The old local-test APK belongs to an earlier build. [Official release report](release-056-official-android.md)

Use two physical Android phones with test-only data. On phone A, start with the verified production 0.5.4 (code 12) APK, establish a saved item, and preserve the installed app data for the in-place upgrade. On phone B, test a fresh install of the same candidate. Use the restricted production read-only test account only if authorized for that phone. Offline upgrade checks establish data retention. Verify authenticated session restoration while connected under the applicable account and endpoint authorization.

For connected tests, build a separate QA artifact from the reviewed source with explicit staging `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `EXPO_PUBLIC_SITE_URL`. Verify the built bundle's effective endpoints, Auth callback allowlist and the staging website's backend. Restrict device network access to the test endpoints on both Wi-Fi and cellular (including the local mail sink through a private VPN if necessary). Block the production Worker, Supabase project and production updater/feed downloads. Use matching staging baseline/candidate builds on a dedicated phone or work profile for a signed-in upgrade. Record each artifact hash separately. A QA build cannot establish network acceptance for the preserved production-bound APK.

```powershell
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
$candidate = (Get-Item -LiteralPath $env:SG056_SIGNED_APK).FullName
if ($env:SG056_APPROVED_SHA256 -notmatch '^[a-fA-F0-9]{64}$' -or
    (Get-FileHash -LiteralPath $candidate -Algorithm SHA256).Hash -ne $env:SG056_APPROVED_SHA256) { throw 'Candidate differs from the independent signed artifact record' }
adb devices -l
$serial = Read-Host 'Authorized test handset serial'
adb -s $serial shell dumpsys package com.serbisyogo.mobile | Select-String 'versionName|versionCode'
# Only on the isolated offline upgrade phone, with the older signed app installed:
adb -s $serial install -r $candidate
adb -s $serial shell dumpsys package com.serbisyogo.mobile | Select-String 'versionName|versionCode'
```

| Scenario | Steps and pass condition |
| --- | --- |
| Branding and sign-in | Compare the launcher icon, themed icon, black splash and SerbisyoGo wordmark with the approved artwork. Sign in separately with staging customer and provider accounts. Check the expected role, dashboard, sign-out and private-screen access after sign-out. |
| Cold opening and media | On both screens, cold-start with media volume audible, then muted. Record completion time and any visible stalls. Confirm the 5.87-second movie shows the entire green logo and wordmark centered on black. Verify signed-out Login, restored Home, interruption with Back or Home, and no replay during navigation or warm resume. |
| Offline recovery | Open a test booking, disconnect before a second client changes its status, then reopen the app offline. Verify it handles the lost connection without losing the session. Reconnect, retry, and compare the final booking and message IDs with the other client. |
| In-place upgrade | On the baseline, establish a test preference or saved item. On the staging pair, also sign in. Install with `-r`, relaunch, verify code 14, retained state and correct role. Capture the prior and new version. |
| Wi-Fi → cellular → Wi-Fi | Open a staging booking on both clients. Disable Wi-Fi on the phone while the peer sends one uniquely marked message. Confirm recovery on cellular, exactly one message and the same booking status on both devices. Repeat in the opposite direction and inspect persisted rows. |
| Background/session restoration | Sign in on staging, open a booking, press Home and lock the screen. Let the peer update the booking. Resume, then background and force-stop/relaunch. Verify identity, current booking status and message history without signing in again. Sign out and confirm private screens require login. |
| Deep links and reset | With the app cold and warm, open `serbisyogo://bookings/<staging-booking-id>` for an authorized booking. Exercise the native sign-in callback with a designated test identity if staging OAuth is configured. From Forgot password, open the staging sink's email, follow the website callback to `/reset-password/`, save a new password and return to the app to sign in. Verify the old password fails. Exclude tokens and reset links from evidence. |
| Photo uploads | Use a non-personal image. Exercise camera/gallery selection, cancellation and retry after interrupted connectivity. Confirm the authorized profile shows the photo after relaunch and the private object follows its access rules. |
| GCash receipt | Use a watermarked TEST image, synthetic reference and authorized staging manual review. Submit against one test booking. Confirm the payment stays pending until administrator review. Exercise rejection/resubmission and acceptance, then verify one resulting settlement and consistent status across clients. No wallet transfer or real QR payment. |
| Booking, messaging and notifications | Customer creates one request. Provider accepts it on the other device. Keep both views open and verify the live IDs, status, message and recipient notification without a refresh. Test reconnect/catch-up separately. An unrelated test customer/provider must see no private booking, message, receipt or notification. Record in-app delivery separately from OS push. |

Record handset/model, Android/API, baseline and candidate SHA-256, signing certificate, reviewed source SHA, staging ref, role pair, network, UTC time, test booking ID, expected/observed outcome and redacted evidence per row. Mark each **pass**, **fail** or **unverified**. The smoke helper now reads the package from `mobile/app.json`. For 0.5.6 it targets `com.serbisyogo.mobile`. Its launch and navigation results cover only part of this matrix.

SerbisyoGo alpha/beta testing guide for physical Android phones and mobile browsers. Covers the device matrix, test scenarios, network conditions and performance benchmarks relevant to Bunawan, Agusan del Sur users.

## Target device matrix

Common budget Android phones in Philippine provinces. Alpha/beta testers should cover at least one device from each tier.

| Device | Android | Screen | RAM | Tier |
|---|---|---|---|---|
| Samsung Galaxy A15 | 14 | 6.5" 1080p | 4 GB | Mid-budget |
| Samsung Galaxy A05s | 13 | 6.7" 720p | 4 GB | Budget |
| Vivo Y17s | 13 | 6.56" 720p | 4 GB | Budget |
| Vivo Y02s | 12 | 6.51" 720p | 3 GB | Entry |
| Realme C55 | 13 | 6.72" 1080p | 6 GB | Mid-budget |
| Realme C33 | 12 | 6.5" 720p | 3 GB | Entry |
| OPPO A17 | 12 | 6.56" 720p | 4 GB | Budget |
| Xiaomi Redmi 12C | 12 | 6.71" 720p | 3 GB | Entry |
| Cherry Mobile Flare Y7 Pro | 11 | 6.52" 720p | 3 GB | Entry (PH brand) |
| Samsung Galaxy J7 (2017) | 7.0 | 5.5" 720p | 3 GB | Legacy minimum |

> **Minimum supported**: Android 7.0 (API 24) — matches APK `minSdkVersion`.

## Test scenarios

### A. Website on mobile Chrome/browser

All website tests on the live deployment (`https://serbisyogo.sg-team.workers.dev`).

#### Public screens
- [ ] Landing page loads within 3 seconds on LTE
- [ ] Landing page responsive (no horizontal scroll at 320px)
- [ ] Service categories display in compact two-column layout on phone
- [ ] Featured providers display with proper card layout
- [ ] "Find a professional" page loads, categories filter
- [ ] Provider profile page displays with services list
- [ ] Map loads with touch interaction (pinch-zoom, pan)
- [ ] Map attribution visible and linked
- [ ] Download page shows APK info, QR code renders
- [ ] Terms / Privacy / Pricing pages display and scroll
- [ ] Footer links work

#### Authentication
- [ ] Registration form: all fields usable, keyboard doesn't cover inputs
- [ ] Password show/hide toggle works
- [ ] Registration submits, confirmation email arrives
- [ ] Email verification link opens correctly from Gmail/Yahoo app
- [ ] Login with verified account works
- [ ] Login error shows clear message for wrong password
- [ ] Forgot password → recovery email → reset form → save
- [ ] Logout clears session

#### Customer flows
- [ ] Dashboard shows bookings (empty state if new)
- [ ] Booking flow: find → book → schedule → payment → confirm
- [ ] Address form usable on small screens
- [ ] Date/time scheduling picker works on mobile
- [ ] GCash payment option works
- [ ] Booking confirmation with reference number
- [ ] Booking list with status filters
- [ ] Booking detail scrolls properly
- [ ] Invoice displays correctly
- [ ] Review/rating submission
- [ ] Messages: send/receive with Realtime
- [ ] Notifications page
- [ ] Account: edit name, phone, upload photo from camera/gallery
- [ ] Saved addresses: add, edit, delete
- [ ] Support form with file attachment

#### Provider workspace (mobile browser)
- [ ] Provider dashboard loads
- [ ] Accept/decline bookings
- [ ] Job lifecycle: start travel → start work → complete
- [ ] Availability management
- [ ] Profile editor on mobile

#### Admin dashboard (tablet browser recommended)
- [ ] Admin login at `/admin/login/`
- [ ] Operations dashboard with stats
- [ ] DataTable: search, sort, pagination on touch
- [ ] Provider verification, customer management
- [ ] CSV export downloads

### B. Android APK (native app)

#### Installation & startup
- [ ] APK installs from download page QR code
- [ ] APK installs from direct link
- [ ] App opens (cold start < 3 seconds)
- [ ] Correct icon and name on home screen

#### Core navigation
- [ ] Home screen shows discovery
- [ ] Hardware Back button navigates correctly
- [ ] Back from Home exits app
- [ ] Screen rotation maintains state
- [ ] App backgrounded/resumed — session preserved

#### Discovery & booking
- [ ] Category list and filter
- [ ] Provider detail with services
- [ ] Booking form: description, address, schedule
- [ ] Draft save and resume
- [ ] Booking review with server pricing
- [ ] Confirm booking
- [ ] My Bookings with status filter
- [ ] Booking detail view

#### Authentication
- [ ] Sign-in screen loads
- [ ] Login/logout works
- [ ] Error messages clear

#### Resilience
- [ ] Airplane mode: offline message, no crash
- [ ] WiFi → cellular: session survives
- [ ] Low memory: reopens cleanly
- [ ] Battery saver mode: no visual glitch
- [ ] Font scaling (Large/Huge): layout intact
- [ ] TalkBack: critical buttons labeled

#### In-app update
- [ ] Detects newer version
- [ ] Update prompt with version info
- [ ] "Later" dismisses
- [ ] Download progress → install → launch

### C. Network conditions

| Condition | Simulation | Expected |
|---|---|---|
| 4G LTE | Normal | Pages < 3s, Realtime works |
| 3G | Chrome throttle "Slow 3G" | Pages < 8s, loading states |
| Intermittent | Toggle airplane mode | No crash, retry prompts |
| WiFi → cellular | Disable WiFi | Session survives |
| Offline | Airplane mode | Clear offline message |
| Reconnect | Airplane off | Pending actions resume |

### D. Performance benchmarks

| Metric | Target | Tool |
|---|---|---|
| Landing FCP | < 2.0s (4G) | Lighthouse |
| Landing LCP | < 3.0s (4G) | Lighthouse |
| APK cold start | < 3.0s | Stopwatch |
| Scroll FPS | ≥ 45fps | DevTools Performance |
| APK size | < 50 MB | File check |
| Web memory | < 150 MB | DevTools Memory |
| APK memory | < 200 MB | `adb shell dumpsys meminfo` |

## Bug report template

```
**Device**: [model], Android [version]
**App**: Website / APK v[version]
**Network**: WiFi / LTE / 3G
**Steps**:
1. [step]
2. [step]
**Expected**: [what should happen]
**Actual**: [what happened]
**Screenshot**: [attach]
**Crash log**: [logcat if available]
```

## Alpha/beta schedule

| Phase | Duration | Scope | Testers |
|---|---|---|---|
| Internal alpha | 1 week | Core team, 2–3 devices | Developers + stakeholders |
| Closed beta | 2 weeks | 10–15 users in Bunawan | Selected customers + providers |
| Open beta | 2–4 weeks | 50+ users | Community signup |

Complete the full checklist each phase. Fix bugs before advancing.
