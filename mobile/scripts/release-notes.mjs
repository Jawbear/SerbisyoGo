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
- Adds mobile account registration, verification-email resend and password recovery requests using the shared website accounts.
- Adds How It Works, For Clients, For Workers, FAQ and Contact guides, with the same content as the website.
- Shows separate administrator-reviewed identity and skills badges; uploads alone do not award either badge.
- Provider verification accepts any one listed ID or credential for administrator review. Extra documents are optional; portfolio photos are supporting evidence.
- Adds booking conversations, provider status/quotation actions and private GCash receipt submission after service completion. GCash payments require independent administrator wallet verification on the website.
- Removes the mobile administrator workspace; account CRUD and administration are available on the website.
- Includes optional in-app update checks, verified APK downloads with progress, and Android installation confirmation. Install this version once to enable updates from within the app.
- Includes supplied home-service cover photos on Home and service browsing screens, optimized and bundled for offline display.
- Physical-phone, actual email delivery and real GCash-transfer testing remain pending. Native smoke checks cover startup, discovery navigation and Android Back.

Package: \`${build.packageName}\`
SHA-256: \`${build.sha256}\`
Source: \`${build.sourceCommit}\`

Download the APK asset below. On Android, allow installation from the browser/file manager when prompted. Open SerbisyoGo and use your existing account. The checksum and build metadata are included alongside the APK.
`);
