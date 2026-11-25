import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { signingCertificate } from './apk-signature.mjs';
import { androidTool } from './android-tool.mjs';
const metadata = JSON.parse(readFileSync('builds/build-metadata.json', 'utf8'));
const config = JSON.parse(readFileSync('app.json', 'utf8')).expo;
if (metadata.packageName !== config.android.package || metadata.version !== config.version || metadata.versionCode !== config.android.versionCode || metadata.fileName !== `SerbisyoGo-${config.version}.apk`) throw new Error('The reused artifact has the wrong application identity/version.');
const source = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (!/^[0-9a-f]{40}$/.test(source) || metadata.sourceCommit !== source || process.env.GITHUB_SHA !== source) {
  throw new Error('The downloaded APK must have been built from the selected workflow commit.');
}
const path = join('builds', metadata.fileName);
const bytes = readFileSync(path);
const digest = createHash('sha256').update(bytes).digest('hex');
if (bytes.length !== metadata.sizeBytes || digest !== metadata.sha256 ||
    readFileSync(path + '.sha256', 'utf8').trimEnd() !== digest + '  ' + metadata.fileName) throw new Error('Downloaded APK checksum or size mismatch.');
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
const version = readdirSync(join(sdk, 'build-tools')).filter(name => /^\d+\.\d+\.\d+$/.test(name)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).at(-1);
const tools = join(sdk, 'build-tools', version);
const output = androidTool(tools, 'apksigner', ['verify', '--verbose', '--print-certs', path]);
if (signingCertificate(output, process.env.ANDROID_RELEASE_CERT_SHA256) !== metadata.certificateSha256) throw new Error('APK certificate differs from its metadata.');
const manifest = androidTool(tools, 'aapt', ['dump', 'badging', path]);
if (!manifest.includes(`package: name='${metadata.packageName}'`) || !manifest.includes(`versionName='${metadata.version}'`) || !manifest.includes(`versionCode='${metadata.versionCode}'`) || /application-debuggable/.test(manifest)) throw new Error('Downloaded APK manifest verification failed.');
console.log('Downloaded artifact checksum, package/version and persistent release signature verified.');
