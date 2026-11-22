import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const output = resolve(process.env.SERBISYOGO_APK_OUTPUT_DIR || 'builds');
const metadataPath = join(output, 'build-metadata.json');
const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
const adb = (...args) => execFileSync('adb', ['-e', ...args], { encoding: 'utf8', timeout: 30000, maxBuffer: 10 * 1024 * 1024 });
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
function ui() {
  adb('shell', 'uiautomator', 'dump', '/sdcard/serbisyogo-window.xml');
  return adb('shell', 'cat', '/sdcard/serbisyogo-window.xml');
}
async function waitForText(text) {
  const labels = Array.isArray(text) ? text : [text];
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    let xml;
    try { xml = ui(); } catch { await sleep(1000); continue; }
    if (labels.some(label => xml.includes(label))) return xml;
    await sleep(1000);
  }
  throw new Error(`Native app did not display: ${text}`);
}
function tap(xml, label) {
  const node = xml.match(/<node\b[^>]*>/g)?.find(item => item.includes(`content-desc="${label}"`) || item.includes(`text="${label}"`));
  const bounds = node?.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
  if (!bounds) throw new Error(`The native ${label} control has no accessible bounds.`);
  const [, x1, y1, x2, y2] = bounds.map(Number);
  adb('shell', 'input', 'tap', String(Math.round((x1 + x2) / 2)), String(Math.round((y1 + y2) / 2)));
}
adb('install', '-r', join(output, metadata.fileName));
adb('shell', 'am', 'force-stop', metadata.packageName);
adb('logcat', '-c');
const launch = () => adb('shell', 'am', 'start', '-W', '-n', `${metadata.packageName}/.MainActivity`);
async function waitForOpeningEvent(event) {
  const pid = adb('shell', 'pidof', metadata.packageName).trim();
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    const events = adb('logcat', '-d', '--pid=' + pid, '-s', 'SerbisyoGoIntro:I');
    if (events.includes(event)) return;
    if (events.includes('Opening ended:')) throw new Error(`Opening ended before ${event}`);
    await sleep(200);
  }
  throw new Error(`Android did not report ${event}`);
}
console.log(launch());
await waitForOpeningEvent('Opening prepared: 720x1280');
const overlay = ui();
if (overlay.includes('Viewing full screen') && overlay.includes('Got it')) tap(overlay, 'Got it');
await waitForOpeningEvent('Opening ended: completed');
tap(await waitForText('Browse as guest'), 'Browse as guest');
const initial = await waitForText(['Find a local professional', 'Find a professional']);
const onboardingAppeared = initial.includes('Find a local professional');
if (onboardingAppeared) {
  tap(initial, 'Continue');
  tap(await waitForText('Book a service'), 'Continue');
  tap(await waitForText('Follow your booking'), 'Get Started');
  await waitForText('Find a professional');
  adb('shell', 'am', 'force-stop', metadata.packageName);
  launch();
  await waitForOpeningEvent('Opening prepared: 720x1280');
  adb('shell', 'input', 'keyevent', '4');
  await waitForOpeningEvent('Opening ended: dismissed');
  tap(await waitForText('Browse as guest'), 'Browse as guest');
}
const home = await waitForText('Find a professional');
if (/Lab demo|SAMPLE RECORDS/.test(home)) throw new Error('A demo interface was found in the release APK.');
writeFileSync(join(output, 'android-home.png'), execFileSync('adb', ['-e', 'exec-out', 'screencap', '-p']));
tap(home, 'Find a professional');
await waitForText('Search professionals');
const rotation = adb('shell', 'settings', 'get', 'system', 'user_rotation').trim();
const autoRotate = adb('shell', 'settings', 'get', 'system', 'accelerometer_rotation').trim();
const rotated = rotation === '1' ? '0' : '1';
try {
  adb('shell', 'settings', 'put', 'system', 'accelerometer_rotation', '0');
  adb('shell', 'settings', 'put', 'system', 'user_rotation', rotated);
  const deadline = Date.now() + 20000;
  const isRotated = () => adb('shell', 'dumpsys', 'window', 'displays').includes(`mCurrentRotation=ROTATION_${rotated === '1' ? '90' : '0'}`);
  while (!isRotated() && Date.now() < deadline) await sleep(500);
  if (!isRotated()) throw new Error('The emulator did not change orientation.');
  await waitForText('Search professionals');
} finally {
  for (const [setting, value] of [['user_rotation', rotation], ['accelerometer_rotation', autoRotate]]) {
    if (value === 'null') adb('shell', 'settings', 'delete', 'system', setting);
    else adb('shell', 'settings', 'put', 'system', setting, value);
  }
}
adb('shell', 'input', 'keyevent', '4');
await waitForText('Find a professional');
for (const [page, heading] of [['faq', 'A little clarity goes a long way.'], ['for-workers', 'Bring your skills closer to home.']]) {
  adb('shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW', '-d', `serbisyogo://info/${page}`, metadata.packageName);
  await waitForText(heading);
  writeFileSync(join(output, `android-${page}.png`), execFileSync('adb', ['-e', 'exec-out', 'screencap', '-p']));
}
if (!adb('shell', 'pidof', metadata.packageName).trim()) throw new Error('The app process stopped after navigation.');
const crashes = adb('logcat', '-d', '-b', 'crash');
if (crashes.includes(metadata.packageName)) throw new Error('The Android crash buffer contains an application crash.');
metadata.emulatorSmoke = { api: Number(adb('shell', 'getprop', 'ro.build.version.sdk').trim()), abi: adb('shell', 'getprop', 'ro.product.cpu.abi').trim(), installed: true, launchedWithoutMetro: true, onboardingAndRestart: onboardingAppeared, publicNavigation: true, hardwareBack: true, discoveryRotation: true, publicGuides: true, physicalDeviceTested: false };
writeFileSync(metadataPath, JSON.stringify(metadata, null, 2) + '\n');
console.log('Installed release APK, opened Home, navigated to discovery and returned with Android Back without Metro.');
