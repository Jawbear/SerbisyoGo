import {unzipSync} from 'npm:fflate@0.8.2';
import {createHash} from 'node:crypto';
import {authorize,clients,cors,json,limitedFile,unwrap,requireData,browserStorageUrl} from '../_shared/http.ts';
import {validateUpload} from '../../../src/lib/domain.ts';
import {readAndroidManifest,androidVersions,APK_MAX_BYTES} from '../../../src/lib/apk.ts';
import {limitedBytes} from '../_shared/upload.ts';
async function releaseInput(req:Request,max:number) {
 const form=await limitedFile(req,Math.min(max,16*1024*1024));const file=form.get('file');
 if(!(file instanceof File))throw new Error('APK file required');validateUpload('apk',file.size,file.type||'application/octet-stream',file.name,max);
 const version=String(form.get('version_name')||''),code=Number(form.get('version_code')),minimum=String(form.get('min_android')||''),notes=String(form.get('release_notes')||'');
 if(!/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(version)||!Number.isSafeInteger(code)||code<=0||!/^\d+(?:\.\d+)?$/.test(minimum)||notes.length<10||notes.length>10000)throw new Error('Invalid release metadata');
 return {bytes:new Uint8Array(await file.arrayBuffer()),version,code,minimum,notes};
}
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
   return json({url:browserStorageUrl(signed.signedUrl),expires_in:60},headers);
 }
 if(req.method!=='POST')return json({error:'Method not allowed'},headers,405);
 const {user,privileged}=await authorize(req,true);
 const configuredMax=Number(Deno.env.get('APK_MAX_BYTES')||APK_MAX_BYTES);
 if(!Number.isSafeInteger(configuredMax)||configuredMax<=0)throw new Error('Invalid server APK upload limit');
 const max=Math.min(configuredMax,APK_MAX_BYTES);
 let release:{id:string;artifact_path:string}|null=null;
 let input:{bytes:Uint8Array;version:string;code:number;minimum:string;notes:string};
 if((req.headers.get('content-type')||'').startsWith('multipart/form-data')) input=await releaseInput(req,max);
 else {
  const id=new URL(req.url).searchParams.get('id')||'';
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))throw new Error('Choose an unverified release draft first');
  const draft=unwrap(await user.from('app_releases').select('*').eq('id',id).eq('status','draft').is('verified_at',null).maybeSingle());
  if(!draft)throw new Error('An unverified release draft is required');
  const bytes=await limitedBytes(req,max);
  validateUpload('apk',bytes.length,req.headers.get('content-type')||'application/octet-stream','package.apk',max);
  release={id:draft.id,artifact_path:draft.artifact_path};
  input={bytes,version:draft.version_name,code:draft.version_code,minimum:draft.min_android,notes:draft.release_notes};
 }
 const {bytes,version,code,minimum,notes}=input;
 if(bytes[0]!==80||bytes[1]!==75)throw new Error('APK must be an Android package ZIP');
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
 const checksum=createHash('sha256').update(bytes).digest('hex');
 release ||= unwrap(await user.rpc('create_release_draft',{p_version_name:version,p_version_code:code,p_min_android:minimum,p_notes:notes}));
 if(!release)throw new Error('Release draft is required');
 let offset=0;
 const uploadStream=new ReadableStream<Uint8Array>({pull(controller){if(offset>=bytes.length){controller.close();return;}const end=Math.min(offset+65536,bytes.length);controller.enqueue(bytes.subarray(offset,end));offset=end;}});
 unwrap(await privileged.storage.from('android-releases').upload(release.artifact_path,uploadStream,{contentType:'application/vnd.android.package-archive',upsert:false,duplex:'half'}));
 // Read it back: never trust upload metadata or a browser-provided checksum.
 const signed=requireData(await privileged.storage.from('android-releases').createSignedUrl(release.artifact_path,60));
 const stored=await fetch(signed.signedUrl,{signal:AbortSignal.timeout(60000)});
 if(!stored.ok||!stored.body)throw new Error('Stored artifact read-back failed. Draft remains unpublished.');
 const reader=stored.body.getReader();const savedHash=createHash('sha256');let savedSize=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;savedSize+=value.byteLength;if(savedSize>bytes.length){await reader.cancel();throw new Error('Stored artifact size mismatch. Draft remains unpublished.');}savedHash.update(value);}}finally{reader.releaseLock();}
 if(savedHash.digest('hex')!==checksum||savedSize!==bytes.length)throw new Error('Stored artifact verification failed. Draft remains unpublished.');
 unwrap(await privileged.from('app_releases').update({byte_size:savedSize,sha256:checksum,verified_at:new Date().toISOString()}).eq('id',release.id).eq('status','draft'));
 return json({id:release.id,sha256:checksum,byte_size:savedSize,status:'draft'},headers,201);
 }catch(error){return json({error:error instanceof Error?error.message:'Release operation failed'},headers,400);}
});
