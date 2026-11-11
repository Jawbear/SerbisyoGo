# AI-assisted development record

## Context supplied

The approved system is SerbisyoGo, an existing home-services website with Supabase Auth, provider discovery, drafts, appointments, bookings and private service records. The user confirmed there was **no previous Expo/mobile project**. The supplied Laboratory Exercise 3 requires React Native, Expo-compatible React Navigation stack dependencies, at least four screens, back navigation, accurate parameter passing and documentation of AI-assisted work.

The user requested a development plan, approved six core screens and the existing black-and-green identity, then instructed: “GOOOO PROCCED”. Earlier language/native-stack suggestions were superseded by the instructor's explicit React Native requirement.

## Implementation brief derived from that conversation

> Create the first Expo/React Native client for SerbisyoGo inside the existing repository. Implement Home, Find Professionals, Provider Details, Booking Form, Booking Review and My Bookings with React Navigation native stack. Pass provider/service/draft/booking IDs and show the exact selected records. Keep Back and major-feature shortcuts functional. Reuse the established branding. Provide an offline lab demo and a separate optional Supabase connection, without embedding elevated keys or claiming demo operations are real. Add tests and a face-to-face code-explanation guide.

## AI-assisted work reviewed

- Project configuration and compatible packages, checked against published Snack and Expo SDK 55 metadata.
- Eight modular screens, explicit stack registration and identifier-based route parameters.
- Shared React Native components, theme, loading/error/empty states and phone-sized layouts.
- Pure validation/filtering helpers, queued demo persistence, duplicate-submit handling and isolated demo reset.
- Optional real Supabase sign-in, verified account roles, scoped reads and existing booking RPC wiring.
- Automated domain and phone-browser checks, optional real-development-account read-only checks, and the laboratory guide.

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

## Validation and responsibility

Seven domain/persistence tests and the phone navigation suite validate the lab's data and navigation behaviour. Real customer/provider/admin sign-in and authorized booking reads were also checked using the matching private development fixtures, without changing application records. The exact current results are recorded in `VALIDATION.md`.

The student should inspect `App.js`, screen components, `route.params`, the repository methods and the examples in `LAB_GUIDE.md`, then practise the demonstration and explain each transition. A physical Android/Expo Go check and a transferred Snack check remain separate from browser automation. Live hosted booking writes, native registration/recovery deep links, messaging and photo editing are not represented as completed mobile milestones.
