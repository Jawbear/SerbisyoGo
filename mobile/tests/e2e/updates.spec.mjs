import {test,expect} from '@playwright/test';
import {installBackend} from '../fixtures/backend.mjs';
import {CERTIFICATE} from '../../src/updates/policy.js';
import {readFileSync} from 'node:fs';
const installed=JSON.parse(readFileSync(new URL('../../app.json',import.meta.url),'utf8')).expo;

const release={package_name:'com.serbisyogo.mobile',certificate_sha256:CERTIFICATE,version_name:'0.4.0',version_code:installed.android.versionCode+1,min_sdk:24,min_android:'7.0',byte_size:53000000,sha256:'a'.repeat(64),download_url:'https://github.com/Jawbear/SerbisyoGo/releases/download/android-v0.4.0/SerbisyoGo-0.4.0.apk',release_notes:'A newer version of SerbisyoGo.'};
test('manual update check shows the newer version while discovery remains accessible',async({page})=>{
 await installBackend(page);await page.route('**/app-update.json*',route=>route.fulfill({json:release}));
 await page.goto('/');await page.getByRole('button',{name:'App updates',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Version 0.4.0 is available',exact:true})).toBeVisible();
 await expect(page.getByText(`Installed version: ${installed.version} (build ${installed.android.versionCode})`,{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Download Android APK',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Navigate to Find help',exact:true}).click();await expect(page.getByRole('button',{name:'View Art Ecleo',exact:true})).toBeVisible();
});
test('an unavailable update service has a retry without blocking the app',async({page})=>{
 await installBackend(page);let offline=true;
 await page.route('**/app-update.json*',route=>route.fulfill(offline?{status:503,json:{error:'offline'}}:{json:{...release,version_name:installed.version,version_code:installed.android.versionCode,download_url:release.download_url.replaceAll('0.4.0',installed.version)}}));
 await page.route('https://api.github.com/repos/Jawbear/SerbisyoGo/releases*',route=>route.fulfill({status:503,json:{message:'offline'}}));
 await page.goto('/app-updates');await expect(page.getByRole('alert')).toContainText('You can continue using the app');
 offline=false;await page.getByRole('button',{name:'Check for updates',exact:true}).click();await expect(page.getByText('You’re up to date.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Navigate to Home',exact:true}).click();await expect(page.getByRole('button',{name:'Find a professional',exact:true})).toBeVisible();
});
