import { readFileSync } from 'node:fs';
const build = JSON.parse(readFileSync('builds/build-metadata.json', 'utf8'));
if (!build.emulatorSmoke?.hardwareBack) throw new Error('Native installation/navigation checks must pass before publication.');
console.log(`Installable SerbisyoGo Android APK ${build.version} (version code ${build.versionCode}).

- Signed with the persistent private SerbisyoGo release certificate.
- Runs independently of Expo Go, Metro and your laptop.
- Connects to the existing SerbisyoGo backend; internet access is required for accounts and services.
- Android API ${build.minSdk}+; ARM64, ARMv7 and x86_64 libraries are included.
- Verified APK signature, application identity, embedded JavaScript bundle and restricted permission list.
- Installed and launched on an Android API 35 emulator; discovery navigation and Android Back passed without Metro.
- Physical-phone testing remains pending. This initial version includes the connected customer navigation/request milestone; additional provider/admin tools still use the website.

Package: \`${build.packageName}\`
SHA-256: \`${build.sha256}\`
Source: \`${build.sourceCommit}\`

Download the APK asset below. On Android, allow installation from the browser/file manager when prompted. Open SerbisyoGo and use your existing account. The checksum and build metadata are included alongside the APK.
`);
