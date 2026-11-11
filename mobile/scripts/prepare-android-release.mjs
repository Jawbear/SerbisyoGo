import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Buffer } from 'node:buffer';

const config = JSON.parse(readFileSync('app.json', 'utf8')).expo;
const backendUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publicKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!backendUrl?.startsWith('https://') || !publicKey || publicKey.startsWith('sb_secret_')) throw new Error('Configure the real public Supabase URL and publishable key before packaging.');
let allowedKey = publicKey.startsWith('sb_publishable_');
try { allowedKey ||= JSON.parse(Buffer.from(publicKey.split('.')[1], 'base64url')).role === 'anon'; } catch { /* Opaque publishable keys have no JWT payload. */ }
if (!allowedKey) throw new Error('A server/service key cannot be bundled in the APK.');
const path = process.env.ANDROID_KEYSTORE_PATH;
if (!path || !process.env.ANDROID_RELEASE_PASSWORD || !process.env.ANDROID_RELEASE_ALIAS) throw new Error('Private release-signing configuration is required.');
if (process.env.ANDROID_RELEASE_KEYSTORE) writeFileSync(path, Buffer.from(process.env.ANDROID_RELEASE_KEYSTORE, 'base64'), { mode: 0o600 });
if (!existsSync(path)) throw new Error('The private release keystore is missing.');
const gradlePath = resolve('android/app/build.gradle');
let gradle = readFileSync(gradlePath, 'utf8');
const marker = '// SerbisyoGo private release signing';
if (!gradle.includes(marker)) {
  gradle += `\n${marker}\nandroid {\n    signingConfigs {\n        serbisyoRelease {\n            storeFile file(System.getenv("ANDROID_KEYSTORE_PATH"))\n            storePassword System.getenv("ANDROID_RELEASE_PASSWORD")\n            keyAlias System.getenv("ANDROID_RELEASE_ALIAS")\n            keyPassword System.getenv("ANDROID_RELEASE_PASSWORD")\n        }\n    }\n    buildTypes {\n        release {\n            signingConfig signingConfigs.serbisyoRelease\n        }\n    }\n}\n`;
  writeFileSync(gradlePath, gradle);
}
console.log(`Prepared ${config.android.package} ${config.version} (${config.android.versionCode}) with private release signing and a configured backend.`);
