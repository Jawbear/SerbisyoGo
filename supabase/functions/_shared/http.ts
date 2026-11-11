import {createClient} from 'npm:@supabase/supabase-js@2';
export function cors(req:Request) {
  const origin=req.headers.get('origin')||'';
  const allowed=(Deno.env.get('ALLOWED_ORIGINS')||'http://localhost:3000').split(',').map(s=>s.trim());
  if(origin&&!allowed.includes(origin)) throw new Error('Origin is not allowed');
  return {'Access-Control-Allow-Origin':origin||allowed[0],'Access-Control-Allow-Headers':'authorization, apikey, x-client-info, content-type','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Vary':'Origin'};
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
export async function limitedFile(req:Request,max:number) {
  const length=Number(req.headers.get('content-length')||0);
  if(length>max+1048576)throw new Error('Upload exceeds configured size limit');
  // Stream into a bounded buffer before parsing multipart (limits chunked requests too).
  const reader=req.body?.getReader();if(!reader)throw new Error('File is required');
  const chunks:Uint8Array[]=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max+1048576){await reader.cancel();throw new Error('Upload exceeds configured size limit');}chunks.push(value);}
  const body=new Uint8Array(size);let offset=0;for(const c of chunks){body.set(c,offset);offset+=c.length;}
  return new Request(req.url,{method:'POST',headers:{'Content-Type':req.headers.get('content-type')||''},body}).formData();
}
