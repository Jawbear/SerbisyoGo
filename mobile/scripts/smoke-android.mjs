import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const metadata = JSON.parse(readFileSync('builds/build-metadata.json', 'utf8'));
const adb = (...args) => execFileSync('adb', args, { encoding: 'utf8', timeout: 30000, maxBuffer: 10 * 1024 * 1024 });
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
function ui() {
  adb('shell', 'uiautomator', 'dump', '/sdcard/serbisyogo-window.xml');
  return adb('shell', 'cat', '/sdcard/serbisyogo-window.xml');
}
async function waitForText(text) {
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    let xml;
    try { xml = ui(); } catch { await sleep(1000); continue; }
    if (xml.includes(text)) return xml;
    await sleep(1000);
  }
  throw new Error(`Native app did not display: ${text}`);
}
adb('install', '-r', `builds/${metadata.fileName}`);
adb('logcat', '-c');
console.log(adb('shell', 'am', 'start', '-W', '-n', `${metadata.packageName}/.MainActivity`));
const home = await waitForText('Find a professional');
if (/Lab demo|SAMPLE RECORDS/.test(home)) throw new Error('A demo interface was found in the release APK.');
writeFileSync('builds/android-home.png', execFileSync('adb', ['exec-out', 'screencap', '-p']));
const button = home.match(/<node\b[^>]*(?:content-desc|text)="Find a professional"[^>]*>/)?.[0];
const bounds = button?.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
if (!bounds) throw new Error('The native Find a professional button has no accessible bounds.');
const [, x1, y1, x2, y2] = bounds.map(Number);
adb('shell', 'input', 'tap', String(Math.round((x1 + x2) / 2)), String(Math.round((y1 + y2) / 2)));
await waitForText('Search professionals');
adb('shell', 'input', 'keyevent', '4');
await waitForText('Find a professional');
if (!adb('shell', 'pidof', metadata.packageName).trim()) throw new Error('The app process stopped after navigation.');
const crashes = adb('logcat', '-d', '-b', 'crash');
if (crashes.includes(metadata.packageName)) throw new Error('The Android crash buffer contains an application crash.');
metadata.emulatorSmoke = { api: 35, abi: 'x86_64', installed: true, launchedWithoutMetro: true, publicNavigation: true, hardwareBack: true, physicalDeviceTested: false };
writeFileSync('builds/build-metadata.json', JSON.stringify(metadata, null, 2) + '\n');
console.log('Installed release APK, opened Home, navigated to discovery and returned with Android Back without Metro.');
