# Android releases

## Latest: Android 0.3.0

[Download APK 0.3.0](https://github.com/Jawbear/SerbisyoGo/releases/download/android-v0.3.0/SerbisyoGo-0.3.0.apk). Version code 3; Android 7.0+; ARM64, ARMv7 and x86_64; 53,270,004 bytes. SHA-256: `a890549596168493698d9a42e867ea7e29c4cf1e32a1f756734cf69d0664548b`. Built locally from `e657a09be781df20f2035c29515eced511b93765` using the existing release certificate.

Native startup/navigation and an actual in-app upgrade from a lower-version test fixture passed on the dedicated Android 15 emulator, including download verification, installation permission, Android confirmation and retained private data. Release metadata and screenshots accompany the APK. Physical-phone testing remains pending. Install this updater-enabled version once over 0.1.0/0.2.0 without uninstalling; future verified versions can be downloaded and installed from inside the app.

## Earlier: Android 0.1.0

Published on 11 November 2026: [Download SerbisyoGo APK](https://github.com/Jawbear/SerbisyoGo/releases/download/android-v0.1.0/SerbisyoGo-0.1.0.apk).

| Property | Verified value |
| --- | --- |
| Package | `com.serbisyogo.mobile` |
| Version / code | `0.1.0` / `1` |
| Minimum Android | 7.0, API 24 |
| Target SDK | 36 |
| Architectures | ARM64, ARMv7, x86_64 |
| Bytes | 53,131,314 |
| SHA-256 | `27ac454e9b8dd73da685c97d961b7bdc2a67bfb812a9cebf1f22eca5c00df799` |
| Source commit | `909093b98c632aa2401799643e752b657968bfbc` |

The native build passed Android signature, package/version, non-debuggable, permission, embedded-bundle and ABI checks. The same artifact was independently checksum-checked and its binary manifest read locally. On the Android API 35 emulator it installed, opened without Metro/Expo Go, navigated to discovery and returned with Android Back without an application crash. [Native check steps](https://github.com/Jawbear/SerbisyoGo/actions/runs/42997067226) passed; that run's release publication step was denied HTTP 403. The exact verified bytes were subsequently published using the owner's existing authorized repository connection. Physical-phone testing remains pending.

## Website change

`src/features/app-releases/android-release.json` pins the actual published download and checksum. The download page renders it immediately, including when the optional database release lookup is unavailable. A newer verified private-storage release retains the existing expiring-link workflow. The home-page Android CTA now points to the available app, and the public APK QR code encodes its stable release URL.

The current app includes connected account sign-in, discovery, service requests and saved records. Additional mobile provider/admin management still uses the website. No server key or private signing credential is included in the APK or website.

## Verification

- Website: 20 Node tests, TypeScript, ESLint and production static export passed.
- Relevant public desktop/mobile navigation, access and layout cases passed; four focused download cases passed on desktop/mobile.
- The download test verifies GitHub's stored asset size and SHA-256, clicks the actual website link and checks the real download filename/URL. It then cancels duplicate 53 MB transfers. Earlier attempts to await complete browser transfers exceeded the 120-second test deadline; completion of those browser transfers is not claimed.
- Mobile: seven unit checks and the native APK/emulator checks passed. Existing connected-client browser coverage is recorded in `mobile/VALIDATION.md`.

The public GitHub release includes its checksum and metadata. The original signing key remains private in ignored `mobile/credentials/` and encrypted repository secrets. Keep its backup for future application updates.
# Android 0.2.0 — administrator workspace

Released on November 11, 2026 from source `2848e5608b4972145946288b6db8a01619bde6bc`.

- Download: https://github.com/Jawbear/SerbisyoGo/releases/download/android-v0.2.0/SerbisyoGo-0.2.0.apk
- Version code: 2; package: `com.serbisyogo.mobile`; minimum Android: 7.0.
- Size: 53,255,608 bytes.
- SHA-256: `7d89ff3b0ac049a3ebf1606be5ea94402f5838ecea562d5ed9b49d31b7055ce9`.
- Uses the existing private release certificate, allowing upgrades from 0.1.0.
- Build, signature verification, emulator installation/startup, discovery navigation, Android Back and publication passed in [run 43022959821](https://github.com/Jawbear/SerbisyoGo/actions/runs/43022959821).
- Admin account editing, deletion confirmation, incomplete-deletion retry and customer denial passed mobile browser checks. Physical-phone testing remains pending.

