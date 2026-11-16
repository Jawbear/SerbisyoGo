import {createClient} from 'npm:@supabase/supabase-js@2';
import {corsHeaders} from './cors.ts';
import {publicStorageUrl} from './storage-url.ts';
export function browserStorageUrl(url:string) {
  return publicStorageUrl(url,Deno.env.get('SUPABASE_URL')!,Deno.env.get('PUBLIC_SUPABASE_URL')||Deno.env.get('SUPABASE_URL')!);
}
export {limitedFile} from './upload.ts';
export function cors(req:Request) {
  return corsHeaders(req,Deno.env.get('ALLOWED_ORIGINS')||'http://localhost:3000');
}
export function json(data:unknown,headers:Record<string,string>,status=200) {return new Response(JSON.stringify(data),{status,headers:{...headers,'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})}
export function clients(req:Request) {
  const url=Deno.env.get('SUPABASE_URL')!;
  const pub=Deno.env.get('SUPABASE_ANON_KEY')!;
  const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return {
    user:createClient(url,pub,{global:{headers:{Authorization:req.headers.get('authorization')||''}},auth:{persistSession:false}}),
    privileged:createClient(url,secret,{auth:{persistSession:false}})
  };
}
export async function authorize(req:Request,admin=false) {
  const c=clients(req);
  const {data:{user},error}=await c.user.auth.getUser();
  if(error||!user) throw new Error('Authentication required');
  const {data:active}=await c.user.rpc('active_user');
  if(!active) throw new Error('Active account required');
  if(admin){const {data:ok}=await c.user.rpc('is_admin');if(!ok)throw new Error('Administrator access required');}
  return {...c,identity:user};
}
export function unwrap<T>(result:{data:T;error:{message:string}|null}) {if(result.error)throw new Error(result.error.message);return result.data;}
export function requireData<T>(result:{data:T;error:{message:string}|null}):NonNullable<T> {
  const data=unwrap(result);
  if(data===null||data===undefined)throw new Error('The storage operation returned no data.');
  return data;
}
