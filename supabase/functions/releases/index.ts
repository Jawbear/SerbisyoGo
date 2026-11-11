import {unzipSync} from 'npm:fflate@0.8.2';
import {authorize,clients,cors,json,limitedFile,unwrap,requireData} from '../_shared/http.ts';
import {validateUpload} from '../../../src/lib/domain.ts';
import {readAndroidManifest,androidVersions} from '../../../src/lib/apk.ts';
Deno.serve(async req=>{
 let headers:Record<string,string>={};try{
 headers=cors(req);if(req.method==='OPTIONS')return new Response(null,{headers});
 if(req.method==='GET'){
   const {privileged}=clients(req);const id=new URL(req.url).searchParams.get('id');
   let query=privileged.from('app_releases').select('id,artifact_path,byte_size,version_name').eq('status','published').not('verified_at','is',null).order('version_code',{ascending:false}).limit(1);
   if(id)query=query.eq('id',id);const r=unwrap(await query.maybeSingle());
   if(!r)return json({error:'Android app coming soon'},headers,404);
   const artifact=await privileged.storage.from('android-releases').info(r.artifact_path);
   if(artifact.error||Number(artifact.data.size)!==Number(r.byte_size))return json({error:'This download is temporarily unavailable. Please try again later.'},headers,503);
   const signed=requireData(await privileged.storage.from('android-releases').createSignedUrl(r.artifact_path,60,{download:`SERBISYOGO-${r.version_name}.apk`}));
   return json({url:signed.signedUrl,expires_in:60},headers);
 }
 if(req.method!=='POST')return json({error:'Method not allowed'},headers,405);
 const {user,privileged}=await authorize(req,true);
 const max=Math.min(Number(Deno.env.get('APK_MAX_BYTES')||52428800),52428800);
 const form=await limitedFile(req,max);const file=form.get('file');
 if(!(file instanceof File))throw new Error('APK file required');validateUpload('apk',file.size,file.type||'application/octet-stream',file.name,max);
 const version=String(form.get('version_name')||''),code=Number(form.get('version_code')),minimum=String(form.get('min_android')||''),notes=String(form.get('release_notes')||'');
 if(!/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(version)||!Number.isSafeInteger(code)||code<=0||!/^\d+(?:\.\d+)?$/.test(minimum)||notes.length<10||notes.length>10000)throw new Error('Invalid release metadata');
 const bytes=new Uint8Array(await file.arrayBuffer());if(bytes[0]!==80||bytes[1]!==75)throw new Error('APK must be an Android package ZIP');
 // Inspect required entries with bounded decompression to reject unrelated ZIPs and zip bombs.
 let expanded=0;let executablePresent=false;
 const entries=unzipSync(bytes,{filter:e=>{
   expanded+=e.originalSize;if(expanded>250*1048576)throw new Error('APK expands beyond the supported size');
   if(e.name==='classes.dex')executablePresent=true;
   if(e.name==='AndroidManifest.xml'&&e.originalSize>2097152)throw new Error('Android manifest exceeds the supported size');
   return e.name==='AndroidManifest.xml';
 }});
 if(!entries['AndroidManifest.xml']||!executablePresent)throw new Error('Missing Android manifest or executable. Supply the actual signed APK.');
 const manifest=readAndroidManifest(entries['AndroidManifest.xml']);
 if(manifest.version_name!==version||manifest.version_code!==code||androidVersions[manifest.min_sdk]!==minimum)throw new Error(`Metadata must match the APK: ${manifest.version_name}, code ${manifest.version_code}, minimum Android ${androidVersions[manifest.min_sdk]||'unsupported SDK '+manifest.min_sdk}`);
 const checksum=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
 const release=unwrap(await user.rpc('create_release_draft',{p_version_name:version,p_version_code:code,p_min_android:minimum,p_notes:notes}));
 unwrap(await privileged.storage.from('android-releases').upload(release.artifact_path,bytes,{contentType:'application/vnd.android.package-archive',upsert:false}));
 // Read it back: never trust upload metadata or a browser-provided checksum.
 const stored=requireData(await privileged.storage.from('android-releases').download(release.artifact_path));
 const saved=new Uint8Array(await stored.arrayBuffer());const savedHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',saved))).map(x=>x.toString(16).padStart(2,'0')).join('');
 if(savedHash!==checksum||saved.length!==bytes.length)throw new Error('Stored artifact verification failed. Draft remains unpublished.');
 unwrap(await privileged.from('app_releases').update({byte_size:saved.length,sha256:checksum,verified_at:new Date().toISOString()}).eq('id',release.id).eq('status','draft'));
 return json({id:release.id,sha256:checksum,byte_size:saved.length,status:'draft'},headers,201);
 }catch(error){return json({error:error instanceof Error?error.message:'Release operation failed'},headers,400);}
});
