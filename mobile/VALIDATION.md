# Mobile validation record

Checked on 11 November 2026 after removing the application's demo mode. Earlier demo-only persistence tests were removed together with the local demo store.

| Check | Result | Scope |
| --- | --- | --- |
| `npm test` | 7 passed | Four domain cases plus three certificate-verifier regressions for current Android tool output and unexpected/missing signing keys |
| `npm run lint` | Passed | Mobile application and test source |
| `npx expo install --check` | Passed | Installed native packages match Expo SDK 55 |
| `npm run export:web` | Passed | Metro production web bundle |
| `npm run export:android` | Passed | Android JavaScript/Hermes bundle and assets; no APK |
| Native Gradle APK build | Passed | Signed release APK, package/version, required SDK levels, embedded JavaScript, three native ABIs and blocked-permission checks |
| Android API 35 emulator | Passed | Installed APK, launch without Metro/Expo Go, discovery navigation and Android Back; no application crash |
| Connected browser suite | 9 passed across the main run and focused role run; 3 private checks skipped by default | Selected providers/Back, sign-in return parameters, edit after review reload, server RPC submission, persistence, failed confirmation, missing drafts, failed catalog retry, sign-out privacy and verified role labels |
| Responsive browser checks | Passed: 48 screen/size combinations | All eight screens at 320/375/412/768/1366px and 900×450 landscape; provider grids, scrolling and no document overflow |
| Actual live read-only suite | Customer and Provider passed; Admin credentials rejected | Real development sign-in, server roles and authorized booking reads; no application-record writes. Admin login returned `Invalid login credentials`, so current live Admin verification remains incomplete. |
| Website regression checks | 20 tests passed; lint and type check passed | Existing web project with the mobile directory excluded from its tooling |

Local browser tests use installed Chrome because the in-app browser runtime could not connect. Controlled HTTP fixtures are outside application source and intercept requests made by the actual Supabase client; they are never imported by the app. This checks client behaviour and request wiring, not a hosted database write. CI uses bundled Chromium and omits private development credentials.

Home screenshots at phone and laptop widths were reviewed after adjusting the hero image and provider layout. A test timeout during the earlier 48-reload layout run was addressed by loading each screen once and resizing it across the six sizes. The checks still exercise all 48 combinations. The live and controlled suites now use separate output directories.

## Reproduce

Run the commands in [README.md](README.md) from `mobile/`. The default test suite runs controlled backend scenarios and skips three real-account checks. To run real-account checks separately in the configured development workspace:

```powershell
$env:E2E_MOBILE_LIVE_READONLY = '1'
npx.cmd playwright test tests/e2e/live-readonly.spec.mjs --config playwright.config.mjs
Remove-Item Env:E2E_MOBILE_LIVE_READONLY
```

The opt-in run requires the ignored, matching development-account manifest and public backend configuration. It disables traces, screenshots and video for credential checks and uses a separate results directory. Do not copy credentials into application source or Snack. Rejected credentials must be corrected by the account owner; this implementation did not reset any password.

## Remaining device checks

The signed installable APK is now [published](https://github.com/Jawbear/SerbisyoGo/releases/tag/android-v0.1.0). Android Back was tested on the API 35 emulator; physical-phone/Expo Go behaviour, the physical-device keyboard and an uploaded Snack remain untested. Native check evidence is in [this run](https://github.com/Jawbear/SerbisyoGo/actions/runs/42997067226): native verification passed, while automatic release publication returned HTTP 403. The same checksum-verified artifact was subsequently published using the repository owner's existing authorized connection.

Live hosted booking submission was not exercised from this mobile client. Controlled browser tests cover the connected client's full request flow, while the existing backend has separate isolated persisted-workflow tests. Mobile registration/recovery deep links, provider operational controls, admin mutations, messaging and photo editing remain later mobile milestones. The completed scope is the connected navigation/customer-request milestone, not full website feature parity.
