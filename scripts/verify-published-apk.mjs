// Verify the actual public download before recording it as release evidence.
import { readFile, mkdir, writeFile, appendFile, stat, unlink } from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { unzipSync } from 'fflate';
import { readAndroidManifest, androidVersions } from '../src/lib/apk.ts';

const release = JSON.parse(await readFile(new URL('../src/features/app-releases/android-release.json', import.meta.url), 'utf8'));
const url = new URL(release.download_url);
if (url.protocol !== 'https:' || url.hostname !== 'github.com' || !url.pathname.startsWith('/Jawbear/SerbisyoGo/releases/download/')) throw new Error('Unexpected public APK origin.');
if (!Number.isSafeInteger(release.byte_size) || release.byte_size <= 0 || release.byte_size > 128 * 1024 * 1024) throw new Error('Invalid expected APK size.');
if (!/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(release.version_name)) throw new Error('Invalid APK version.');
const directory = new URL('../.cache/verified-public-apk/', import.meta.url);
await mkdir(directory, { recursive: true });
const partial = new URL('download.partial', directory);
let bytes;
try {
  // The system client handles the public asset redirect/proxy path reliably;
  // Node fetch stalled before headers on both Windows and a Linux CI runner.
  // No token is sent, so this still checks the actual anonymous download.
  await promisify(execFile)(process.platform === 'win32' ? 'curl.exe' : 'curl', [
    '--ipv4','--silent','--show-error','--fail','--location',
    '--connect-timeout','20','--max-time','120','--retry','1','--retry-max-time','180',
    '--max-filesize',String(release.byte_size),'--proto','=https','--proto-redir','=https',
    '--output',fileURLToPath(partial),'--url',url.href
  ], {timeout:200000,maxBuffer:1048576,windowsHide:true});
  if ((await stat(partial)).size !== release.byte_size) throw new Error('Public APK size does not match its manifest.');
  bytes = await readFile(partial);
} finally { await unlink(partial).catch(() => {}); }
const length = bytes.length;
const hash = createHash('sha256').update(bytes).digest('hex');
if (length !== release.byte_size || hash !== release.sha256) throw new Error('Published APK size/checksum does not match the release manifest.');
const entries = unzipSync(bytes, { filter: entry => entry.name === 'AndroidManifest.xml' && entry.originalSize < 2097152 });
const manifest = readAndroidManifest(entries['AndroidManifest.xml']);
if (manifest.version_name !== release.version_name || manifest.version_code !== release.version_code || androidVersions[manifest.min_sdk] !== release.min_android) throw new Error('Published APK binary version/SDK does not match release metadata.');
const filename = `SerbisyoGo-${release.version_name}.apk`;
await writeFile(new URL(filename, directory), bytes);
if (process.env.GITHUB_ACTIONS === 'true' && process.env.GITHUB_ENV) {
  await appendFile(process.env.GITHUB_ENV, `TEST_APK_PATH=${fileURLToPath(new URL(filename, directory))}\n`);
}
const report = { checkedAt: new Date().toISOString(), url: url.href, filename, sizeBytes: length, sha256: hash, ...manifest, signatureVerified: false };
await writeFile(new URL('verification.json', directory), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
