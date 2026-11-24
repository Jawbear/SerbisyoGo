#!/usr/bin/env node
/**
 * SerbisyoGo — Physical Device Smoke Test
 *
 * Connects to a USB-connected Android device via ADB and runs
 * basic smoke tests: installs APK, takes screenshots, checks logcat.
 *
 * Requirements:
 *   - ADB installed and on PATH
 *   - Android device connected via USB with debugging enabled
 *   - APK file (set TEST_APK_PATH in .env.local or pass as argument)
 *
 * Usage:
 *   node scripts/physical-device-smoke.mjs [path-to-apk]
 */

import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { setTimeout as sleep } from 'node:timers/promises';

const PACKAGE = JSON.parse(readFileSync(new URL('../mobile/app.json', import.meta.url), 'utf8')).expo.android.package;
const REPORT_DIR = '.cache/device-test-report';
const REPORT_FILE = '.cache/device-test-report.json';
const TIMEOUT = 10_000;

const RED = '\x1b[31m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m', CYAN = '\x1b[36m', RESET = '\x1b[0m', BOLD = '\x1b[1m';

function log(msg) { console.log(`${CYAN}[smoke]${RESET} ${msg}`); }
function pass(msg) { console.log(`  ${GREEN}✓${RESET} ${msg}`); results.push({ test: msg, status: 'pass' }); }
function fail(msg, err) { console.log(`  ${RED}✗${RESET} ${msg}${err ? ` — ${err}` : ''}`); results.push({ test: msg, status: 'fail', error: String(err || '') }); }
function warn(msg) { console.log(`  ${YELLOW}⚠${RESET} ${msg}`); }

const results = [];

function adb(cmd, opts = {}) {
  try {
    return execFileSync('adb', Array.isArray(cmd) ? cmd : cmd.split(' '), { timeout: TIMEOUT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...opts }).trim();
  } catch (e) {
    throw new Error(`adb ${cmd} failed: ${e.message}`);
  }
}

function screenshot(name) {
  try {
    const remotePath = `/sdcard/serbisyogo-smoke-${name}.png`;
    const localPath = join(REPORT_DIR, `${name}.png`);
    adb(`shell screencap -p ${remotePath}`);
    adb(['pull', remotePath, localPath], { timeout: 15_000 });
    adb(`shell rm ${remotePath}`);
    log(`Screenshot saved: ${localPath}`);
    return localPath;
  } catch (e) {
    warn(`Screenshot ${name} failed: ${e.message}`);
    return null;
  }
}


// ─── Main ───

console.log(`\n${BOLD}${GREEN}SerbisyoGo Physical Device Smoke Test${RESET}\n`);

if (!existsSync(REPORT_DIR)) mkdirSync(REPORT_DIR, { recursive: true });

// 1. Check ADB connection
log('Checking ADB connection...');
try {
  const devices = adb('devices');
  const connected = devices.split('\n').filter(l => l.includes('\tdevice')).length;
  if (connected === 0) {
    console.error(`${RED}No device connected. Connect a device via USB with debugging enabled.${RESET}`);
    process.exit(1);
  }
  pass(`Device connected (${connected} device(s))`);
} catch {
  console.error(`${RED}ADB not found or not working. Install ADB and ensure it's on PATH.${RESET}`);
  process.exit(1);
}

// 2. Get device info
log('Getting device info...');
try {
  const model = adb('shell getprop ro.product.model');
  const android = adb('shell getprop ro.build.version.release');
  const sdk = adb('shell getprop ro.build.version.sdk');
  const screenSize = adb('shell wm size').replace('Physical size: ', '');
  const density = adb('shell wm density').replace('Physical density: ', '');
  pass(`Device: ${model}, Android ${android} (API ${sdk}), ${screenSize} @ ${density}dpi`);
  results.push({ test: 'device_info', status: 'info', model, android, sdk, screenSize, density });
} catch (e) {
  fail('Get device info', e.message);
}

// 3. Check APK path
const apkPath = process.argv[2] || process.env.TEST_APK_PATH;
if (apkPath && !existsSync(apkPath)) throw new Error('The selected APK does not exist.');
if (!apkPath) {
  warn('Using the installed app. Installation and upgrade are untested.');
  warn('Usage: node scripts/physical-device-smoke.mjs path/to/SerbisyoGo.apk');
} else {
  // 4. Install APK
  log(`Installing APK: ${apkPath}`);
  try {
    adb(['install', '-r', apkPath], { timeout: 60_000 });
    pass('APK installed successfully');
  } catch (e) {
    fail('APK installation', e.message);
  }
}

// 5. Launch app
log('Launching SerbisyoGo...');
try {
  adb(`shell am force-stop ${PACKAGE}`);
  await sleep(1000);
  adb(`shell am start -n ${PACKAGE}/.MainActivity`);
  await sleep(4000);
  if (!adb(`shell pidof ${PACKAGE}`)) throw new Error('The selected application is not running.');
  pass('App launched');
  screenshot('01-launch');
} catch (e) {
  fail('App launch', e.message);
}

// 6. Check for crashes in logcat
log('Checking logcat for crashes...');
try {
  adb('logcat -c');
  await sleep(3000);
  const logcat = adb('logcat -d -s AndroidRuntime:E');
  const crashes = logcat.split('\n').filter(l => l.includes('FATAL EXCEPTION') || l.includes('java.lang.') || l.includes('Error'));
  if (crashes.length > 0) {
    fail(`Found ${crashes.length} crash entries in logcat`);
    writeFileSync(join(REPORT_DIR, 'crash-log.txt'), crashes.join('\n'), 'utf8');
  } else {
    pass('No crashes detected in logcat');
  }
} catch (e) {
  warn(`Logcat check issue: ${e.message}`);
}

// 7. Hardware Back button
log('Testing hardware Back button...');
try {
  adb('shell input keyevent KEYCODE_BACK');
  await sleep(2000);
  screenshot('02-after-back');
  pass('Back button press registered');
} catch (e) {
  fail('Back button', e.message);
}

// 8. Screen rotation
log('Testing screen rotation...');
try {
  adb('shell settings put system accelerometer_rotation 0');
  adb('shell settings put system user_rotation 1'); // landscape
  await sleep(2000);
  screenshot('03-landscape');
  adb('shell settings put system user_rotation 0'); // portrait
  await sleep(2000);
  screenshot('04-portrait');
  adb('shell settings put system accelerometer_rotation 1');
  pass('Screen rotation handled');
} catch (e) {
  fail('Screen rotation', e.message);
}

// 9. Background/foreground
log('Testing app backgrounding...');
try {
  adb('shell input keyevent KEYCODE_HOME');
  await sleep(2000);
  adb(`shell am start -n ${PACKAGE}/.MainActivity`);
  await sleep(3000);
  screenshot('05-resumed');
  pass('App resumed from background');
} catch (e) {
  fail('App resume', e.message);
}

// 10. Memory check
log('Checking memory usage...');
try {
  const meminfo = adb(`shell dumpsys meminfo ${PACKAGE}`);
  const totalMatch = meminfo.match(/TOTAL\s+(\d+)/);
  if (totalMatch) {
    const totalKB = parseInt(totalMatch[1]);
    const totalMB = Math.round(totalKB / 1024);
    if (totalMB > 200) {
      fail(`Memory usage high: ${totalMB} MB (target < 200 MB)`);
    } else {
      pass(`Memory usage: ${totalMB} MB (target < 200 MB)`);
    }
  } else {
    warn('Could not parse memory info');
  }
} catch (e) {
  warn(`Memory check issue: ${e.message}`);
}

// 11. Final screenshot
screenshot('06-final');

// ─── Report ───
const passed = results.filter(r => r.status === 'pass').length;
const failed = results.filter(r => r.status === 'fail').length;

const report = {
  timestamp: new Date().toISOString(),
  device: results.find(r => r.test === 'device_info') || {},
  results,
  summary: { total: passed + failed, passed, failed }
};

writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2), 'utf8');

console.log(`\n${BOLD}═══ Results ═══${RESET}`);
console.log(`  ${GREEN}Passed: ${passed}${RESET}`);
console.log(`  ${failed > 0 ? RED : GREEN}Failed: ${failed}${RESET}`);
console.log(`  Report: ${REPORT_FILE}`);
console.log(`  Screenshots: ${REPORT_DIR}/\n`);

process.exit(failed > 0 ? 1 : 0);
