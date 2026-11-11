import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,copyFileSync,readdirSync} from 'node:fs';
import {signingCertificate} from './apk-signature.mjs';
import {join} from 'node:path';

if(process.env.CI!=='1')throw new Error('The lower-version updater fixture is only for isolated CI emulator checks.');
const config=JSON.parse(readFileSync('app.json','utf8')).expo;
const path='android/app/build.gradle';const original=readFileSync(path,'utf8');
try {
  writeFileSync(path,original+`\n// Isolated emulator fixture; never published.\nandroid.defaultConfig.versionCode = ${config.android.versionCode-1}\n`);
  execFileSync('./gradlew',[':app:assembleRelease','--no-daemon','--max-workers=2','-PreactNativeArchitectures=arm64-v8a,armeabi-v7a,x86_64'],{cwd:'android',stdio:'inherit',timeout:1200000});
  const apk='android/app/build/outputs/apk/release/app-release.apk';
  const sdk=process.env.ANDROID_HOME||process.env.ANDROID_SDK_ROOT;
  const latest=readdirSync(join(sdk,'build-tools')).filter(v=>/^\d+\.\d+\.\d+$/.test(v)).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).at(-1);
  const tools=join(sdk,'build-tools',latest);
  const manifest=execFileSync(join(tools,'aapt'),['dump','badging',apk],{encoding:'utf8'});
  if(!manifest.includes(`versionCode='${config.android.versionCode-1}'`)||!manifest.includes(`package: name='${config.android.package}'`))throw new Error('The updater fixture has the wrong version or package.');
  signingCertificate(execFileSync(join(tools,'apksigner'),['verify','--print-certs',apk],{encoding:'utf8'}),process.env.ANDROID_RELEASE_CERT_SHA256);
  copyFileSync(apk,'builds/updater-baseline.apk');
  console.log('Created a lower-version signed emulator fixture; it is not a published release asset.');
}finally{writeFileSync(path,original);}
