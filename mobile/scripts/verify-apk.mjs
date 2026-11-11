import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { signingCertificate } from './apk-signature.mjs';

const config = JSON.parse(readFileSync('app.json', 'utf8')).expo;
const source = resolve('android/app/build/outputs/apk/release/app-release.apk');
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
if (!sdk) throw new Error('The Android SDK is required for APK verification.');
const versions = readdirSync(join(sdk, 'build-tools')).filter(name => /^\d+\.\d+\.\d+$/.test(name)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
const tools = join(sdk, 'build-tools', versions.at(-1));
const manifest = execFileSync(join(tools, 'aapt'), ['dump', 'badging', source], { encoding: 'utf8' });
const signature = execFileSync(join(tools, 'apksigner'), ['verify', '--verbose', '--print-certs', source], { encoding: 'utf8' });
console.log(signature);
const certificateSha256 = signingCertificate(signature, process.env.ANDROID_RELEASE_CERT_SHA256);
if (!manifest.includes(`package: name='${config.android.package}'`) || !manifest.includes(`versionName='${config.version}'`) || !manifest.includes(`versionCode='${config.android.versionCode}'`)) throw new Error('APK identity/version does not match app.json.');
if (/application-debuggable/.test(manifest)) throw new Error('A debuggable APK cannot be published by this workflow.');
for (const permission of config.android.blockedPermissions) if (manifest.includes(`uses-permission: name='${permission}'`)) throw new Error(`Unexpected APK permission: ${permission}`);
const entries = execFileSync('jar', ['tf', source], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }).split(/\r?\n/);
if (!entries.includes('assets/index.android.bundle')) throw new Error('The standalone JavaScript bundle is missing; this APK would require Metro.');
for (const abi of ['arm64-v8a', 'armeabi-v7a', 'x86_64']) if (!entries.some(name => name.startsWith(`lib/${abi}/`) && name.endsWith('.so'))) throw new Error(`Missing native libraries for ${abi}.`);
const bytes = readFileSync(source);
const sha256 = createHash('sha256').update(bytes).digest('hex');
const fileName = `SerbisyoGo-${config.version}.apk`;
mkdirSync('builds', { recursive: true });
copyFileSync(source, join('builds', fileName));
writeFileSync(join('builds', `${fileName}.sha256`), `${sha256}  ${fileName}\n`);
const metadata = {
  fileName, packageName: config.android.package, version: config.version, versionCode: config.android.versionCode,
  minSdk: Number(manifest.match(/^sdkVersion:'(\d+)'/m)?.[1]),
  targetSdk: Number(manifest.match(/^targetSdkVersion:'(\d+)'/m)?.[1]),
  architectures: ['arm64-v8a', 'armeabi-v7a', 'x86_64'], sizeBytes: bytes.length, sha256, certificateSha256,
  standaloneBundle: true, debuggable: false, sourceCommit: process.env.GITHUB_SHA || null,
  buildUrl: process.env.GITHUB_RUN_ID ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` : null
};
if (!Number.isInteger(metadata.minSdk) || !Number.isInteger(metadata.targetSdk)) throw new Error('APK SDK metadata is missing.');
writeFileSync('builds/build-metadata.json', JSON.stringify(metadata, null, 2) + '\n');
console.log(JSON.stringify(metadata, null, 2));
