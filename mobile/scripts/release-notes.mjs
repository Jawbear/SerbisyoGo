import { readFileSync } from 'node:fs';
const build = JSON.parse(readFileSync('builds/build-metadata.json', 'utf8'));
if (!build.emulatorSmoke?.hardwareBack) throw new Error('Native installation/navigation checks must pass before publication.');
console.log(`Installable SerbisyoGo Android APK ${build.version} (version code ${build.versionCode}).

- Signed with the persistent private SerbisyoGo release certificate.
- Runs independently of Expo Go, Metro and your laptop.
- Connects to the existing SerbisyoGo backend; internet access is required for accounts and services.
- Android API ${build.minSdk}+; ARM64, ARMv7 and x86_64 libraries are included.
- Verified APK signature, application identity, embedded JavaScript bundle and restricted permission list.
- Installed and launched on an Android API ${build.emulatorSmoke.api} emulator; discovery navigation and Android Back passed without Metro.
- Includes the connected customer navigation/request flow and the administrator workspace, including protected account editing and permanent deletion controls.
- Includes optional in-app update checks, verified APK downloads with progress, and Android installation confirmation. Install this version once to enable updates from within the app.
- Includes supplied home-service cover photos on Home and service browsing screens, optimized and bundled for offline display.
- Physical-phone testing remains pending. Administrator UI flows are checked in the browser preview; native smoke checks cover startup, discovery navigation and Android Back.

Package: \`${build.packageName}\`
SHA-256: \`${build.sha256}\`
Source: \`${build.sourceCommit}\`

Download the APK asset below. On Android, allow installation from the browser/file manager when prompted. Open SerbisyoGo and use your existing account. The checksum and build metadata are included alongside the APK.
`);
