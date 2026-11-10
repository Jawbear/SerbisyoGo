import {authorize,clients,cors,json,limitedFile,unwrap} from '../_shared/http.ts';
import {validateUpload} from '../../../src/lib/domain.ts';
const signatures=(b:Uint8Array,m:string)=>m==='application/pdf'?new TextDecoder().decode(b.slice(0,5))==='%PDF-':m==='image/png'?b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71:m==='image/jpeg'?b[0]===255&&b[1]===216&&b[2]===255:m==='image/webp'?new TextDecoder().decode(b.slice(0,4))==='RIFF'&&new TextDecoder().decode(b.slice(8,12))==='WEBP':false;
Deno.serve(async req=>{
 let headers:Record<string,string>={};try{
 headers=cors(req);if(req.method==='OPTIONS')return new Response(null,{headers});
 const url=new URL(req.url);
 if(req.method==='GET'&&url.searchParams.has('avatar')){
   const pid=url.searchParams.get('avatar')!;const {privileged}=clients(req);
   const p=unwrap(await privileged.from('provider_profiles').select('id,avatar_path').eq('id',pid).eq('status','approved').maybeSingle());
   const active=unwrap(await privileged.from('profiles').select('status').eq('id',pid).maybeSingle());
   if(!p?.avatar_path||active?.status!=='active')return json({error:'Avatar unavailable'},headers,404);
   const signed=unwrap(await privileged.storage.from('avatars').createSignedUrl(p.avatar_path,60));
   return new Response(null,{status:302,headers:{...headers,Location:signed.signedUrl,'Cache-Control':'no-store'}});
 }
 const {user,privileged,identity}=await authorize(req);
 if(req.method==='GET'){
   const id=url.searchParams.get('id');if(!id)return json({error:'File ID required'},headers,400);
   const f=unwrap(await user.from('files').select('*').eq('id',id).maybeSingle());
   if(!f)return json({error:'File not found'},headers,404);
   const signed=unwrap(await privileged.storage.from(f.bucket).createSignedUrl(f.path,60,{download:f.original_name}));
   return json({url:signed.signedUrl,expires_in:60},headers);
 }
 if(req.method!=='POST')return json({error:'Method not allowed'},headers,405);
 const form=await limitedFile(req,10485760);const file=form.get('file');const kind=String(form.get('kind')||'');
 if(!(file instanceof File)||!['verification','booking','support','avatar'].includes(kind))throw new Error('Valid file and kind are required');
 validateUpload(kind,file.size,file.type,file.name,kind==='avatar'?5242880:10485760);
 const bytes=new Uint8Array(await file.arrayBuffer());if(!signatures(bytes,file.type))throw new Error('File contents do not match the declared type');
 const booking=String(form.get('booking_id')||'')||null;const caseId=String(form.get('case_id')||'')||null;const draftId=String(form.get('draft_id')||'')||null;
 if(kind==='verification'){
 const p=unwrap(await user.from('provider_profiles').select('id').eq('id',identity.id).maybeSingle());if(!p)throw new Error('Provider application required');
 }
 if(kind==='booking') {if(draftId){const draft=unwrap(await user.from('booking_drafts').select('id').eq('id',draftId).eq('customer_id',identity.id).maybeSingle());if(!draft)throw new Error('Own draft required');}else if(!booking||!unwrap(await user.rpc('booking_member',{bid:booking})))throw new Error('Assigned booking required');}
 if(kind==='support') {if(!caseId)throw new Error('Support case required');const isOwner=unwrap(await user.rpc('case_owner',{cid:caseId}));const admin=unwrap(await user.rpc('is_admin'));if(!isOwner&&!admin)throw new Error('Support case access required');}
 const bucket=kind==='avatar'?'avatars':'private-files';const extension=file.type==='image/jpeg'?'jpg':file.type==='image/png'?'png':file.type==='image/webp'?'webp':'pdf';
 const id=crypto.randomUUID();const path=`${identity.id}/${kind}/${id}.${extension}`;
 unwrap(await privileged.storage.from(bucket).upload(path,bytes,{contentType:file.type,upsert:false}));
 const record=await privileged.from('files').insert({id,owner_id:identity.id,kind,bucket,path,booking_id:kind==='booking'&&!draftId?booking:null,draft_id:kind==='booking'?draftId:null,case_id:kind==='support'?caseId:null,original_name:file.name.slice(0,200),mime_type:file.type,byte_size:file.size});
 if(record.error){await privileged.storage.from(bucket).remove([path]);throw new Error(record.error.message);}
 if(kind==='avatar'){
 unwrap(await privileged.from('profiles').update({avatar_path:path}).eq('id',identity.id));
 unwrap(await privileged.from('provider_profiles').update({avatar_path:path}).eq('id',identity.id));
 }
 return json({id,path},headers,201);
 }catch(error){return json({error:error instanceof Error?error.message:'File operation failed'},headers,400);}
});
