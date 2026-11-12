import {writeFileSync} from 'node:fs';

const version=process.argv[2];
if(!/^\d+\.\d+\.\d+$/.test(version||''))throw new Error('Pass the published Android version, for example: node scripts/sync-android-release.mjs 0.3.0');
const tag=`android-v${version}`;
const get=async url=>{const response=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(30000)});if(!response.ok)throw new Error(`Release request failed: HTTP ${response.status}`);return response.json();};
const release=await get(`https://api.github.com/repos/Jawbear/SerbisyoGo/releases/tags/${tag}`);
if(release.draft||release.tag_name!==tag)throw new Error('The APK release is not published.');
const asset=release.assets.find(row=>row.name==='build-metadata.json');
const metadataUrl=`https://github.com/Jawbear/SerbisyoGo/releases/download/${tag}/build-metadata.json`;
if(asset?.browser_download_url!==metadataUrl)throw new Error('The verified build metadata is missing.');
const build=await get(`${metadataUrl}?verify=${Date.now()}`);
const apk=release.assets.find(row=>row.name===`SerbisyoGo-${version}.apk`);
if(build.version!==version||build.packageName!=='com.serbisyogo.mobile'||build.minSdk!==24||!Number.isSafeInteger(build.versionCode)||build.versionCode<3||build.certificateSha256!=='671506d9e3247ef43ae8d77d17f0a59afc9ba9b26cde855e90456a2a3becfefa'||!build.emulatorSmoke?.hardwareBack||!build.emulatorSmoke?.launchedWithoutMetro||!build.emulatorSmoke?.inAppUpdate?.privateDataRetained||!build.emulatorSmoke?.inAppUpdate?.androidConfirmation||apk?.size!==build.sizeBytes||apk?.digest!==`sha256:${build.sha256}`||!/^[a-f0-9]{40}$/.test(build.sourceCommit))throw new Error('The published APK does not have the required signature, native update checks or matching digest.');
const info={version_name:version,version_code:build.versionCode,min_android:'7.0',published_at:release.published_at,byte_size:build.sizeBytes,sha256:build.sha256,release_notes:'Adds optimized cover photos to Home and service browsing, bundled for offline display. Keeps the black-and-green design and existing account, booking and administrator features. Users on version 0.3.0 can update through App updates with Android confirmation; no uninstall is needed. Emulator update and data-retention checks passed; physical-phone testing remains pending.',download_url:apk.browser_download_url,release_url:release.html_url,source_commit:build.sourceCommit};
writeFileSync('src/features/app-releases/android-release.json',JSON.stringify(info,null,2)+'\n');
console.log(JSON.stringify({version,versionCode:build.versionCode,sha256:build.sha256,bytes:build.sizeBytes,inAppUpdateVerified:true}));
