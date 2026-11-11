# Android in-app updates

Version 0.3.0 introduces the native updater. Users of 0.1.0 or 0.2.0 must install this release once over their existing app. They do not need to uninstall. Those older APKs cannot gain native updater functionality from a server change.

The app checks for updates at launch and at most every six hours when returning to the foreground. It compares Android version codes, rather than version strings. The optional prompt offers Download and Later; Later suppresses that version's automatic reminder for one day. Users can continue using all existing screens. Home → App updates also provides a manual check, retry and installation screen. Update checks do not require sign-in and a failed check does not block normal app use.

The app reads `/app-update.json` from the production website, derived from the verified download metadata. If the site has no newer update, it checks the public GitHub release feed and verified build metadata. This lets users discover a published APK before the next website deployment. No repository token, service key or signing credential is bundled.

The APK downloads into a private cache with progress and cancellation. The native module restricts download and redirect hosts, bounds the transfer size and time, and verifies size, SHA-256, package name, exact newer version code, non-debuggable status and the pinned signing certificate. It verifies again before installation. Partial or invalid files cannot be installed through the updater.

Android may require the user to allow installations from SerbisyoGo. The app opens the per-app Android settings page when needed. After allowing this, the user returns and taps Install update. Android presents its normal installation confirmation; the app does not silently install packages. A protected FileProvider exposes only the private update cache to the installer. No external-storage permission is needed.

The persistent release certificate and package name allow an in-place upgrade that retains local app data. Server-side bookings and accounts remain in the same backend. Cancelled downloads, permission denial and cancelled installation leave the installed version usable. Device policy, available storage and OS compatibility can still prevent installation; users can retry or download from the website.

## Publishing future updates

Increment `expo.version`, `android.versionCode`, and the package/lock versions. Build and publish the signed APK through `android-apk.yml` with the existing release key. The public release must include the signed APK, checksum and verified `build-metadata.json`. Once published, the app can discover it through the release feed. Update `src/features/app-releases/android-release.json` from the verified release and deploy the website to refresh its download and fast update endpoint.

The pipeline also builds a lower-version fixture for its disposable emulator. That fixture is never a published APK asset. After publication, the emulator exercises the real update prompt, Later, download, verification, Android settings permission, installation confirmation, version upgrade and retention of a private-data sentinel. It adds the results to the release metadata. Physical-phone verification remains a separate check.
