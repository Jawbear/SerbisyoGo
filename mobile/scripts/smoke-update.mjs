import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';

if(process.env.CI!=='1')throw new Error('The update installer smoke test is restricted to the isolated CI emulator.');
const metadata=JSON.parse(readFileSync('builds/build-metadata.json','utf8'));
const adb=(...args)=>execFileSync('adb',['-e',...args],{encoding:'utf8',timeout:30000,maxBuffer:10*1024*1024});
if(!['serbisyogo-ci','serbisyogo-local'].includes(adb('shell','getprop','ro.boot.qemu.avd_name').trim()))throw new Error('Only the dedicated SerbisyoGo test emulator may be used for this upgrade test.');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function ui(){adb('shell','uiautomator','dump','/sdcard/serbisyogo-update.xml');return adb('shell','cat','/sdcard/serbisyogo-update.xml');}
async function waitFor(check,description,timeout=90000){const end=Date.now()+timeout;let last='';while(Date.now()<end){try{last=ui();if(check(last))return last;}catch{ /* The emulator can briefly reject UI dumps while changing activities. */ }await sleep(1000);}writeFileSync('builds/update-failure.xml',last);throw new Error(`Updater check timed out: ${description}`);}
function tap(xml,text){const node=[...xml.matchAll(/<node\b[^>]*>/g)].map(match=>match[0]).find(node=>node.includes(`text="${text}"`)||node.includes(`content-desc="${text}"`));const bounds=node?.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);if(!bounds)throw new Error(`No accessible updater control: ${text}`);const[,x1,y1,x2,y2]=bounds.map(Number);adb('shell','input','tap',String(Math.round((x1+x2)/2)),String(Math.round((y1+y2)/2)));}

// This is the disposable runner emulator, never a connected user's phone.
adb('uninstall',metadata.packageName);adb('install','builds/updater-baseline.apk');
adb('root');adb('wait-for-device');
writeFileSync('builds/update-retained-data.txt','retained-through-in-place-update\n');
adb('shell','mkdir','-p',`/data/data/${metadata.packageName}/files`);
adb('push','builds/update-retained-data.txt',`/data/data/${metadata.packageName}/files/update-retained-data.txt`);
adb('shell','am','start','-W','-n',`${metadata.packageName}/.MainActivity`);
let xml=await waitFor(value=>value.includes('A new version is available'),'optional update prompt');
tap(xml,'Remind me later');
xml=await waitFor(value=>value.includes('View app update')&&!value.includes('A new version is available'),'Later keeps the app usable');
tap(xml,'View app update');
xml=await waitFor(value=>value.includes(`Installed version: ${metadata.version} (build ${metadata.versionCode-1})`)&&value.includes('Download app update'),'native version and available update');
tap(xml,'Download app update');
xml=await waitFor(value=>value.includes('Install update'),'verified in-app APK download',480000);
writeFileSync('builds/android-update-ready.png',execFileSync('adb',['-e','exec-out','screencap','-p']));
tap(xml,'Install update');
await waitFor(value=>value.includes('Allow from this source')||value.includes('Install unknown apps'),'Android per-app installation permission');
adb('shell','appops','set',metadata.packageName,'REQUEST_INSTALL_PACKAGES','allow');adb('shell','input','keyevent','4');
xml=await waitFor(value=>value.includes('Install update'),'return from Android settings');tap(xml,'Install update');
xml=await waitFor(value=>/text="(?:Update|Install)"/.test(value),'Android update confirmation');
writeFileSync('builds/android-update-confirmation.png',execFileSync('adb',['-e','exec-out','screencap','-p']));tap(xml,/text="Update"/.test(xml)?'Update':'Install');
const end=Date.now()+90000;let upgraded=false;
while(Date.now()<end){if(new RegExp(`versionCode=${metadata.versionCode}\\b`).test(adb('shell','dumpsys','package',metadata.packageName))){upgraded=true;break;}await sleep(1000);}
if(!upgraded)throw new Error('Android did not install the newer version.');
if(!adb('shell','cat',`/data/data/${metadata.packageName}/files/update-retained-data.txt`).includes('retained-through-in-place-update'))throw new Error('Private application data was not retained during the update.');
adb('shell','am','start','-W','-n',`${metadata.packageName}/.MainActivity`);
await waitFor(value=>value.includes('App updates')||value.includes('Find a professional'),'updated app launches');
metadata.emulatorSmoke.inAppUpdate={fromVersionCode:metadata.versionCode-1,toVersionCode:metadata.versionCode,optionalPrompt:true,laterKeepsAppUsable:true,downloadVerified:true,permissionFlow:true,androidConfirmation:true,privateDataRetained:true};
writeFileSync('builds/build-metadata.json',JSON.stringify(metadata,null,2)+'\n');
console.log('In-app update passed: optional prompt, Later, download verification, permission settings, Android confirmation, actual version upgrade and retained private data.');
