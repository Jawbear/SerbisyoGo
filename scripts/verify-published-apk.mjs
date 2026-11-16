// Verify the actual public download before recording it as release evidence.
import { readFile, mkdir, writeFile, appendFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { unzipSync } from 'fflate';
import { readAndroidManifest, androidVersions } from '../src/lib/apk.ts';

const release = JSON.parse(await readFile(new URL('../src/features/app-releases/android-release.json', import.meta.url), 'utf8'));
const url = new URL(release.download_url);
if (url.protocol !== 'https:' || url.hostname !== 'github.com' || !url.pathname.startsWith('/Jawbear/SerbisyoGo/releases/download/')) throw new Error('Unexpected public APK origin.');
if (!Number.isSafeInteger(release.byte_size) || release.byte_size <= 0 || release.byte_size > 128 * 1024 * 1024) throw new Error('Invalid expected APK size.');
const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
if (!response.ok || !response.body) throw new Error(`Published APK download failed: HTTP ${response.status}`);
const chunks = [];
let length = 0;
for await (const chunk of response.body) {
  length += chunk.length;
  if (length > release.byte_size) throw new Error('Public APK exceeds its declared size.');
  chunks.push(chunk);
}
const bytes = Buffer.concat(chunks);
const hash = createHash('sha256').update(bytes).digest('hex');
if (length !== release.byte_size || hash !== release.sha256) throw new Error('Published APK size/checksum does not match the release manifest.');
const entries = unzipSync(bytes, { filter: entry => entry.name === 'AndroidManifest.xml' && entry.originalSize < 2097152 });
const manifest = readAndroidManifest(entries['AndroidManifest.xml']);
if (manifest.version_name !== release.version_name || manifest.version_code !== release.version_code || androidVersions[manifest.min_sdk] !== release.min_android) throw new Error('Published APK binary version/SDK does not match release metadata.');
const directory = new URL('../.cache/verified-public-apk/', import.meta.url);
await mkdir(directory, { recursive: true });
const filename = `SerbisyoGo-${release.version_name}.apk`;
await writeFile(new URL(filename, directory), bytes);
if (process.env.GITHUB_ACTIONS === 'true' && process.env.GITHUB_ENV) {
  await appendFile(process.env.GITHUB_ENV, `TEST_APK_PATH=${fileURLToPath(new URL(filename, directory))}\n`);
}
const report = { checkedAt: new Date().toISOString(), url: url.href, filename, sizeBytes: length, sha256: hash, ...manifest, signatureVerified: false };
await writeFile(new URL('verification.json', directory), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
