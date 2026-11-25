import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
import {unzipSync} from 'fflate';
import {readAndroidManifest,androidVersions} from '../../src/lib/apk';
import {verificationEmailLink} from '../local-inbox';
import {postgresFeedReady} from '../../mobile/src/data/receiptReviews.js';
type Credentials={id:string;email:string;password:string};
type Fixtures={accounts:Record<string,Credentials>;bookings:{id:string;status:string}[];services:string[];caseId:string};
const url=process.env.TEST_SUPABASE_URL,key=process.env.TEST_SUPABASE_PUBLISHABLE_KEY,secret=process.env.TEST_SUPABASE_SECRET_KEY;
const configured=Boolean(url&&key&&secret&&['127.0.0.1','localhost'].includes(new URL(url).hostname));
let fixtures:Fixtures;
test.beforeAll(async()=>{if(configured)fixtures=JSON.parse(await readFile('.cache/demo-users.json','utf8')) as Fixtures;});
test.skip(!configured,'Requires an isolated local Supabase project, local demo seed, Edge Functions and test credentials; never run against production.');
test.beforeEach(async({context,baseURL})=>{
 const loopback=(value:string)=>['localhost','127.0.0.1','[::1]'].includes(new URL(value).hostname);
 if(!baseURL || !loopback(baseURL))throw new Error('Persisted staging workflows require a loopback website.');
 await context.route(/^https?:/,route=>loopback(route.request().url())?route.continue():route.abort('blockedbyclient'));
});
async function signIn(page:Page,who:string){await page.goto('/login/');await page.getByLabel('Email address',{exact:true}).fill(fixtures.accounts[who].email);await page.getByLabel('Password',{exact:true}).fill(fixtures.accounts[who].password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page).toHaveURL(/dashboard|provider|admin/);}
function client(who?:string){const c=createClient(url!,who?key!:secret!,{auth:{persistSession:false}});return c;}
async function signed(who:string){const c=client(who);const {error}=await c.auth.signInWithPassword(fixtures.accounts[who]);if(error)throw error;return c;}

test('recipient verification is enforced through the real API before enabling GCash',async()=>{
 const admin=await signed('admin'),customer=await signed('customerA');
 const settings={p_name:'Isolated Fictional Wallet',p_phone:'09170000001',p_instructions:'Disposable local service validation',p_enabled:true,p_qr_url:null,p_recipient_verified:false};
 expect((await admin.rpc('save_gcash_settings',settings)).error?.message).toContain('Verify the recipient');
 expect((await customer.rpc('save_gcash_settings',{...settings,p_recipient_verified:true})).error).toBeTruthy();
 expect((await admin.rpc('save_gcash_settings',{...settings,p_recipient_verified:true})).error).toBeNull();
 const verified=await admin.from('gcash_settings').select('enabled,recipient_verified_at,recipient_verified_by').single();
 expect(verified.error).toBeNull();expect(verified.data?.enabled).toBe(true);expect(verified.data?.recipient_verified_at).toBeTruthy();expect(verified.data?.recipient_verified_by).toBe(fixtures.accounts.admin.id);
 expect((await admin.rpc('save_gcash_settings',{...settings,p_phone:'09170000002'})).error?.message).toContain('Verify the recipient');
 expect((await admin.rpc('save_gcash_settings',{...settings,p_phone:'09170000002',p_enabled:false})).error).toBeNull();
 const disabled=await admin.from('gcash_settings').select('enabled,recipient_verified_at').single();expect(disabled.data?.enabled).toBe(false);expect(disabled.data?.recipient_verified_at).toBeNull();
});

test('staging manual receipt review reaches customer and provider over Realtime', async ({page}) => {
  test.setTimeout(90000);
  const customer = await signed('customerA');
  const provider = await signed('providerB');
  const admin = await signed('admin');
  const booking = fixtures.bookings.find(row => row.status === 'confirmed')!.id;
  for (const status of ['en_route', 'in_progress', 'completed']) {
    await provider.rpc('transition_booking', { p_booking: booking, p_status: status, p_reason: '' }).throwOnError();
  }
  const { data: payment } = await customer.from('payments').select('id,amount_centavos,status')
    .eq('booking_id', booking).single().throwOnError();
  expect(payment!.status).toBe('pending');
  const phone = '09170000001';
  await admin.rpc('save_gcash_settings', {
    p_name: 'Isolated Test Wallet', p_phone: phone, p_instructions: 'Staging simulation only',
    p_enabled: true, p_qr_url: null, p_recipient_verified: true
  }).throwOnError();

  let providerReady = false, customerReady = false, providerSawPaid = false;
  const observedReviews = new Map<string, string>();
  const subscribedAt = Date.now();
  function feedStatus(role: string, message: { extension: string; status: string }) {
    const ready = postgresFeedReady(message);
    if (ready) console.info(`${role} PostgreSQL feed ready after ${Date.now() - subscribedAt} ms`);
    return ready;
  }
  const providerChannel = provider.channel('payment-' + payment!.id)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'payments', filter: 'id=eq.' + payment!.id },
      change => { if (change.new.status === 'paid') providerSawPaid = true; });
  const customerChannel = customer.channel('review-' + payment!.id)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'gcash_submissions', filter: 'payment_id=eq.' + payment!.id },
      change => { observedReviews.set(change.new.id, change.new.status); });
  try {
    providerChannel.on('system', {}, message => { if (message.extension === 'postgres_changes') providerReady = feedStatus('Provider', message); }).subscribe();
    customerChannel.on('system', {}, message => { if (message.extension === 'postgres_changes') customerReady = feedStatus('Customer', message); }).subscribe();
    await expect.poll(() => providerReady && customerReady, {timeout: 20000}).toBe(true);
    await signIn(page, 'customerA');
    await page.goto('/bookings/detail/?id=' + booking);
    await expect(page.getByRole('heading', { name: 'Submit your receipt' })).toBeVisible();
    for (const approve of [false, true]) {
      const pixels = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=', 'base64'));
      const form = new FormData();
      form.set('file', new File([pixels], 'staging-test-pixels.png', { type: 'image/png' }));
      form.set('kind', 'payment');
      form.set('booking_id', booking);
      const upload = await customer.functions.invoke('files', { body: form });
      expect(upload.error).toBeNull();
      const { data: submission } = await customer.rpc('submit_gcash_receipt', {
        p_booking: booking, p_reference: Date.now().toString(), p_receipt: upload.data.id,
        p_expected_amount: payment!.amount_centavos, p_recipient_phone: phone
      }).throwOnError();
      const pending = await customer.from('payments').select('status').eq('id', payment!.id).single().throwOnError();
      expect(pending.data!.status).toBe('pending');
      await expect(page.getByText('Awaiting verification', {exact:true})).toBeVisible();
      const review = { p_submission: submission, p_approve: approve, p_reason: 'Disposable staging manual review simulation' };
      expect((await customer.rpc('review_gcash_receipt', review)).error).toBeTruthy();
      const privateReceipt = await provider.from('gcash_submissions').select('id').eq('id', submission).throwOnError();
      expect(privateReceipt.data).toEqual([]);
      await admin.rpc('review_gcash_receipt', review).throwOnError();
      await expect.poll(() => observedReviews.get(submission), {timeout: 15000}).toBe(approve ? 'approved' : 'rejected');
      const status = page.getByRole('status').filter({hasText: approve ? 'An administrator recorded settlement' : 'Receipt needs updating'});
      await expect(status).toBeVisible();
      if (!approve) {
        const rejectedPayment = await customer.from('payments').select('status').eq('id', payment!.id).single().throwOnError();
        expect(rejectedPayment.data!.status).toBe('pending');
      }
    }
    await expect.poll(() => providerSawPaid, {timeout: 15000}).toBe(true);
    const events = await customer.from('payment_events').select('id').eq('payment_id', payment!.id).eq('status', 'paid').throwOnError();
    expect(events.data).toHaveLength(1);
  } finally {
    await Promise.all([customer.removeChannel(customerChannel), provider.removeChannel(providerChannel)]);
  }
});

test('one real credential upload permits admin review without requiring other groups',async({page})=>{
 const applicant=await signed('pendingProvider'),admin=await signed('admin');
 const {data:{session}}=await applicant.auth.getSession();
 const headers={apikey:key!,Authorization:`Bearer ${session!.access_token}`};
 const bytes=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=','base64'));
 const upload=async(category:string)=>{const form=new FormData();form.set('kind','verification');form.set('verification_category',category);form.set('file',new File([bytes.buffer],`fictional-${category||'uncategorized'}.png`,{type:'image/png'}));return fetch(`${url}/functions/v1/files`,{method:'POST',headers,body:form});};
 expect((await upload('')).status).toBe(400);expect((await upload('invented-category')).status).toBe(400);
 const application=await admin.from('provider_applications').select('id').eq('provider_id',fixtures.accounts.pendingProvider.id).eq('status','pending').single();expect(application.error).toBeNull();
 const review={p_entity:'provider',p_id:application.data!.id,p_action:'approve',p_data:{reason:'Inspected harmless fictional test pixels in disposable staging'}};
 expect((await admin.rpc('admin_action',review)).error).toBeTruthy();
 const response=await upload('gov_id');const uploaded=await response.json();expect(response.ok,JSON.stringify(uploaded)).toBe(true);
 const pending=await applicant.from('provider_profiles').select('status').eq('id',fixtures.accounts.pendingProvider.id).single();expect(pending.data?.status).toBe('pending');
 expect((await applicant.rpc('admin_action',review)).error).toBeTruthy();expect((await admin.rpc('admin_action',review)).error).toBeNull();
 const context=await applicant.rpc('user_context');expect(context.data?.role).toBe('provider');
 // Badge reviews are explicit and independent from application approval.
 const providerId=fixtures.accounts.pendingProvider.id;
 expect((await applicant.rpc('set_service_area_pin',{p_latitude:14.5547,p_longitude:121.0244})).error).toBeNull();
 const directory=await createClient(url!,key!).from('public_providers').select('display_name,min_rate,service_latitude,service_longitude').eq('id',providerId).single();
 expect(directory.error).toBeNull();
 expect(directory.data).toMatchObject({service_latitude:14.555,service_longitude:121.024});
 expect(directory.data!.min_rate).toBeGreaterThan(0);
 const name=directory.data!.display_name;
 await page.goto('/find/?view=map&q='+encodeURIComponent(name));
 await expect(page.locator('.provider-card')).toContainText(name);
 await page.getByTitle(name,{exact:true}).click();
 await expect(page.getByRole('link',{name:'View '+name,exact:true})).toHaveAttribute('href','/providers/profile/?id='+providerId);
 const badges=async()=>{const r=await client().from('public_providers').select('trust_badges').eq('id',providerId).single();expect(r.error).toBeNull();return r.data!.trust_badges;};
 expect((await badges()).identity_reviewed).toBe(false);
 expect((await applicant.rpc('review_provider_credential',{p_provider:providerId,p_file:uploaded.id,p_kind:'identity',p_verified:true,p_reason:'Self review must be denied'})).error).toBeTruthy();
 expect((await admin.rpc('review_provider_credential',{p_provider:providerId,p_file:uploaded.id,p_kind:'identity',p_verified:true,p_reason:'Reviewed fictional staging identity fixture'})).error).toBeNull();
 expect((await badges()).identity_reviewed).toBe(true);expect((await badges()).skills_reviewed).toBe(false);
 expect((await admin.rpc('review_provider_credential',{p_provider:providerId,p_file:uploaded.id,p_kind:'skills',p_verified:true,p_reason:'An ID must not count as a trade certificate'})).error).toBeTruthy();
 const skillResponse=await upload('tesda_nc2');const skillFile=await skillResponse.json();expect(skillResponse.ok).toBe(true);
 expect((await admin.rpc('review_provider_credential',{p_provider:providerId,p_file:skillFile.id,p_kind:'skills',p_verified:true,p_reason:'Reviewed fictional staging skills fixture'})).error).toBeNull();
 expect((await badges()).skills_label).toBe('TESDA NC II reviewed');
 const removedId=await fetch(`${url}/functions/v1/files?id=${uploaded.id}`,{method:'DELETE',headers});expect(removedId.ok).toBe(true);
 expect((await badges()).identity_reviewed).toBe(false);expect((await badges()).skills_reviewed).toBe(true);
 const extra=await upload('business_permit');const file=await extra.json();expect(extra.ok,JSON.stringify(file)).toBe(true);
 const preflight=await fetch(`${url}/functions/v1/files?id=${file.id}`,{method:'OPTIONS',headers:{Origin:'http://localhost:3000','Access-Control-Request-Method':'DELETE','Access-Control-Request-Headers':'authorization,apikey'}});expect(preflight.headers.get('access-control-allow-methods')).toContain('DELETE');
 const deletion=await fetch(`${url}/functions/v1/files?id=${file.id}`,{method:'DELETE',headers});expect(deletion.ok).toBe(true);
 expect((await applicant.from('files').select('id').eq('id',file.id)).data).toEqual([]);
});

test('administrator creates, edits and permanently erases a disposable account through the protected endpoint',async()=>{
 const admin=await signed('admin');const customer=await signed('customerA');
 const {data:{session}}=await admin.auth.getSession();const {data:{session:other}}=await customer.auth.getSession();
 const call=async(body?:Record<string,unknown>,query='',bearer=session!.access_token)=>{
  const response=await fetch(`${url}/functions/v1/admin-accounts${query}`,{method:body?'POST':'GET',headers:{apikey:key!,Authorization:`Bearer ${bearer}`,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  return {status:response.status,ok:response.ok,data:await response.json()};
 };
 expect((await call(undefined,'',other!.access_token)).status).toBe(403);
 const address=`admin-managed.${crypto.randomUUID()}@example.test`;const password=crypto.randomUUID()+crypto.randomUUID();
 const created=await call({action:'create',full_name:'Disposable managed account',email:address,phone:'09171234567',password,role:'customer',email_verified:true,reason:'Isolated account integration check'});
 expect(created.ok,JSON.stringify(created.data)).toBe(true);const id=created.data.account.id;
 const profile=await call({action:'profile',id,full_name:'Updated managed account',phone:'09181234567',status:'active',role:'customer',updated_at:created.data.account.updated_at,reason:'Verify persisted account editing'});
 expect(profile.ok,JSON.stringify(profile.data)).toBe(true);expect(profile.data.account.full_name).toBe('Updated managed account');
 const nextPassword=crypto.randomUUID()+crypto.randomUUID();expect((await call({action:'password',id,password:nextPassword,password_confirmation:nextPassword,reason:'Verify administrator password reset'})).ok).toBe(true);
 const changedAddress=`updated.${crypto.randomUUID()}@example.test`;
 expect((await call({action:'email',id,email:changedAddress,email_verified:true,reason:'Verified ownership in isolated test'})).ok).toBe(true);
 const disposable=client('customerA');expect((await disposable.auth.signInWithPassword({email:changedAddress,password:nextPassword})).error).toBeNull();
 const {data:{session:targetSession}}=await disposable.auth.getSession();
 const image=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=','base64'));
 const form=new FormData();form.set('kind','avatar');form.set('file',new File([image.buffer],'avatar.png',{type:'image/png'}));
 const upload=await fetch(`${url}/functions/v1/files`,{method:'POST',headers:{apikey:key!,Authorization:`Bearer ${targetSession!.access_token}`},body:form});expect(upload.ok).toBe(true);const file=await upload.json();
 const preview=await call(undefined,`?preview=${id}`);expect(preview.ok).toBe(true);
 expect((await call({action:'delete',id,confirmation:'wrong confirmation',reason:'Verify confirmation safeguard'})).ok).toBe(false);
 const erased=await call({action:'delete',id,confirmation:changedAddress,reason:'Erase isolated integration fixture'});expect(erased.ok,JSON.stringify(erased.data)).toBe(true);expect(erased.data.deleted).toBe(true);
 expect((await client().auth.admin.getUserById(id)).data.user).toBeNull();expect((await client().from('profiles').select('id').eq('id',id)).data).toEqual([]);
 expect((await client().storage.from('avatars').download(file.path)).error).toBeTruthy();expect((await call(undefined,`?id=${id}`)).data.rows).toEqual([]);
 expect((await call({action:'delete',id:fixtures.accounts.admin.id,confirmation:fixtures.accounts.admin.email,reason:'Verify self deletion protection'})).ok).toBe(false);
});
test('customer signs in and persists account changes',async({page})=>{await signIn(page,'customerA');await page.goto('/account/');await page.getByLabel('Full name',{exact:true}).fill('Alex Demo Updated');await page.getByRole('button',{name:'Save profile'}).click();await expect(page.getByText('Saved successfully',{exact:true})).toBeVisible();await page.reload();await expect(page.getByLabel('Full name',{exact:true})).toHaveValue('Alex Demo Updated');});
test('customer finds a professional, schedules a persisted booking and provider follows the state machine',async({page})=>{
 test.setTimeout(120000);
 const c=await signed('customerA');const {data:service,error}=await c.from('provider_services').select('*').eq('id',fixtures.services[1]).single();if(error)throw error;
 await signIn(page,'customerA');await page.goto(`/providers/profile/?id=${service.provider_id}`);await page.getByRole('link',{name:'Request service'}).first().click();
 await page.getByLabel('Describe the task').fill('Integration test kitchen plumbing diagnostics.');await page.getByLabel('City / municipality').fill('Makati City');await page.getByLabel('Complete service address').fill('Fictional integration test residence, Example Street');await page.getByLabel('Postal code').fill('1200');await page.getByRole('button',{name:'Save & choose a schedule'}).click();
 const day=new Date(Date.now()+5*86400000).toISOString().slice(0,10);await page.getByLabel('Service date').fill(day);await page.locator('input[name="starts_at"]').first().check();await page.getByRole('button',{name:'Save & review request'}).click();await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Submit booking request'}).click();await expect(page.getByRole('heading',{name:'Booking request received.'})).toBeVisible();
 const bookingId=new URL(page.url()).searchParams.get('id')!;const p=await signed('providerB');
 const observedStatuses = new Set<string>();
 let subscribed = false;
 const channel = c.channel('customer-booking-' + bookingId)
   .on('postgres_changes', {event:'UPDATE', schema:'public', table:'bookings', filter:'id=eq.'+bookingId},
     change => { if (change.new.id === bookingId) observedStatuses.add(change.new.status); });
 try {
   channel.subscribe(state => { subscribed = state === 'SUBSCRIBED'; });
   await expect.poll(() => subscribed, {timeout:20000}).toBe(true);
   for (const status of ['confirmed', 'en_route', 'in_progress', 'completed']) {
     await p.rpc('transition_booking', {p_booking:bookingId, p_status:status, p_reason:''}).throwOnError();
     await expect.poll(() => observedStatuses.has(status), {timeout:15000}).toBe(true);
   }
 } finally {
   await c.removeChannel(channel);
 }
 await page.goto(`/bookings/invoice/?id=${bookingId}`);await expect(page.getByRole('heading',{name:'Service invoice',exact:true})).toBeVisible();
 await page.goto(`/bookings/review/?id=${bookingId}`);await page.locator('input[name="rating"][value="5"]').check();await page.getByLabel('Your review').fill('A useful fictional test service with clear communication.');await page.getByRole('button',{name:'Publish review'}).click();await expect(page.getByRole('heading',{name:'Thank you for sharing your experience.'})).toBeVisible();
});
test('members exchange messages; second customer and provider are denied',async({page})=>{
 const b=fixtures.bookings[0].id;const a=await signed('customerA');const {data:conversation}=await a.from('conversations').select('id').eq('booking_id',b).single();expect(conversation).toBeTruthy();
 await signIn(page,'customerA');await page.goto(`/messages/?booking=${b}`);await page.getByLabel('Your message').fill('Authorized customer integration message');await page.getByRole('button',{name:'Send message'}).click();await expect(page.getByText('Authorized customer integration message',{exact:true})).toBeVisible();
 const p=await signed('providerA');const reply=await p.rpc('send_message',{p_conversation:conversation!.id,p_body:'Authorized provider response',p_nonce:crypto.randomUUID()});expect(reply.error).toBeNull();await expect(page.getByText('Authorized provider response',{exact:true})).toBeVisible({timeout:35000});
 for(const who of ['customerB','providerB']){const outsider=await signed(who);const {data}=await outsider.from('messages').select('*').eq('conversation_id',conversation!.id);expect(data).toEqual([]);const response=await outsider.rpc('send_message',{p_conversation:conversation!.id,p_body:'Unauthorized message',p_nonce:crypto.randomUUID()});expect(response.error).toBeTruthy();}
});

test('recipient receives the committed message and notification over Realtime',async()=>{
 const customer=await signed('customerA'), provider=await signed('providerA');
 const booking=fixtures.bookings[0].id;
 const thread=await customer.from('conversations').select('id').eq('booking_id',booking).single();
 expect(thread.error).toBeNull();
 const nonce=crypto.randomUUID();
 let receivedMessageId:string|undefined;
 let receivedNotification=false;
 let subscriptionStatus='';
 const channel=provider.channel('staging-inbox-'+nonce)
   .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:'conversation_id=eq.'+thread.data!.id},event=>{
     if(event.new.client_nonce===nonce) receivedMessageId=event.new.id;
   })
   .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:'user_id=eq.'+fixtures.accounts.providerA.id},event=>{
     if(event.new.title==='New booking message' && event.new.href==='/messages/?booking='+booking) receivedNotification=true;
   });
 try {
   channel.subscribe(status=>{subscriptionStatus=status;});
   await expect.poll(()=>subscriptionStatus,{timeout:20000}).toBe('SUBSCRIBED');
   const sent=await customer.rpc('send_message',{p_conversation:thread.data!.id,p_body:'Local staging delivery check',p_nonce:nonce});
   expect(sent.error).toBeNull();
   await expect.poll(()=>receivedMessageId,{timeout:15000}).toBe(sent.data);
   await expect.poll(()=>receivedNotification,{timeout:10000}).toBe(true);
   expect((await provider.rpc('read_through_message',{p_message:receivedMessageId})).error).toBeNull();
 } finally {
   await provider.removeChannel(channel);
 }
});
test('complaint has a visible reply and private administrative notes',async({page})=>{
 await signIn(page,'customerA');await page.goto('/support/');await page.getByLabel('Subject',{exact:true}).fill('Integration test service concern');await page.getByLabel('Tell us what happened').fill('A fictional complaint to validate separate customer and internal threads.');await page.getByRole('button',{name:'Submit support case'}).click();await expect(page).toHaveURL(current=>current.searchParams.has('case'));const caseId=new URL(page.url()).searchParams.get('case')!;
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
 const form=new FormData();form.set('file',new File([bytes.buffer],'test-pixel.png',{type:'image/png'}));form.set('kind','verification');form.set('verification_category','gov_id');
 const uploaded=await fetch(`${url}/functions/v1/files`,{method:'POST',headers:{apikey:key!,Authorization:`Bearer ${session!.access_token}`},body:form});const file=await uploaded.json();expect(uploaded.ok,JSON.stringify(file)).toBe(true);
 const own=await fetch(`${url}/functions/v1/files?id=${file.id}`,{headers:{apikey:key!,Authorization:`Bearer ${session!.access_token}`}});expect(own.ok).toBe(true);
 for(const who of ['providerB','customerA','customerB']){const outsider=await signed(who);const {data:{session:s}}=await outsider.auth.getSession();expect((await outsider.from('files').select('*').eq('id',file.id)).data).toEqual([]);const denied=await fetch(`${url}/functions/v1/files?id=${file.id}`,{headers:{apikey:key!,Authorization:`Bearer ${s!.access_token}`}});expect(denied.status).toBe(404);}
});

test('customers, providers and admins upload their own private avatars',async()=>{
 const bytes=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=','base64'));
 for(const who of ['customerA','providerA','admin']){
  const owner=await signed(who);const {data:{session}}=await owner.auth.getSession();
  const headers={apikey:key!,Authorization:`Bearer ${session!.access_token}`};
  const form=new FormData();form.set('kind','avatar');form.set('file',new File([bytes.buffer],'avatar.png',{type:'image/png'}));
  const uploaded=await fetch(`${url}/functions/v1/files`,{method:'POST',headers,body:form});const file=await uploaded.json();expect(uploaded.ok,JSON.stringify(file)).toBe(true);
  const own=await fetch(`${url}/functions/v1/files?my_avatar=1`,{headers});expect(own.ok).toBe(true);const link=await own.json();expect(link.url).toContain('/storage/v1/object/sign/avatars/');
  const outsider=await signed('customerB');const {data:{session:other}}=await outsider.auth.getSession();
  const denied=await fetch(`${url}/functions/v1/files?id=${file.id}`,{headers:{apikey:key!,Authorization:`Bearer ${other!.access_token}`}});expect(denied.status).toBe(404);
  expect((await outsider.storage.from('avatars').download(file.path)).error).toBeTruthy();
  const publicAvatar=await fetch(`${url}/functions/v1/files?avatar=${fixtures.accounts[who].id}`,{redirect:'manual',headers:{apikey:key!}});expect(publicAvatar.status).toBe(who==='providerA'?302:404);
 }
});
test('registration verifies an actual configured Supabase email link',async({page})=>{
 test.skip(!process.env.TEST_INBOX_URL,'Requires a local Mailpit/Inbucket test inbox; never use a real mailbox.');
 const local='registration.'+Date.now()+'.'+Math.random().toString(16).slice(2);const email=local+'@example.test';const password=crypto.randomUUID()+crypto.randomUUID();
 await page.goto('/register/');await page.getByLabel('Full name',{exact:true}).fill('Registration Demo');await page.getByLabel('Philippine mobile number').fill('09171234567');await page.getByLabel('Email address',{exact:true}).fill(email);await page.getByLabel('Create password',{exact:true}).count().then(async count=>{if(count)await page.getByLabel('Create password',{exact:true}).fill(password);else await page.getByLabel('Password',{exact:true}).fill(password);});await page.getByLabel('Confirm password').fill(password);await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Create an account',exact:true}).click();await expect(page).toHaveURL(/verify/);
 let link:string|null=null;await expect.poll(async()=>{link=await verificationEmailLink(process.env.TEST_INBOX_URL!,email,url!);return Boolean(link);},{timeout:30000}).toBe(true);
 await page.goto(link!);await expect(page).toHaveURL(/dashboard/,{timeout:30000});await expect(page.getByRole('heading',{name:/Welcome back/})).toBeVisible();
});
test('password recovery email opens the reset form and persists the new password',async({page})=>{
 test.skip(!process.env.TEST_INBOX_URL,'Requires a local test inbox; never use a real mailbox.');
 const account=fixtures.accounts.customerB;
 await page.goto('/forgot-password/');await page.getByLabel('Email address',{exact:true}).fill(account.email);await page.getByRole('button',{name:'Send reset link',exact:true}).click();
 await expect(page.getByText('Email request submitted.',{exact:true})).toBeVisible();
 let link:string|null=null;await expect.poll(async()=>{link=await verificationEmailLink(process.env.TEST_INBOX_URL!,account.email,url!);return Boolean(link);},{timeout:30000}).toBe(true);
 await page.goto(link!);await expect(page).toHaveURL(/\/reset-password\//,{timeout:30000});
 const password=crypto.randomUUID()+crypto.randomUUID();await page.getByLabel('New password',{exact:true}).fill(password);await page.getByLabel('Confirm password',{exact:true}).fill(password);await page.getByRole('button',{name:'Update password',exact:true}).click();await expect(page).toHaveURL(/\/account\//);
 const c=client('customerB');const response=await c.auth.signInWithPassword({email:account.email,password});expect(response.error).toBeNull();fixtures.accounts.customerB.password=password;await c.auth.signOut({scope:'local'});
});

test('an actual test APK can be verified, published locally, downloaded and archived',async({page})=>{
 test.skip(!process.env.TEST_APK_PATH,'No real developer test APK supplied; do not fabricate a package.');
 const bytes=await readFile(process.env.TEST_APK_PATH!);const entries=unzipSync(bytes,{filter:e=>e.name==='AndroidManifest.xml'});const manifest=readAndroidManifest(entries['AndroidManifest.xml']);const admin=await signed('admin');const {data:{session}}=await admin.auth.getSession();
 const draft=await admin.rpc('create_release_draft',{p_version_name:manifest.version_name,p_version_code:manifest.version_code,p_min_android:androidVersions[manifest.min_sdk],p_notes:'Local test release supplied by the developer. No public deployment.'});expect(draft.error).toBeNull();
 const response=await fetch(`${url}/functions/v1/releases?id=${draft.data.id}`,{method:'POST',headers:{Authorization:`Bearer ${session!.access_token}`,apikey:key!,'Content-Type':'application/vnd.android.package-archive'},body:new Blob([bytes],{type:'application/vnd.android.package-archive'})});const release=await response.json();expect(response.ok,JSON.stringify(release)).toBe(true);expect(release.sha256).toMatch(/^[a-f0-9]{64}$/);
 expect((await admin.rpc('publish_release',{p_release:release.id,p_archive:false})).error).toBeNull();
 try{await page.goto('/download/');await expect(page.getByRole('link',{name:'Download for Android',exact:true})).toHaveAttribute('href',/github[.]com\/Jawbear\/SerbisyoGo\/releases\/download\//);const download=await fetch(`${url}/functions/v1/releases?id=${release.id}`,{headers:{apikey:key!}});expect(download.ok).toBe(true);const signedUrl=await download.json();const binary=await fetch(signedUrl.url);expect(binary.ok).toBe(true);expect((await binary.arrayBuffer()).byteLength).toBe(bytes.length);}finally{await admin.rpc('publish_release',{p_release:release.id,p_archive:true});}
});
