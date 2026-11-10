import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
import {unzipSync} from 'fflate';
import {readAndroidManifest,androidVersions} from '../../src/lib/apk';
type Credentials={id:string;email:string;password:string};
type Fixtures={accounts:Record<string,Credentials>;bookings:{id:string;status:string}[];services:string[];caseId:string};
const url=process.env.TEST_SUPABASE_URL,key=process.env.TEST_SUPABASE_PUBLISHABLE_KEY,secret=process.env.TEST_SUPABASE_SECRET_KEY;
const configured=Boolean(url&&key&&secret&&['127.0.0.1','localhost'].includes(new URL(url).hostname));
let fixtures:Fixtures;
test.beforeAll(async()=>{if(configured)fixtures=JSON.parse(await readFile('.cache/demo-users.json','utf8')) as Fixtures;});
test.skip(!configured,'Requires an isolated local Supabase project, local demo seed, Edge Functions and test credentials; never run against production.');
async function signIn(page:Page,who:string){await page.goto('/login/');await page.getByLabel('Email address',{exact:true}).fill(fixtures.accounts[who].email);await page.getByLabel('Password',{exact:true}).fill(fixtures.accounts[who].password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page).toHaveURL(/dashboard|provider|admin/);}
function client(who?:string){const c=createClient(url!,who?key!:secret!,{auth:{persistSession:false}});return c;}
async function signed(who:string){const c=client(who);const {error}=await c.auth.signInWithPassword(fixtures.accounts[who]);if(error)throw error;return c;}
test('customer signs in and persists account changes',async({page})=>{await signIn(page,'customerA');await page.goto('/account/');await page.getByLabel('Full name',{exact:true}).fill('Alex Demo Updated');await page.getByRole('button',{name:'Save profile'}).click();await expect(page.getByText('Saved successfully',{exact:true})).toBeVisible();await page.reload();await expect(page.getByLabel('Full name',{exact:true})).toHaveValue('Alex Demo Updated');});
test('customer finds a professional, schedules a persisted booking and provider follows the state machine',async({page})=>{
 const c=await signed('customerA');const {data:service,error}=await c.from('provider_services').select('*').eq('id',fixtures.services[1]).single();if(error)throw error;
 await signIn(page,'customerA');await page.goto(`/providers/profile/?id=${service.provider_id}`);await page.getByRole('link',{name:'Request service'}).first().click();
 await page.getByLabel('Describe the task').fill('Integration test kitchen plumbing diagnostics.');await page.getByLabel('City / municipality').fill('Makati City');await page.getByLabel('Complete service address').fill('Fictional integration test residence, Example Street');await page.getByLabel('Postal code').fill('1200');await page.getByRole('button',{name:'Save & choose a schedule'}).click();
 const day=new Date(Date.now()+5*86400000).toISOString().slice(0,10);await page.getByLabel('Service date').fill(day);await page.locator('input[name="starts_at"]').first().check();await page.getByRole('button',{name:'Save & review request'}).click();await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Submit booking request'}).click();await expect(page.getByRole('heading',{name:'Booking request received.'})).toBeVisible();
 const bookingId=new URL(page.url()).searchParams.get('id')!;const p=await signed('providerB');
 for(const status of ['confirmed','en_route','in_progress','completed']){const {error}=await p.rpc('transition_booking',{p_booking:bookingId,p_status:status,p_reason:''});expect(error).toBeNull();}
 await page.goto(`/bookings/invoice/?id=${bookingId}`);await expect(page.getByRole('heading',{name:'Service invoice',exact:true})).toBeVisible();
 await page.goto(`/bookings/review/?id=${bookingId}`);await page.locator('input[name="rating"][value="5"]').check();await page.getByLabel('Your review').fill('A useful fictional test service with clear communication.');await page.getByRole('button',{name:'Publish review'}).click();await expect(page.getByRole('heading',{name:'Thank you for sharing your experience.'})).toBeVisible();
});
test('members exchange messages; second customer and provider are denied',async({page})=>{
 const b=fixtures.bookings[0].id;const a=await signed('customerA');const {data:conversation}=await a.from('conversations').select('id').eq('booking_id',b).single();expect(conversation).toBeTruthy();
 await signIn(page,'customerA');await page.goto(`/messages/?booking=${b}`);await page.getByLabel('Your message').fill('Authorized customer integration message');await page.getByRole('button',{name:'Send message'}).click();await expect(page.getByText('Authorized customer integration message',{exact:true})).toBeVisible();
 const p=await signed('providerA');const reply=await p.rpc('send_message',{p_conversation:conversation!.id,p_body:'Authorized provider response',p_nonce:crypto.randomUUID()});expect(reply.error).toBeNull();await expect(page.getByText('Authorized provider response',{exact:true})).toBeVisible({timeout:35000});
 for(const who of ['customerB','providerB']){const outsider=await signed(who);const {data}=await outsider.from('messages').select('*').eq('conversation_id',conversation!.id);expect(data).toEqual([]);const response=await outsider.rpc('send_message',{p_conversation:conversation!.id,p_body:'Unauthorized message',p_nonce:crypto.randomUUID()});expect(response.error).toBeTruthy();}
});
test('complaint has a visible reply and private administrative notes',async({page})=>{
 await signIn(page,'customerA');await page.goto('/support/');await page.getByLabel('Subject',{exact:true}).fill('Integration test service concern');await page.getByLabel('Tell us what happened').fill('A fictional complaint to validate separate customer and internal threads.');await page.getByRole('button',{name:'Submit support case'}).click();const caseId=new URL(page.url()).searchParams.get('case')!;expect(caseId).toBeTruthy();
 const admin=await signed('admin');for(const [action,data]of [['note',{body:'INTERNAL ONLY integration evidence'}],['reply',{body:'Customer-visible integration reply'}],['update',{priority:'normal',status:'resolved',resolution:'Fictional case resolved after reviewing the service concern.'}]] as const){expect((await admin.rpc('admin_action',{p_entity:'case',p_id:caseId,p_action:action,p_data:data})).error).toBeNull();}
 await page.reload();await expect(page.getByText('Customer-visible integration reply',{exact:true})).toBeVisible();await expect(page.getByText('INTERNAL ONLY integration evidence')).toHaveCount(0);
 const a=await signed('customerA');expect((await a.from('case_notes').select('*').eq('case_id',caseId)).data).toEqual([]);
});
test('admin manages categories and announcements with audit records; non-admin direct calls fail',async({page})=>{
 const admin=await signed('admin');const name='Test category '+Date.now();const {data:id,error}=await admin.rpc('admin_action',{p_entity:'category',p_id:null,p_action:'save',p_data:{name,slug:'integration-'+Date.now(),description:'Fictional integration category',active:true}});expect(error).toBeNull();
 const announcement=await admin.rpc('admin_action',{p_entity:'announcement',p_id:null,p_action:'save',p_data:{title:'Integration notice',body:'A fictional integration announcement.',audience:'everyone',status:'published',publish_at:new Date().toISOString()}});expect(announcement.error).toBeNull();
 const {data:audit}=await admin.from('audit_logs').select('*').eq('entity_id',id);expect(audit!.length).toBeGreaterThan(0);
 await signIn(page,'admin');await page.goto('/admin/reports/');await expect(page.getByRole('heading',{name:'Booking activity'})).toBeVisible();
 for(const who of ['customerA','customerB','providerA','providerB']){const c=await signed(who);expect((await c.rpc('admin_action',{p_entity:'category',p_id:id,p_action:'archive'})).error).toBeTruthy();expect((await c.from('audit_logs').select('*')).data).toEqual([]);expect((await c.rpc('admin_report',{p_from:new Date(Date.now()-86400000).toISOString(),p_to:new Date().toISOString()})).error).toBeTruthy();}
});
test('draft APKs cannot be published without verified artifacts or downloaded publicly',async()=>{
 const admin=await signed('admin');const {data:r,error}=await admin.rpc('create_release_draft',{p_version_name:'1.0.0',p_version_code:Math.floor(Date.now()/1000),p_min_android:'8.0',p_notes:'Private test draft with no package artifact.'});expect(error).toBeNull();expect((await admin.rpc('publish_release',{p_release:r.id,p_archive:false})).error).toBeTruthy();
 const anon=createClient(url!,key!,{auth:{persistSession:false}});expect((await anon.from('app_releases').select('*').eq('id',r.id)).data).toEqual([]);
 for(const who of ['customerA','providerB']){const c=await signed(who);expect((await c.rpc('publish_release',{p_release:r.id,p_archive:false})).error).toBeTruthy();expect((await c.storage.from('android-releases').download(r.artifact_path)).error).toBeTruthy();}
 const response=await fetch(`${url}/functions/v1/releases?id=${r.id}`,{headers:{apikey:key!}});expect(response.status).toBe(404);
});
test('private verification uploads require ownership for signed file access',async()=>{
 const provider=await signed('providerA');const {data:{session}}=await provider.auth.getSession();
 // A harmless test pixel, explicitly not an identity document.
 const bytes=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=','base64'));
 const form=new FormData();form.set('file',new File([bytes.buffer],'test-pixel.png',{type:'image/png'}));form.set('kind','verification');
 const uploaded=await fetch(`${url}/functions/v1/files`,{method:'POST',headers:{apikey:key!,Authorization:`Bearer ${session!.access_token}`},body:form});const file=await uploaded.json();expect(uploaded.ok,JSON.stringify(file)).toBe(true);
 const own=await fetch(`${url}/functions/v1/files?id=${file.id}`,{headers:{apikey:key!,Authorization:`Bearer ${session!.access_token}`}});expect(own.ok).toBe(true);
 for(const who of ['providerB','customerA','customerB']){const outsider=await signed(who);const {data:{session:s}}=await outsider.auth.getSession();expect((await outsider.from('files').select('*').eq('id',file.id)).data).toEqual([]);const denied=await fetch(`${url}/functions/v1/files?id=${file.id}`,{headers:{apikey:key!,Authorization:`Bearer ${s!.access_token}`}});expect(denied.status).toBe(404);}
});
test('registration verifies an actual configured Supabase email link',async({page,request})=>{
 test.skip(!process.env.TEST_INBOX_URL,'Requires the local Inbucket test inbox API; never use a real mailbox.');
 const local='registration.'+Date.now()+'.'+Math.random().toString(16).slice(2);const email=local+'@example.test';const password=crypto.randomUUID()+crypto.randomUUID();
 await page.goto('/register/');await page.getByLabel('Full name',{exact:true}).fill('Registration Demo');await page.getByLabel('Philippine mobile number').fill('09171234567');await page.getByLabel('Email address',{exact:true}).fill(email);await page.getByLabel('Create password',{exact:true}).count().then(async count=>{if(count)await page.getByLabel('Create password',{exact:true}).fill(password);else await page.getByLabel('Password',{exact:true}).fill(password);});await page.getByLabel('Confirm password').fill(password);await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Create an account',exact:true}).click();await expect(page).toHaveURL(/verify/);
 let messages:{id:string}[]=[];await expect.poll(async()=>{const response=await request.get(`${process.env.TEST_INBOX_URL}/api/v1/mailbox/${local}`);messages=response.ok()?await response.json():[];return messages.length;},{timeout:30000}).toBeGreaterThan(0);
 const mail=await (await request.get(`${process.env.TEST_INBOX_URL}/api/v1/mailbox/${local}/${messages[0].id}`)).json();const html=String(mail.body?.html||mail.body?.text||'');const link=html.match(/https?:\/\/[^\s"<>]+\/auth\/v1\/verify[^\s"<>]*/)?.[0]?.replaceAll('&amp;','&');expect(link).toBeTruthy();await page.goto(link!);await expect(page).toHaveURL(/dashboard/,{timeout:30000});await expect(page.getByRole('heading',{name:/Welcome back/})).toBeVisible();
});
test('an actual test APK can be verified, published locally, downloaded and archived',async({page})=>{
 test.skip(!process.env.TEST_APK_PATH,'No real developer test APK supplied; do not fabricate a package.');
 const bytes=await readFile(process.env.TEST_APK_PATH!);const entries=unzipSync(bytes,{filter:e=>e.name==='AndroidManifest.xml'});const manifest=readAndroidManifest(entries['AndroidManifest.xml']);const admin=await signed('admin');const {data:{session}}=await admin.auth.getSession();
 const form=new FormData();form.set('file',new File([bytes],'serbisyogo.apk',{type:'application/vnd.android.package-archive'}));form.set('version_name',manifest.version_name);form.set('version_code',String(manifest.version_code));form.set('min_android',androidVersions[manifest.min_sdk]);form.set('release_notes','Local test release supplied by the developer. No public deployment.');
 const response=await fetch(`${url}/functions/v1/releases`,{method:'POST',headers:{Authorization:`Bearer ${session!.access_token}`,apikey:key!},body:form});const release=await response.json();expect(response.ok,JSON.stringify(release)).toBe(true);expect(release.sha256).toMatch(/^[a-f0-9]{64}$/);
 expect((await admin.rpc('publish_release',{p_release:release.id,p_archive:false})).error).toBeNull();
 try{await page.goto('/download/');await expect(page.getByRole('button',{name:'Download APK',exact:true})).toBeVisible();const download=await fetch(`${url}/functions/v1/releases?id=${release.id}`,{headers:{apikey:key!}});expect(download.ok).toBe(true);const signedUrl=await download.json();const binary=await fetch(signedUrl.url);expect(binary.ok).toBe(true);expect((await binary.arrayBuffer()).byteLength).toBe(bytes.length);}finally{await admin.rpc('publish_release',{p_release:release.id,p_archive:true});}
});
