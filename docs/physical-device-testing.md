# Physical Device Testing Plan

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
