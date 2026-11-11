# SerbisyoGo mobile

React Native/Expo client for the existing SerbisyoGo home-services system. It opens directly with the shared Supabase backend. There is no demo mode, sample catalog, local-only booking system or mode switch in the shipped application.

The signed [SerbisyoGo 0.1.0 APK](https://github.com/Jawbear/SerbisyoGo/releases/download/android-v0.1.0/SerbisyoGo-0.1.0.apk) is available for Android 7.0+. It passed signature, installation, launch, discovery navigation and Android Back checks on an Android API 35 emulator without Metro. See [Android build and installation details](ANDROID_BUILD.md).

## Run on your laptop

From `C:\Users\ACER\Desktop\INTREP`:

```powershell
cd mobile
npm.cmd ci
npm.cmd run web
```

Open the address printed by Expo, normally **http://localhost:8081**. Keep the terminal running. Chrome/Edge device emulation (`F12`, then `Ctrl+Shift+M`) lets you view phone widths without a phone. Existing dependencies are already installed in this workspace, so `npm.cmd ci` is only needed on a fresh installation.

The interface uses a single column on phones, two-column provider cards on wider screens, bounded content on laptops, safe-area insets and scrollable forms. The application also allows device rotation. Browser responsiveness does not establish physical-device behaviour.

## Backend configuration

Copy `.env.example` to `.env.local` and supply only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. This workspace is already configured privately with the website's public project values. Never place a service-role/secret key or account password in the bundle. Missing configuration shows an explicit connection error; it never substitutes sample data.

Anyone can browse public professionals and services. Existing accounts sign in through Supabase Auth. The server verifies active account status and assigns the Customer, Provider or Admin label. Private bookings require sign-in. Customer requests use the existing backend functions:

`available_slots` → `save_booking_draft` → `draft_price` → `confirm_booking`.

Prices and appointments come from the server. A successful confirmation is required before displaying a saved booking. A failed request remains recoverable on the current screen. Sign-out removes private records from the visible UI.

## Screens and parameters

| Screen | Purpose | Parameters |
| --- | --- | --- |
| Home | Public discovery, account access, main shortcuts | None |
| FindProfessionals | Search and category filtering | Optional `categoryId` |
| ProviderDetails | Selected professional and services | `providerId` |
| BookingForm | Task, address and available appointment | `providerId`, `serviceId`, optional `draftId` |
| BookingReview | Saved draft and server-calculated total | `draftId` |
| MyBookings | Authorized requests and status filters | Optional saved `bookingId` |
| BookingRecord | Private request details | `bookingId` |
| SignIn | Existing-account authentication | Allowlisted `returnTo`, identifier-only `routeParams` |

`App.js` registers an explicit React Navigation native stack with screen titles and Back navigation. Destinations resolve identifiers through the backend. Invalid, mismatched or inaccessible records have recovery actions. Successful submission resets history to Home → MyBookings to avoid returning to a submitted form.

## Phone and Snack

Run `npm.cmd start` and scan the QR code with an [Expo Go client compatible with SDK 55](https://expo.dev/go). No phone is needed for the laptop browser preview. Android Studio/SDK is needed for local native builds or an emulator.

For Snack, select SDK 55, copy `App.js`, `snack.config.js`, `src/` and `assets/`, and add the packages in `snack-dependencies.json`. Configure the **public** backend URL/key in `snack.config.js`; the real connection is required. Snack supplies its own registration wrapper and core React/Expo packages. Compatibility was checked against [Snack's SDK metadata](https://github.com/expo/snack/blob/main/packages/snack-content/src/sdks/index.ts) and [Expo SDK 55 package versions](https://github.com/expo/expo/blob/sdk-55/packages/expo/bundledNativeModules.json). No Snack was published here.

## Validation and scope

```powershell
npm.cmd test
npm.cmd run lint
npx.cmd expo install --check
npm.cmd run export:web
npm.cmd run export:android
npm.cmd run test:e2e
```

Controlled browser tests intercept backend HTTP calls while exercising the real application, authentication client and booking RPC wiring. Fixtures exist only under `tests/`; they are not an application mode. Separate opt-in tests check actual development accounts without creating hosted bookings. See [VALIDATION.md](VALIDATION.md) for exact results and limits.

This completes the connected navigation/customer-request milestone. Provider operations, admin management, registration/recovery, messaging and profile editing still use the existing website; mobile parity for those features is separate work. Physical-phone validation remains pending. The downloadable APK comes from the native Gradle build; `export:android` alone produces a JavaScript/Hermes bundle.

See the [evaluation guide](LAB_GUIDE.md) and [AI development record](AI_DEVELOPMENT.md).
