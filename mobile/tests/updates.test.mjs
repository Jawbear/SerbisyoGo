import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CERTIFICATE,validateRelease,mayPrompt} from '../src/updates/policy.js';
import {loadAvailableRelease} from '../src/updates/release.js';

const release={package_name:'com.serbisyogo.mobile',certificate_sha256:CERTIFICATE,version_name:'0.3.0',version_code:3,min_sdk:24,min_android:'7.0',byte_size:53255608,sha256:'a'.repeat(64),download_url:'https://github.com/Jawbear/SerbisyoGo/releases/download/android-v0.3.0/SerbisyoGo-0.3.0.apk'};
test('only a newer Android version is offered, using version codes rather than string order',()=>{
 assert.equal(validateRelease(release,2,35).version_code,3);
 assert.equal(validateRelease(release,3,35),null);assert.equal(validateRelease(release,4,35),null);
 assert.equal(validateRelease({...release,version_name:'0.10.0',version_code:10,download_url:release.download_url.replaceAll('0.3.0','0.10.0')},9,35).version_code,10);
});
test('untrusted, malformed, incompatible and oversized update manifests fail closed',()=>{
 for(const patch of [{package_name:'other.app'},{certificate_sha256:'b'.repeat(64)},{download_url:'https://evil.example/update.apk'},{download_url:release.download_url+'?redirect=bad'},{sha256:'bad'},{version_code:3.5},{byte_size:151*1048576},{min_sdk:36},{min_sdk:undefined},{version_name:'../../bad'}])assert.throws(()=>validateRelease({...release,...patch},2,35));
});
test('Later suppresses the same version reminder for a day without hiding a newer version',()=>{
 const now=200000000;assert.equal(mayPrompt(null,3,now),true);
 assert.equal(mayPrompt({version:3,at:now-1000},3,now),false);
 assert.equal(mayPrompt({version:3,at:now-86400000},3,now),true);
 assert.equal(mayPrompt({version:3,at:now},4,now),true);
});
test('a new verified GitHub release is discoverable before the website metadata changes',async()=>{
 const metadata={packageName:release.package_name,certificateSha256:CERTIFICATE,version:'0.3.0',versionCode:3,minSdk:24,sizeBytes:release.byte_size,sha256:release.sha256,emulatorSmoke:{hardwareBack:true,launchedWithoutMetro:true}};
 const address='https://github.com/Jawbear/SerbisyoGo/releases/download/android-v0.3.0/build-metadata.json';
 const request=async url=>({ok:true,json:async()=>url.includes('app-update.json')?{...release,version_code:2}:url.includes('api.github.com')?[{tag_name:'android-v0.3.0',draft:false,assets:[{name:'build-metadata.json',browser_download_url:address},{name:'SerbisyoGo-0.3.0.apk',size:release.byte_size,digest:`sha256:${release.sha256}`,browser_download_url:release.download_url}]}]:metadata});
 assert.equal((await loadAvailableRelease(2,35,undefined,request)).version_code,3);
});
test('offline update checking fails without altering account state, while an available site remains a rate-limit fallback',async()=>{
 await assert.rejects(loadAvailableRelease(2,35,undefined,async()=>{throw new Error('offline');}),/continue using/);
 const request=async url=>url.includes('app-update.json')?{ok:true,json:async()=>release}:{ok:false};
 assert.equal(await loadAvailableRelease(3,35,undefined,request),null);
});
