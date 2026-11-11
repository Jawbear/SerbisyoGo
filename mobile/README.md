# SerbisyoGo mobile — Laboratory Exercise 3

The first Expo/React Native client for the existing SerbisyoGo home-services system. It uses the website's black-and-green identity and shares its Supabase contracts. There was no earlier Expo project to import; this extends the approved system rather than claiming to extend an earlier mobile codebase.

## Run locally

Node 22.13+ is required. From the INTREP folder:

```powershell
cd mobile
npm.cmd ci
npm.cmd start
```

Scan the QR code with an **Expo Go build compatible with SDK 55** on an Android phone on the same network. Obtain the matching client from [Expo's official download page](https://expo.dev/go). Android Studio is optional for a physical-phone Expo Go demonstration. It is required, together with the Android SDK, for local native builds/emulation.

For the browser preview:

```powershell
npm.cmd run web
```

The app starts in **Lab demo**. Five labelled sample professionals, sample schedules and an example PHP 50 booking fee support the entire navigation exercise without authentication or network access after the app/assets have loaded. Demo drafts and requests persist through AsyncStorage on the current device. They are never sent to a provider and do not represent payment or accepted appointments.

## Screens and route parameters

| Screen | Purpose | Parameters |
| --- | --- | --- |
| Home | Entry point, categories, major features, demo/live selection | None |
| FindProfessionals | Search and service-category filtering | Optional `categoryId` |
| ProviderDetails | Show the exact selected provider and their services | `providerId` |
| BookingForm | Task, address, date and available appointment selection | `providerId`, `serviceId`, optional `draftId` |
| BookingReview | Reload the saved draft, professional, schedule and total | `draftId` |
| MyBookings | Show persisted requests and status filters | Optional newly saved `bookingId` |
| BookingRecord | Reopen the selected saved request | `bookingId` |
| SignIn | Existing live-account authentication | Allowlisted `returnTo`, identifier-only `routeParams` |

The first six screens form the main laboratory flow. BookingRecord and SignIn are additional functional screens. `NavigationContainer` and `createNativeStackNavigator` in `App.js` provide stack history, titles and back navigation. The bottom shortcuts use the same stack navigator; they do not replace it with a tab-only implementation.

Only identifiers travel in route parameters. Screens resolve those identifiers through the active repository. A provider/service mismatch or inaccessible record shows a recovery action instead of a blank screen. After submission, the stack resets to Home → MyBookings so Back does not return to an already-submitted form.

## Expo Snack compatibility

Checked on 11 November 2026. Expo's [published Snack SDK list](https://github.com/expo/snack/blob/main/packages/snack-content/src/sdks/index.ts) includes stable SDK 55. Native packages match Expo's [SDK 55 bundled versions](https://github.com/expo/expo/blob/sdk-55/packages/expo/bundledNativeModules.json); `expo install --check` passes locally. The project deliberately has no Expo Router dependency: the exercise uses React Navigation's explicit stack API.

To transfer the implementation into your own Snack:

1. Create a blank Snack and select **SDK 55**. Check its SDK picker and matching Expo Go client before the classroom demo.
2. Copy `App.js`, `snack.config.js`, the `src/` files and both `assets/` images into the same relative paths. Snack uses `App.js` as its entry point; its runtime supplies the registration wrapper.
3. Add the dependencies listed in `snack-dependencies.json` through Snack's dependency editor. Keep Snack's supplied React/React Native/Expo core versions.
4. Keep `snack.config.js` blank for the complete lab demonstration, then test all six core screens.

No Snack was uploaded or published on the user's behalf. The local project and compatibility check do not establish that a particular hosted Snack or physical Android phone has been tested.

## Optional live Supabase mode

Copy `.env.example` to `.env.local` inside `mobile/` and set **only** the project URL and publishable key. The current workspace has been configured privately with the website's public project values. No service-role/secret key, fixture password or admin credential is bundled in the app.

In Snack, optional public values belong in `snack.config.js`; never paste elevated credentials. Select **Use live services** on Home. Existing accounts can sign in, see their server-assigned Customer/Provider/Admin label, browse public services and read authorized booking records. Customer booking requests use:

`available_slots` → `save_booking_draft` → `draft_price` → `confirm_booking`.

The server supplies prices, validates appointments, checks ownership and prevents duplicate confirmation. There is no fallback from a failed live operation to a fake successful demo request. Live mode requires an active customer account to submit a customer request. Provider operational controls, mobile admin mutations, mobile registration/recovery deep links, messaging and photo editing are future mobile milestones; the existing website still supplies those features.

Private reads and existing-account sign-in have been tested through the mobile web preview against the designated development project. Mobile live booking writes have not been submitted to the hosted project by this implementation. Backend persisted workflows have their own isolated tests in the main project.

## Checks

```powershell
npm.cmd test
npm.cmd run lint
npx.cmd expo install --check
npm.cmd run export:web
npm.cmd run export:android
npm.cmd run test:e2e
```

The browser suite uses installed Chrome locally and bundled Chromium in CI. It verifies correct provider parameters, category/search filtering, Back, draft editing, acknowledgement, saved requests after reload, missing-record recovery and phone-width layouts. The optional `E2E_MOBILE_LIVE_READONLY=1` suite uses the matching ignored development fixture manifest; traces/screenshots/video are disabled for those real-credential checks.

`export:android` checks the Android JavaScript/module bundle. It does **not** produce a signed or installable APK. Physical Android/Expo Go behaviour, including hardware Back and the on-device keyboard, remains a manual check on the instructor's chosen device.

See [the face-to-face demonstration guide](LAB_GUIDE.md) and [AI development documentation](AI_DEVELOPMENT.md).
