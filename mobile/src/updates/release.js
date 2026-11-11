import {UPDATE_URL, validateRelease} from './policy.js';

// The site is the fast path. The public release feed also discovers a newly
// published APK before the site's next deployment; no GitHub token is shipped.
export async function loadAvailableRelease(installedCode, sdkInt, signal, request = fetch) {
  const options = {signal,headers:{Accept:'application/json'}};
  let siteChecked = false;
  try {
    const response = await request(`${UPDATE_URL}?check=${Date.now()}`, options);
    if (response.ok) {
      const value = validateRelease(await response.json(), installedCode, sdkInt);
      siteChecked = true;
      if (value) return value;
    }
  } catch (error) { if(signal?.aborted)throw error; }
  try {
    const feed = await request('https://api.github.com/repos/Jawbear/SerbisyoGo/releases?per_page=10',options);
    if (!feed.ok) throw new Error('Release checking is unavailable.');
    const releases = await feed.json();
    if (!Array.isArray(releases)) throw new Error('Invalid release feed.');
    for (const release of releases.filter(row=>!row.draft&&/^android-v\d+\.\d+\.\d+$/.test(row.tag_name)).slice(0,3)) {
      const version=release.tag_name.slice('android-v'.length);
      const asset=release.assets?.find(row=>row.name==='build-metadata.json');
      const address=`https://github.com/Jawbear/SerbisyoGo/releases/download/${release.tag_name}/build-metadata.json`;
      if(asset?.browser_download_url!==address)continue;
      const response=await request(address,options);if(!response.ok)continue;
      const info=await response.json();
      const apk=release.assets.find(row=>row.name===`SerbisyoGo-${version}.apk`);
      if(info.version!==version||apk?.size!==info.sizeBytes||apk?.digest!==`sha256:${info.sha256}`||!info.emulatorSmoke?.hardwareBack||!info.emulatorSmoke?.launchedWithoutMetro)continue;
      const candidate=validateRelease({package_name:info.packageName,certificate_sha256:info.certificateSha256,version_name:info.version,version_code:info.versionCode,min_sdk:info.minSdk,min_android:'7.0',byte_size:info.sizeBytes,sha256:info.sha256,download_url:apk.browser_download_url,release_notes:release.body||''},installedCode,sdkInt);
      if(candidate)return candidate;
    }
    return null;
  } catch (error) {
    if(signal?.aborted)throw error;
    if(siteChecked)return null;
    throw new Error('Update checking is unavailable. Check your connection and try again. You can continue using the app.');
  }
}
