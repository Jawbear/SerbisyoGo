# Mobile validation record

Checked on 11 November 2026 for the first SerbisyoGo Expo navigation milestone.

| Check | Result | Scope |
| --- | --- | --- |
| `npm test` | 7 passed | Selected provider/service matching, filtering, validation, Manila dates, persistence, duplicate confirmation, failed saves and isolated reset |
| `npm run lint` | Passed | Mobile application and test source |
| `npx expo install --check` | Passed | Installed native packages match Expo SDK 55 |
| `npm run export:web` | Passed | Metro production web bundle |
| `npm run export:android` | Passed | Android JavaScript/Hermes bundle and assets; no APK |
| `npm run test:e2e` | 4 passed, 3 optional live checks skipped | Phone browser navigation, Back, exact selected records, all six core screens, edit/review/save/reload, missing-record recovery and widths 320/375/412/768 |
| Optional live read-only suite | 3 passed in a separate opt-in run | Actual development Customer, Provider and Admin sign-in, verified roles and authorized booking reads; no application-record writes |
| Website regression checks | 20 tests passed; lint and type check passed | Existing web project with the mobile directory excluded from its tooling |

The latest browser screenshots of Home and My Bookings were reviewed after correcting horizontal filter/category sizing. Local browser tests used installed Chrome at a phone viewport, because the in-app browser runtime could not connect. The CI workflow uses bundled Chromium and omits private development credentials.

## Reproduce

Run the commands in [README.md](README.md) from `mobile/`. The default test suite runs offline demo scenarios and skips the three real-account checks. To run those checks separately in the configured development workspace:

```powershell
$env:E2E_MOBILE_LIVE_READONLY = '1'
npx.cmd playwright test tests/e2e/live-readonly.spec.mjs --config playwright.config.mjs
Remove-Item Env:E2E_MOBILE_LIVE_READONLY
```

The opt-in run requires the ignored, matching development-account manifest and public backend configuration. It disables traces, screenshots and video for the credential checks. Do not copy credentials into application source or Snack.

## Remaining device checks

Physical Android/Expo Go, hardware or gesture Back, the on-device keyboard, and an uploaded Expo Snack have not been tested here. No installable APK was built. The Android export verifies bundling only.

Live hosted booking submission was not exercised from this mobile client. The lab demo covers the full request flow using clearly labelled sample data, while the existing backend has separate isolated persisted-workflow tests. Mobile registration/recovery deep links, provider operational controls, admin mutations, messaging and photo editing remain later mobile milestones.
