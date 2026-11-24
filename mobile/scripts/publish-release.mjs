import {readFileSync,writeFileSync,appendFileSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';

if(process.env.CI!=='1')throw new Error('Publication runs through the release workflow.');
const build=JSON.parse(readFileSync('builds/build-metadata.json','utf8'));
const config=JSON.parse(readFileSync('app.json','utf8')).expo;
const repository=process.env.GITHUB_REPOSITORY;
if (!/^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA || '') || build.sourceCommit !== process.env.GITHUB_SHA) {
  throw new Error('Select a signed artifact built from the commit approved for this release.');
}
if(repository!=='Jawbear/SerbisyoGo'||build.version!==config.version||build.versionCode!==config.android.versionCode||!build.emulatorSmoke?.hardwareBack)throw new Error('Release identity or native checks are incomplete.');
const tag=`android-v${build.version}`;
// GitHub's --target only selects the commit when creating a new tag.
const readGit = path => JSON.parse(execFileSync('gh', ['api', `repos/${repository}/git/${path}`], {encoding:'utf8',timeout:30000}));
const tagRef = readGit(`matching-refs/tags/${tag}`).find(ref => ref.ref === `refs/tags/${tag}`);
if (tagRef) {
  let target = tagRef.object;
  while (target.type === 'tag') target = readGit(`tags/${target.sha}`).object;
  if (target.type !== 'commit' || target.sha !== build.sourceCommit) throw new Error('Existing Android tag points to a different commit.');
}
const probe=spawnSync('gh',['api',`repos/${repository}/releases/tags/${tag}`],{encoding:'utf8',timeout:30000});
if(probe.status===0){
 const release=JSON.parse(probe.stdout),apk=release.assets.find(asset=>asset.name===build.fileName),metadata=release.assets.find(asset=>asset.name==='build-metadata.json');
 if(release.draft||release.tag_name!==tag||apk?.size!==build.sizeBytes||apk?.digest!==`sha256:${build.sha256}`||!metadata||metadata.size>1048576||metadata.browser_download_url!==`https://github.com/${repository}/releases/download/${tag}/build-metadata.json`)throw new Error('Existing release differs from the tested APK; refusing to overwrite.');
 const response=await fetch(metadata.browser_download_url,{signal:globalThis.AbortSignal.timeout(30000)});if(!response.ok)throw new Error('Existing release metadata is unavailable.');
 const saved=await response.json();
 for(const field of ['sourceCommit','sha256','sizeBytes','packageName','version','versionCode','certificateSha256'])if(saved[field]!==build[field])throw new Error(`Existing release ${field} differs from the tested APK.`);
 console.log('Existing public release matches the tested APK; resuming upgrade verification.');
}else{
 if(!/HTTP 404/.test(probe.stderr||''))throw new Error('Cannot inspect existing release; publication stopped.');
 writeFileSync('builds/release-notes.md',execFileSync(process.execPath,['scripts/release-notes.mjs']));
 execFileSync('gh',['release','create',tag,`builds/${build.fileName}`,`builds/${build.fileName}.sha256`,'builds/build-metadata.json','builds/android-home.png','--target',build.sourceCommit,'--title',`SerbisyoGo Android ${build.version}`,'--prerelease','--notes-file','builds/release-notes.md'],{stdio:'inherit',timeout:180000});
}
if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,`### APK download\n\n[Download SerbisyoGo ${build.version}](https://github.com/${repository}/releases/download/${tag}/${build.fileName})\n`);
