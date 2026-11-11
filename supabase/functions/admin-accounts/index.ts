import {authorize,json,unwrap} from '../_shared/http.ts';
import {uuid,text,email,phone,password} from './validation.ts';

function accountCors(req:Request) {
 const origin=req.headers.get('origin')||'';
 const allowed=(Deno.env.get('ADMIN_ALLOWED_ORIGINS')||'http://localhost:3000,http://127.0.0.1:3000,http://localhost:8081,http://127.0.0.1:8081,https://serbisyogo.sg-team.workers.dev').split(',').map(s=>s.trim());
 if(origin&&!allowed.includes(origin))throw new Error('Origin is not allowed');
 return {'Access-Control-Allow-Origin':origin||allowed[0],'Access-Control-Allow-Headers':'authorization, apikey, x-client-info, content-type','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Vary':'Origin'};
}
type Plan={files:{bucket:string;path:string}[];counts:Record<string,number>};
type Purge={operation_id:string;phase:'files'|'auth';plan:Plan};
function authOk(result:{error:{message:string}|null}) {if(result.error)throw new Error(result.error.message);}

Deno.serve(async req=>{
 let headers:Record<string,string>={};let deleting=false;
 try{
  headers=accountCors(req);if(req.method==='OPTIONS')return new Response(null,{headers});
  if(!['GET','POST'].includes(req.method))return json({error:'Method not allowed'},headers,405);
  const {user,privileged,identity}=await authorize(req,true);
  const account=async(id:string)=>{
   const data=unwrap(await user.rpc('admin_accounts',{p_id:id,p_limit:1}));
   return data?.rows?.[0]||null;
  };
  if(req.method==='GET'){
   const params=new URL(req.url).searchParams;
   if(params.get('preview')){
    const id=uuid(params.get('preview'));const plan=unwrap(await privileged.rpc('admin_account_purge_plan',{p_actor:identity.id,p_target:id})) as Plan;
    return json({counts:plan.counts,irreversible:true},headers);
   }
   const limit=Number(params.get('limit')||25),offset=Number(params.get('offset')||0);
   if(!Number.isSafeInteger(limit)||!Number.isSafeInteger(offset))throw new Error('Invalid pagination');
   const data=unwrap(await user.rpc('admin_accounts',{p_id:params.get('id')?uuid(params.get('id')):null,p_search:params.get('search')||'',p_role:params.get('role')||'',p_status:params.get('status')||'',p_limit:limit,p_offset:offset}));
   return json(data,headers);
  }
  const raw=await req.text();if(new TextEncoder().encode(raw).length>16384)throw new Error('Request is too large');
  const body=JSON.parse(raw);if(!body||Array.isArray(body)||typeof body!=='object')throw new Error('Invalid account request');
  const action=String(body.action||'');const reason=text(body.reason,'Reason',5,1000);
  if(action==='create'){
   const name=text(body.full_name,'Full name',2,100),address=email(body.email),mobile=phone(body.phone),secret=password(body.password);
   const role=String(body.role||'customer');if(!['customer','admin'].includes(role))throw new Error('Create a customer account first; provider approval uses the verification workflow');
   const id=crypto.randomUUID();unwrap(await user.rpc('admin_account_auth_guard',{p_id:id,p_action:'account_created',p_reason:reason}));
   const created=await privileged.auth.admin.createUser({id,email:address,password:secret,email_confirm:body.email_verified===true,user_metadata:{full_name:name}});authOk(created);
   const createdUser=created.data.user;if(!createdUser)throw new Error('The account could not be created');
   const saved=await user.rpc('admin_save_account',{p_id:createdUser.id,p_name:name,p_phone:mobile,p_status:'active',p_role:role,p_reason:reason});
   if(saved.error){await privileged.from('profiles').update({status:'deactivated'}).eq('id',createdUser.id);throw new Error('The account was created but setup failed. It has been disabled; finish its setup from User accounts.');}
   return json({account:await account(createdUser.id)},headers,201);
  }
  const id=uuid(body.id);
  if(action==='profile'){
   const name=text(body.full_name,'Full name',2,100),mobile=phone(body.phone);
   unwrap(await user.rpc('admin_save_account',{p_id:id,p_name:name,p_phone:mobile,p_status:String(body.status||''),p_role:String(body.role||''),p_reason:reason,p_updated_at:body.updated_at||null}));
   return json({account:await account(id)},headers);
  }
  if(action==='email'||action==='password'||action==='verify_email'){
   const operation=action==='email'?'email_change':action==='password'?'password_reset':'email_verified';
   const values:Record<string,string|boolean>={};
   if(action==='email'){if(body.email_verified!==true)throw new Error('Verify ownership of the new email address before changing it');values.email=email(body.email);values.email_confirm=true;}
   if(action==='password'){values.password=password(body.password);if(body.password_confirmation!==body.password)throw new Error('Password confirmation does not match');}
   if(action==='verify_email'){if(body.email_verified!==true)throw new Error('Administrator verification is required');values.email_confirm=true;}
   unwrap(await user.rpc('admin_account_auth_guard',{p_id:id,p_action:operation,p_reason:reason}));
   authOk(await privileged.auth.admin.updateUserById(id,values));
   return json({account:await account(id),updated:true},headers);
  }
  if(action==='delete'){
   const confirmation=text(body.confirmation,'Deletion confirmation',1,254);
   const job=unwrap(await privileged.rpc('admin_begin_account_purge',{p_actor:identity.id,p_target:id,p_confirmation:confirmation,p_reason:reason})) as Purge;
   deleting=true;
   if(job.phase==='files'){
    const target=await privileged.auth.admin.getUserById(id);
    if(target.error&&target.error.status!==404&&!['user_not_found','not_found'].includes(target.error.code||''))throw new Error(target.error.message);
    if(target.data.user)authOk(await privileged.auth.admin.updateUserById(id,{ban_duration:'876000h'}));
   }
   const plan=unwrap(await privileged.rpc('admin_account_purge_plan',{p_actor:identity.id,p_target:id})) as Plan;
    const buckets=new Map<string,string[]>();
    for(const file of plan.files){if(!buckets.has(file.bucket))buckets.set(file.bucket,[]);buckets.get(file.bucket)!.push(file.path);}
    for(const [bucket,paths]of buckets)for(let start=0;start<paths.length;start+=100)unwrap(await privileged.storage.from(bucket).remove(paths.slice(start,start+100)));
   if(job.phase==='files')unwrap(await privileged.rpc('admin_purge_account_records',{p_actor:identity.id,p_target:id,p_operation:job.operation_id}));
   const current=await privileged.auth.admin.getUserById(id);
   if(current.data.user)authOk(await privileged.auth.admin.deleteUser(id,false));
   else if(current.error&&!['user_not_found','not_found'].includes(current.error.code||'')&&current.error.status!==404)throw new Error(current.error.message);
   unwrap(await privileged.rpc('admin_finish_account_purge',{p_actor:identity.id,p_target:id,p_operation:job.operation_id}));
   return json({deleted:true,counts:job.plan.counts},headers);
  }
  throw new Error('Unknown account action');
 }catch(error){
  const message=error instanceof Error?error.message:'Account operation failed';
  const status=/Authentication required/.test(message)?401:/Administrator access|Active account required|Origin is not allowed/.test(message)?403:deleting?409:400;
  return json({error:deleting?`Permanent deletion is incomplete and the account remains disabled. Retry deletion. ${message}`:message,deletion_pending:deleting},headers,status);
 }
});
