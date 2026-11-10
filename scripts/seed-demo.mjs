import {createClient} from '@supabase/supabase-js';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY;
if(!url||!['localhost','127.0.0.1','::1','[::1]'].includes(new URL(url).hostname))throw new Error('Demo seed is restricted to a local Supabase project. Never seed production.');
if(!key)throw new Error('Set SUPABASE_SECRET_KEY to the local service-role/secret key.');
const db=createClient(url,key,{auth:{persistSession:false}});
const check=async q=>{const r=await q;if(r.error)throw r.error;return r.data;};
const fixtures=[['customerA','Alex Demo','customer'],['customerB','Casey Demo','customer'],['providerA','Miguel Demo','provider'],['providerB','Arturo Demo','provider'],['pendingProvider','Rafael Demo','customer'],['admin','Operations Demo','admin']];
const accounts={};const stamp=Date.now().toString(36);
for(const [name,full_name,role]of fixtures){const password=randomBytes(24).toString('base64url');const email=`${name.toLowerCase()}.${stamp}@example.test`;const data=await check(db.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name}}));const id=data.user.id;accounts[name]={id,email,password};await check(db.from('profiles').update({phone:'+639171234567'}).eq('id',id));await check(db.from('role_assignments').update({role}).eq('user_id',id));}
const categoryRows=(await check(db.from('categories').select('*').order('slug')));if(categoryRows.length<6)throw new Error('Run supabase db reset first to initialize the catalog.');
await check(db.from('app_settings').update({active:false}).eq('active',true));
await check(db.from('app_settings').insert({fee_centavos:5000,commission_bps:1000,support_email:'support@example.test',active:true,created_by:accounts.admin.id}));
const services=[];
for(const [index,name]of ['providerA','providerB','pendingProvider'].entries()){
const id=accounts[name].id;const profile={display_name:fixtures.find(r=>r[0]===name)[1],headline:index===1?'Plumbing service professional':'Electrical service professional',bio:'Fictional local development professional. This profile and all review information are illustrative.',city:'Makati City',service_areas:['Makati City','Taguig City']};
await check(db.from('provider_profiles').insert({id,...profile,status:name==='pendingProvider'?'pending':'approved'}));
await check(db.from('provider_applications').insert({provider_id:id,proposed_profile:profile,status:name==='pendingProvider'?'pending':'approved',reason:'Local fictional development fixture only'}));
const category=categoryRows.find(c=>c.slug===(index===1?'plumbing':'electrical'));
const [service]=await check(db.from('provider_services').insert({provider_id:id,category_id:category.id,title:index===1?'Kitchen plumbing inspection':'Electrical diagnostics',rate_centavos:index===1?40000:45000,duration_minutes:60,pricing_mode:'fixed'}).select());services.push(service);
await check(db.from('weekly_availability').insert([0,1,2,3,4,5,6].map(weekday=>({provider_id:id,weekday,starts_minute:480,ends_minute:1080}))));
}
const address={label:'Demo home',line1:'Unit 4, Fictional House, Example Street',city:'Makati City',postal_code:'1200'};
await check(db.from('addresses').insert({user_id:accounts.customerA.id,...address}));
function instant(offset,hour=9){const day=new Date(Date.now()+8*3600000+offset*86400000).toISOString().slice(0,10);return new Date(`${day}T${String(hour).padStart(2,'0')}:00:00+08:00`);}
const bookings=[];
for(const [i,status]of ['requested','confirmed','completed'].entries()){
const service=services[i===1?1:0],start=instant(i===2?-2:i+2),end=new Date(start.getTime()+3600000);const [b]=await check(db.from('bookings').insert({customer_id:accounts.customerA.id,provider_id:service.provider_id,provider_service_id:service.id,idempotency_key:randomUUID(),service_title:service.title,description:'Fictional development booking to demonstrate the service workflow.',address_snapshot:address,starts_at:start.toISOString(),ends_at:end.toISOString(),status,labor_centavos:service.rate_centavos,fee_centavos:5000,commission_bps:1000,commission_centavos:service.rate_centavos/10,total_centavos:service.rate_centavos+5000,is_estimate:false}).select());bookings.push(b);
await check(db.from('booking_events').insert({booking_id:b.id,actor_id:accounts.customerA.id,to_status:'requested',reason:'Development fixture'}));
if(status!=='requested')await check(db.from('booking_events').insert({booking_id:b.id,actor_id:service.provider_id,from_status:'requested',to_status:status,reason:'Development fixture'}));
const [conversation]=await check(db.from('conversations').insert({booking_id:b.id}).select());await check(db.from('conversation_members').insert([{conversation_id:conversation.id,user_id:b.customer_id},{conversation_id:conversation.id,user_id:b.provider_id}]));
await check(db.from('messages').insert({conversation_id:conversation.id,sender_id:b.provider_id,body:'Hello! This is an illustrative development conversation about your service request.',client_nonce:randomUUID()}));
const [payment]=await check(db.from('payments').insert({booking_id:b.id,method:status==='completed'?'manual_platform':'cash',status:status==='completed'?'paid':'pending',amount_centavos:b.total_centavos,settled_at:status==='completed'?new Date().toISOString():null,settled_by:status==='completed'?accounts.admin.id:null}).select());
if(status==='completed'){
await check(db.from('invoices').insert({booking_id:b.id,invoice_number:'INV-'+b.reference,labor_centavos:b.labor_centavos,fee_centavos:b.fee_centavos,total_centavos:b.total_centavos}));
await check(db.from('payment_events').insert({payment_id:payment.id,event_key:randomUUID(),status:'paid',source:'authorized_manual',actor_id:accounts.admin.id,reason:'Illustrative local development settlement; no actual money moved.'}));
await check(db.from('commission_ledger').insert({booking_id:b.id,provider_id:b.provider_id,labor_centavos:b.labor_centavos,commission_centavos:b.commission_centavos,platform_fee_centavos:b.fee_centavos,held_net_centavos:b.labor_centavos-b.commission_centavos,cash_commission_due_centavos:0}));
}
}
const [support]=await check(db.from('support_cases').insert({owner_id:accounts.customerA.id,booking_id:bookings[0].id,subject:'Example scheduling question',body:'This fictional case demonstrates a customer-visible support conversation.'}).select());
await check(db.from('case_messages').insert({case_id:support.id,sender_id:accounts.admin.id,body:'This is a customer-visible sample support reply.'}));
await check(db.from('case_notes').insert({case_id:support.id,admin_id:accounts.admin.id,body:'Internal development note. This must never be visible to customers or providers.'}));
await check(db.from('announcements').insert({title:'Welcome to the local development preview',body:'All people, prices and operational records in this local project are fictional sample data.',audience:'everyone',status:'published',publish_at:new Date().toISOString(),created_by:accounts.admin.id}));
await check(db.from('notifications').insert({user_id:accounts.customerA.id,title:'Development fixture ready',body:'Your sample bookings are available in your dashboard.',href:'/dashboard/'}));
await check(db.from('audit_logs').insert({actor_id:accounts.admin.id,action:'local_demo_seed',entity:'development',details:{fictional:true}}));
await mkdir('.cache',{recursive:true});await writeFile('.cache/demo-users.json',JSON.stringify({accounts,bookings:bookings.map(b=>({id:b.id,status:b.status})),services:services.map(s=>s.id),caseId:support.id},null,2));
console.log('Local fictional data created. Credentials were saved only to ignored .cache/demo-users.json. No APK was fabricated or seeded.');
