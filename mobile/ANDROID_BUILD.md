# Installable Android APK

The APK build runs through [Build downloadable Android APK](https://github.com/Jawbear/SerbisyoGo/actions/workflows/android-apk.yml). Publication is gated by native compilation, signature verification and an Android emulator installation/navigation check.

## Download and install

The verified [SerbisyoGo 0.1.0 APK](https://github.com/Jawbear/SerbisyoGo/releases/download/android-v0.1.0/SerbisyoGo-0.1.0.apk) is published under [SerbisyoGo Android releases](https://github.com/Jawbear/SerbisyoGo/releases). It uses package `com.serbisyogo.mobile`, version code 1 and Android 7.0+ (API 24). The release includes its SHA-256 checksum and build metadata; the native screenshot is retained in the test workflow artifact.

Download the APK on your laptop or Android phone. To install it, open it on Android and allow installation from the browser/file manager when prompted. Windows can download the file; Android is required to install it. Expo Go, Metro and a running laptop are not required by the installed app. Internet access is required for the connected backend and account features.

Use the checksum on Windows:

```powershell
Get-FileHash .\SerbisyoGo-0.1.0.apk -Algorithm SHA256
```

Compare it with the release's `.sha256` file. The release metadata records the exact source commit, package version, SDK requirement, supported architectures, signing certificate and emulator results.

## Rebuild

An authorized repository maintainer can open the workflow, choose **Run workflow** on `main`, and enable publication after checks. Increment `expo.version` and `android.versionCode` in `app.json` before publishing a different release; the workflow intentionally does not overwrite an existing tag or APK asset.

The workflow installs the locked dependencies, generates the native project with `expo prebuild`, configures the private keystore, runs Gradle `assembleRelease`, and verifies:

- The APK is signed by the expected persistent certificate and is not debuggable.
- The package/version match `app.json`.
- Microphone, external-storage and overlay permissions are absent.
- The JavaScript bundle and ARM64, ARMv7 and x86_64 libraries are embedded.
- Installation, initial launch, discovery navigation and Android Back work on the Android API 35 emulator without Metro.

Only after those checks does it attempt the downloadable GitHub prerelease. The first release's workflow token was denied publication with HTTP 403; the verified artifact was published using the repository owner's existing authorized connection. If a repository policy blocks automatic publication, an authorized maintainer must publish the already verified artifact. Do not replace it with an untested build. The app's additional provider/admin tools remain on the website, and physical-phone checks are separate from emulator verification.

Build evidence: [signed APK build](https://github.com/Jawbear/SerbisyoGo/actions/runs/42993299561) and [successful native test steps](https://github.com/Jawbear/SerbisyoGo/actions/runs/42997067226). Emulator startup was fixed by explicitly setting the SDK/AVD paths, disabling Vulkan, and bounding device waits. Separate build/test jobs retain the APK so native checks can reuse it without recompilation.

## Build settings and signing

GitHub repository variables contain `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and the expected `ANDROID_RELEASE_CERT_SHA256`. Public backend values are intended for the app bundle; server/service-role keys are rejected by the packaging script.

Encrypted repository secrets contain `ANDROID_RELEASE_KEYSTORE`, `ANDROID_RELEASE_PASSWORD` and `ANDROID_RELEASE_ALIAS`. The workflow uses the key only for native signing, removes its temporary runner copy, and publishes no private signing material.

The original local key and credentials are in the ignored `mobile/credentials/` folder. Preserve a secure backup before cleaning/replacing this workspace: updates to installed copies require the same signing identity. Generated native projects and APK build output are also ignored; distribution uses the verified release assets.

References: [Expo APK builds](https://docs.expo.dev/build-reference/apk/), [Expo native release builds](https://docs.expo.dev/guides/local-app-production/) and [GitHub encrypted Actions secrets](https://docs.github.com/en/rest/actions/secrets).
