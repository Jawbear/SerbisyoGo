# Installable Android APK

The Android workflow is manually disabled during the release hold. Once reviewed and enabled by the owner, dispatch a build on `main` with `publish_release=false`, the full `reviewed_sha` and an empty `artifact_run_id`. After `android-signing` approval, the workflow compiles, verifies and emulator-tests the APK. Save that successful run's ID, source SHA, certificate and APK digest. A separate publication run on main requires `publish_release=true`, `artifact_run_id`, the full `reviewed_sha` and recorded approval for `android-production`. It downloads the emulator-tested artifact, checks its source, checksum and signer, and publishes those bytes. [Android workflow](../.github/workflows/android-apk.yml) · [0.5.6 release gates](../docs/release-056-staging.md)

## Download and install

### Test the Android opening locally

Android shows its existing system splash first. The custom intro then plays the supplied portrait movie on black. A verified account opens Home, which selects the provider workspace for providers. Signed-out users reach Sign in and can select **Browse as guest** to open the existing onboarding or public home. An explicit deep link keeps its destination. Back skips the movie. Leaving the app closes the player, and returning to the same process continues startup. A fresh process can play the movie again.

The source is `logo/LOGO ANIMATION/SerbisyoGoAnimation.mp4`. The local Expo module packages a 720 × 1280 H.264/AAC derivative with the complete reveal and fade at 1.7× tempo. The player uses its normal rate. It uses the platform media player, media volume and audio focus. Silent and vibrate mode mute the soundtrack at playback start. The 5.9-second clip has a 15-second startup/playback deadline. Android also releases the player on completion, decoder failure, dismissal or an activity interruption.

The local debug APK includes its JavaScript bundle and movie. It runs offline and installs alongside the ordinary app under `com.serbisyogo.mobile.introdebug`. From `mobile`, run these commands with one emulator or USB-debugging device connected and `adb` on PATH. With multiple devices, add `-s SERIAL` to each adb command.

```powershell
adb install -r builds/local-test/SerbisyoGo-0.5.6-loopback-debug.apk
adb shell am force-stop com.serbisyogo.mobile.introdebug
adb shell am start -n com.serbisyogo.mobile.introdebug/com.serbisyogo.mobile.MainActivity
```

1. Let the film finish. On first use Android can show its system full-screen tip. Tap **Got it**. Check that the full logo and wordmark fit the screen, the media volume keys control the sound, and Sign in appears. Select **Browse as guest** and navigate back and forth to check for replay.
2. Cold-start again and press Android Back during the film. Repeat with Home during playback, then reopen the app. The movie should stop in both cases. Inspect the completion reason with `adb logcat -d -s SerbisyoGoIntro:I`.
3. To test a cold deep link, force-stop the app, then run `adb shell am start -a android.intent.action.VIEW -d serbisyogo://find -p com.serbisyogo.mobile.introdebug`. The Find screen should appear after playback.
4. Forward the isolated backend port with `adb reverse tcp:54321 tcp:54321`. Use a customer or provider from the same disposable project used to build the client. Sign in, force-stop, and reopen to check the role-specific home screen.

With the Expo native project generated, Java 17 and the Android SDK configured, run `powershell -File scripts/build-local-debug.ps1 -StagingDirectory <prepared-project>` from `mobile`. That workspace must have a loopback config from `scripts/prepare-local-integration.mjs`. Add `-Offline` when Gradle dependencies are cached. The script bundles JavaScript, disables public update checks and uses the local debug key. The output is `android/app/build/outputs/apk/debug/app-debug.apk`.

The custom Android build includes the native player. Expo Go exercises the fallback route. The 0.5.6 production decision remains **NO-GO**.

**Earlier debug build evidence (original film).** The debug-signed 0.5.6 APK (code 14, ARM64 and x86_64) has SHA-256 `d0da8be3e6da147b184f28f70017cb1bef09e32705c2f1301aaab4af7b9bdd97`. On an API 35 emulator at 720 × 1600, the packaged app played offline through the final wordmark. Checks covered normal completion, Back, background and resume, guest navigation without replay, a cold Find link, and customer and provider sessions restored against loopback authentication fixtures. Android reported active media playback during the film. A separate malformed-media test reached Find through the decoder-error callback. One emulator run hit the 15-second fallback while repeatedly inspecting the UI during playback. A repeat monitored native playback events and verified natural completion before checking Find. Physical-device listening and release acceptance remain outstanding.

| Changed mobile files | Purpose |
| --- | --- |
| `App.js`, `src/opening.js` | Start playback once the root has laid out, keep authentication and deep links active, and resolve the ordinary launch destination. |
| `src/screens/SignInScreen.js`, `src/updates/UpdateContext.js` | Keep guest browsing available from startup sign-in and defer the update prompt until the movie closes. |
| `modules/serbisyogo-intro/package.json`, `expo-module.config.json`, `android/build.gradle`, `android/src/main/AndroidManifest.xml` | Register and build the Android-only local Expo module. |
| `SerbisyoGoIntroModule.kt`, `res/raw/serbisyogo_opening.mp4` in that module | Play the short film with Android's media player, handle the system bars and audio, and release playback on each exit path. |
| `tests/opening.test.mjs`, `package.json` | Check master and packaged film digests and startup route selection in the mobile unit suite. |
| `scripts/smoke-android.mjs`, `scripts/smoke-update.mjs` | Check native preparation and completion, exercise Back during playback, and recognize startup sign-in after an upgrade. |
| `ANDROID_BUILD.md` | Document installation, test cases and local evidence. |

### Published Android builds

The website's Android download page identifies the verified release and its checksum. The application uses package `com.serbisyogo.mobile` and supports Android 7.0+ (API 24). Published APKs and their verification metadata are available in [SerbisyoGo Android releases](https://github.com/Jawbear/SerbisyoGo/releases).

Download the APK on your laptop or Android phone. To install it, open it on Android and allow installation from the browser/file manager when prompted. Windows can download the file; Android is required to install it. Expo Go, Metro and a running laptop are not required by the installed app. Internet access is required for the connected backend and account features.

To check a downloaded APK on Windows, substitute its filename in this command.

```powershell
Get-FileHash -LiteralPath '.\SerbisyoGo-0.5.6.apk' -Algorithm SHA256
```

Compare it with the release's `.sha256` file. The release metadata records the exact source commit, package version, SDK requirement, supported architectures, signing certificate and emulator results.

## Local development and testing

From `mobile`, install with `npm ci`, copy `.env.example` to `.env.local`, and set the Supabase URL and publishable key for your test environment. Use JDK 17 and the Android SDK with an API 35 or later emulator or a USB debugging-enabled test phone. With the device listed by `adb devices`, use `npm run android` to install the development build. Native sessions migrate to Android Keystore-backed storage on their first read.

Local checks are `npm test`, `npm run lint` and `npm run export:android`. The Expo export produces a JavaScript bundle. To produce a standalone, signed APK locally, use the same signing environment and SDK paths as the workflow. Run these PowerShell commands from `mobile` with `adb` and the JDK tools on PATH:

```powershell
npx expo prebuild --platform android --no-install
node --env-file=.env.local scripts/prepare-android-release.mjs
Push-Location android
.\gradlew.bat :app:assembleRelease --max-workers=2 "-PreactNativeArchitectures=arm64-v8a,armeabi-v7a,x86_64"
Pop-Location
$env:SERBISYOGO_APK_OUTPUT_DIR = "builds/local-test"
node scripts/verify-apk.mjs
node scripts/smoke-android.mjs
```

The final two commands write the APK, checksum, metadata and emulator evidence to `builds/local-test`. Use a dedicated Android emulator for the smoke script. The release workflow uses `builds` by default.

## Rebuild

An authorized repository maintainer can open the workflow, choose **Run workflow** on `main`, and enable publication after checks. Increment `expo.version` and `android.versionCode` in `app.json` before publishing a different release; the workflow intentionally does not overwrite an existing tag or APK asset.

The workflow installs the locked dependencies, generates the native project with `expo prebuild`, configures the private keystore, runs Gradle `assembleRelease`, and verifies:

- The APK is signed by the expected persistent certificate and is not debuggable.
- The package/version match `app.json`.
- Microphone, external-storage and overlay permissions are absent.
- The JavaScript bundle and ARM64, ARMv7 and x86_64 libraries are embedded.
- Installation, initial launch, discovery navigation and Android Back work on the Android API 35 emulator without Metro.

Only after those checks does it attempt the downloadable GitHub prerelease. The first release's workflow token was denied publication with HTTP 403; the verified artifact was published using the repository owner's existing authorized connection. If a repository policy blocks automatic publication, an authorized maintainer must publish the already verified artifact. Do not replace it with an untested build. The native app includes a provider workspace. Administration uses the website. Physical-phone acceptance is tracked separately.

Build evidence: [signed APK build](https://github.com/Jawbear/SerbisyoGo/actions/runs/42993299561) and [successful native test steps](https://github.com/Jawbear/SerbisyoGo/actions/runs/42997067226). Emulator startup was fixed by explicitly setting the SDK/AVD paths, disabling Vulkan, and bounding device waits. Separate build/test jobs retain the APK so native checks can reuse it without recompilation.

## Build settings and signing

GitHub repository variables contain `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and the expected `ANDROID_RELEASE_CERT_SHA256`. Public backend values are intended for the app bundle; server/service-role keys are rejected by the packaging script.

Store `ANDROID_RELEASE_KEYSTORE`, `ANDROID_RELEASE_PASSWORD` and `ANDROID_RELEASE_ALIAS` in the protected `android-signing` environment. The signing job uses the key for native signing and removes its temporary runner copy. The separate verification jobs use the public certificate fingerprint in `ANDROID_RELEASE_CERT_SHA256`.

The original local key and credentials are in the ignored `mobile/credentials/` folder. Preserve a secure backup before cleaning/replacing this workspace: updates to installed copies require the same signing identity. Generated native projects and APK build output are also ignored; distribution uses the verified release assets.

References: [Expo APK builds](https://docs.expo.dev/build-reference/apk/), [Expo native release builds](https://docs.expo.dev/guides/local-app-production/) and [GitHub encrypted Actions secrets](https://docs.github.com/en/rest/actions/secrets).
