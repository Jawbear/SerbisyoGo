import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const appJsonPath = resolve(root, 'mobile/app.json');
if (!existsSync(appJsonPath)) throw new Error('mobile/app.json not found');

const appJson = JSON.parse(readFileSync(appJsonPath, 'utf8'));
const version = appJson.expo.version;
const versionCode = appJson.expo.android?.versionCode || 5;

console.log(`Current App Version: v${version} (build ${versionCode})`);

const apkSource = resolve(root, 'mobile/android/app/build/outputs/apk/release/app-release.apk');
const buildsDir = resolve(root, 'mobile/builds');
const apkDest = resolve(buildsDir, `SerbisyoGo-${version}.apk`);

if (existsSync(apkSource)) {
  if (!existsSync(buildsDir)) mkdirSync(buildsDir, { recursive: true });
  copyFileSync(apkSource, apkDest);
  console.log(`Copied APK to: ${apkDest}`);

  const buffer = readFileSync(apkDest);
  const hash = createHash('sha256').update(buffer).digest('hex');
  const size = buffer.length;

  console.log(`Size: ${(size / 1048576).toFixed(2)} MB (${size} bytes)`);
  console.log(`SHA-256: ${hash}`);

  // Write sha256 checksum file
  writeFileSync(`${apkDest}.sha256`, `${hash}  SerbisyoGo-${version}.apk\n`);

  // Update android-release.json
  const releasePath = resolve(root, 'src/features/app-releases/android-release.json');
  const releaseData = {
    version_name: version,
    version_code: versionCode,
    min_android: '7.0',
    published_at: new Date().toISOString(),
    byte_size: size,
    sha256: hash,
    release_notes: `SerbisyoGo v${version} release. Includes Google Sign-in layout, unique username validation, password security requirements, messages auto-scroll, and scannable GCash QR code payment.`,
    download_url: `https://github.com/Jawbear/SerbisyoGo/releases/download/android-v${version}/SerbisyoGo-${version}.apk`,
    release_url: `https://github.com/Jawbear/SerbisyoGo/releases/tag/android-v${version}`,
    source_commit: ''
  };

  writeFileSync(releasePath, JSON.stringify(releaseData, null, 2) + '\n');
  console.log('Updated src/features/app-releases/android-release.json');
} else {
  console.log('Note: Local app-release.apk not found yet (build locally with Gradle first, or build via GitHub Actions).');
}
