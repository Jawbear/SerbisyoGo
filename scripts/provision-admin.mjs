import {createClient} from '@supabase/supabase-js';
const email=process.argv[2];
if(!email||process.argv[3]!=='--confirm'||process.argv[4]!==email)throw new Error('Usage: npm run admin:provision -- you@example.com --confirm you@example.com');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY;
if(!url||!key)throw new Error('Configure the project URL and a server-only Supabase secret key in .env.local');
const db=createClient(url,key,{auth:{persistSession:false}});
let account;for(let page=1;page<=1000;page++){const {data,error}=await db.auth.admin.listUsers({page,perPage:1000});if(error)throw error;account=data.users.find(u=>u.email?.toLowerCase()===email.toLowerCase());if(account||data.users.length<1000)break;}
if(!account||!account.email_confirmed_at)throw new Error('Create and verify this account through Supabase Auth first.');
const {error}=await db.from('role_assignments').update({role:'admin',granted_by:account.id}).eq('user_id',account.id);if(error)throw error;
const {error:auditError}=await db.from('audit_logs').insert({actor_id:account.id,action:'initial_admin_provision',entity:'role_assignments',entity_id:account.id,details:{source:'owner-controlled provisioning script'}});if(auditError)throw auditError;
console.log('Administrator role provisioned for the verified account. No password or key was printed.');
