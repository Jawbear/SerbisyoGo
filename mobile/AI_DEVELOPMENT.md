# AI-assisted development record

## Context supplied

The approved system is SerbisyoGo, an existing home-services website with Supabase Auth, provider discovery, drafts, appointments, bookings and private service records. The user confirmed there was **no previous Expo/mobile project**. The supplied Laboratory Exercise 3 requires React Native, Expo-compatible React Navigation stack dependencies, at least four screens, back navigation, accurate parameter passing and documentation of AI-assisted work.

The user requested a development plan, approved six core screens and the existing black-and-green identity, then instructed: “GOOOO PROCCED”. Earlier language/native-stack suggestions were superseded by the instructor's explicit React Native requirement.

## Implementation brief derived from that conversation

> Create the first Expo/React Native client for SerbisyoGo inside the existing repository. Implement Home, Find Professionals, Provider Details, Booking Form, Booking Review and My Bookings with React Navigation native stack. Pass provider/service/draft/booking IDs and show the exact selected records. Keep Back and major-feature shortcuts functional. Reuse the established branding. Add tests and a face-to-face code-explanation guide.

The initial assistant implementation added a separate offline demonstration mode. The user then clarified: “dont do demo lab cause this is final output” and asked whether the mobile app was responsive. The final implementation removes that mode entirely and connects directly to the actual backend. Controlled test records remain only in test fixtures; no sample-data fallback ships in the app.

## AI-assisted work reviewed

- Project configuration and compatible packages, checked against published Snack and Expo SDK 55 metadata.
- Eight modular screens, explicit stack registration and identifier-based route parameters.
- Shared React Native components, theme, loading/error/empty states and phone-sized layouts.
- Pure validation/filtering helpers and server-backed draft/booking persistence with duplicate-submit protection.
- Direct Supabase sign-in, verified account roles, account-scoped query state and existing booking RPC wiring.
- Responsive single/two-column discovery, a laptop hero layout and all-screen width checks.
- Automated domain and connected-client browser checks, optional real-development-account read-only checks, and the evaluation guide.

No Kotlin/Java project, WebView wrapper, native APK or signing key was fabricated. This is a React Native/Expo project with a real navigation implementation.

## Encountered issues and fixes

| Issue | Diagnosis and response |
| --- | --- |
| npm registry lookup blocked | The restricted environment denied network/cache access. Package lookups/installation were retried with permitted access; website dependencies remain separate. |
| Expo could not create its user settings folder | The first export returned `EPERM` for `.expo` under the user profile. Retried with permission for Expo's standard settings. |
| Mobile lint initially flagged a browser-only test global | Scoped `document` to browser tests, while retaining normal application lint checks. |
| Auth request-counter cleanup warning | Moved counter invalidation into a stable callback; late responses cannot restore a stale session after mode changes/sign-out. |
| Horizontal filters expanded too tall | Screenshot review found horizontal ScrollViews stretching vertically. Constrained filter strips/category rows and rechecked phone layouts. |
| In-app browser connection unavailable | Used the repository's Playwright checks with installed Chrome. This validates the web preview, not physical Android behaviour. |
| Test fixture callback named `use` triggered React hook lint | Renamed it to `provideFixture`, preserving the React hook rule for application code. |
| Service-error test remained loading during automatic retries | Disabled automatic PostgREST retries for screen requests. The bounded fetch timeout and visible manual retry action now control recovery. |
| Laptop hero cropped the professional's face | Used side-by-side text/image on wider screens while preserving the stacked phone layout. |

## Validation and responsibility

Domain tests and the connected-client browser suite validate record selection, authentication return navigation, editing, booking RPC submission, error recovery, sign-out privacy and responsive layouts. Browser fixtures intercept HTTP calls outside application source; they do not create a demo mode. Separate real customer/provider/admin sign-in and authorized booking reads use matching private development fixtures, without changing application records. The exact results and limits are recorded in `VALIDATION.md`.

The student should inspect `App.js`, screen components, `route.params`, the repository methods and the examples in `LAB_GUIDE.md`, then practise the demonstration and explain each transition. A physical Android/Expo Go check and a transferred Snack check remain separate from browser automation. Live hosted booking writes, native registration/recovery deep links, messaging and photo editing are not represented as completed mobile milestones.
