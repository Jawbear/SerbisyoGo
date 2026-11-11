begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
-- This transaction is disposable and creates only fictional test identities.
insert into auth.users(id,email,raw_user_meta_data) values
('aaaaaaaa-0000-4000-8000-000000000001','customer-a@example.test','{"full_name":"Customer A","role":"admin"}'),
('aaaaaaaa-0000-4000-8000-000000000002','customer-b@example.test','{"full_name":"Customer B"}'),
('bbbbbbbb-0000-4000-8000-000000000001','provider-a@example.test','{"full_name":"Provider A"}'),
('bbbbbbbb-0000-4000-8000-000000000002','provider-b@example.test','{"full_name":"Provider B"}'),
('cccccccc-0000-4000-8000-000000000001','admin-test@example.test','{"full_name":"Test Admin"}');
update public.role_assignments set role=case when user_id::text like 'bbbbbbbb%' then 'provider' else 'admin' end where user_id in ('bbbbbbbb-0000-4000-8000-000000000001','bbbbbbbb-0000-4000-8000-000000000002','cccccccc-0000-4000-8000-000000000001');
insert into public.provider_profiles(id,display_name,headline,bio,city,service_areas,status) values
('bbbbbbbb-0000-4000-8000-000000000001','Provider A','Electrical repairs','Fictional test provider for ownership and booking rules.','Makati City','{"Makati City"}','approved'),
('bbbbbbbb-0000-4000-8000-000000000002','Provider B','Plumbing repairs','A second fictional provider for negative authorization tests.','Makati City','{"Makati City"}','approved');
insert into public.provider_services(id,provider_id,category_id,title,rate_centavos,duration_minutes,pricing_mode) values
('dddddddd-0000-4000-8000-000000000001','bbbbbbbb-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Test electrical service',45000,60,'fixed');
insert into public.weekly_availability(provider_id,weekday,starts_minute,ends_minute) select 'bbbbbbbb-0000-4000-8000-000000000001',i,480,1080 from generate_series(0,6) i;
update public.app_settings set active=false where active;
insert into public.app_settings(fee_centavos,commission_bps,active) values(5000,1000,true);
insert into public.support_cases(id,owner_id,subject,body) values('eeeeeeee-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-000000000001','Test support concern','Fictional evidence for case ownership testing.');
insert into public.case_notes(case_id,admin_id,body) values('eeeeeeee-0000-4000-8000-000000000001','cccccccc-0000-4000-8000-000000000001','Secret internal test note');
insert into public.files(id,owner_id,kind,bucket,path,original_name,mime_type,byte_size) values('ffffffff-0000-4000-8000-000000000001','bbbbbbbb-0000-4000-8000-000000000001','verification','private-files','test/private.pdf','fictional.pdf','application/pdf',10);

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is(public.is_admin(),false,'role metadata never grants administrator privileges');
select is((select role from public.role_assignments where user_id=auth.uid()),'customer','new accounts always have the server-assigned customer role');
select throws_ok($$update public.role_assignments set role='admin' where user_id=auth.uid()$$,'42501',null,'customer cannot grant self admin');
select throws_ok($$update public.profiles set status='active' where id=auth.uid()$$,'42501',null,'status cannot be changed through editable profile fields');
select is((select count(*) from public.profiles),1::bigint,'customer sees only own profile');
select is((select count(*) from public.case_notes),0::bigint,'customer cannot see internal notes');
select is((select count(*) from public.files where kind='verification'),0::bigint,'customer cannot see verification files');
select throws_ok($$select public.admin_report(now()-interval '1 day',now())$$,'42501',null,'non-admin cannot call report RPC');
select throws_ok($$select public.create_release_draft('1.0.0',1,'8.0','Test release notes')$$,'42501',null,'customer cannot create APK release drafts');
select throws_ok($$select public.publish_release('ffffffff-0000-4000-8000-000000000002',false)$$,'42501',null,'customer cannot publish APKs');
select throws_ok($$insert into storage.objects(bucket_id,name) values('android-releases','malicious.apk')$$,'42501',null,'browser cannot upload APK storage objects');
-- Use a server-available slot. Only availability, never unrelated private booking details, is returned.
select set_config('test.slot',(public.available_slots('dddddddd-0000-4000-8000-000000000001',(now() at time zone 'Asia/Manila')::date+2)->0->>'starts_at'),true);
select set_config('test.draft_a',public.save_booking_draft(null,'dddddddd-0000-4000-8000-000000000001','A sufficiently detailed customer task','{"label":"Home","line1":"Fictional test address","city":"Makati City","postal_code":"1200"}',current_setting('test.slot')::timestamptz)::text,true);
select is((public.draft_price(current_setting('test.draft_a')::uuid)->>'total_centavos')::int,50000,'server computes price from trusted service and settings');
select set_config('test.booking_a',public.confirm_booking(current_setting('test.draft_a')::uuid,50000)::text,true);
select is(public.confirm_booking(current_setting('test.draft_a')::uuid,50000)::text,current_setting('test.booking_a'),'confirmation is idempotent for the same draft');
select is((select count(*) from public.bookings),1::bigint,'duplicate confirmation did not create another job');
select throws_ok($$select public.transition_booking(current_setting('test.booking_a')::uuid,'confirmed','')$$,'42501',null,'customer cannot accept own request as provider');
select throws_ok($$select public.submit_review(current_setting('test.booking_a')::uuid,5,'A premature review must be rejected.')$$,'42501',null,'incomplete booking cannot be reviewed');
select set_config('test.conversation',(select id::text from public.conversations where booking_id=current_setting('test.booking_a')::uuid),true);
select lives_ok($$select public.send_message(current_setting('test.conversation')::uuid,'Authorized customer message','99999999-0000-4000-8000-000000000001')$$,'member can send a message');
select lives_ok($$select public.send_message(current_setting('test.conversation')::uuid,'Authorized customer message','99999999-0000-4000-8000-000000000001')$$,'duplicate message nonce is idempotent');
select is((select count(*) from public.messages),1::bigint,'duplicate message created once');

select set_config('request.jwt.claims','{"sub":"aaaaaaaa-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*) from public.bookings),0::bigint,'second customer cannot read first customer booking');
select is((select count(*) from public.messages),0::bigint,'second customer cannot read conversation history');
select is((select count(*) from public.support_cases),0::bigint,'second customer cannot read first customer support case');
select throws_ok($$select public.send_message(current_setting('test.conversation')::uuid,'Intrusion attempt','99999999-0000-4000-8000-000000000002')$$,'42501',null,'second customer cannot send into unrelated conversation');
select throws_ok($$select public.confirm_booking(current_setting('test.draft_a')::uuid,50000)$$,'42501',null,'second customer cannot confirm another draft');
select set_config('test.draft_b',public.save_booking_draft(null,'dddddddd-0000-4000-8000-000000000001','Another detailed customer task','{"label":"Home","line1":"Another fictional address","city":"Makati City","postal_code":"1200"}',current_setting('test.slot')::timestamptz)::text,true);
select set_config('test.booking_b',public.confirm_booking(current_setting('test.draft_b')::uuid,50000)::text,true);

select set_config('request.jwt.claims','{"sub":"bbbbbbbb-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*) from public.bookings),0::bigint,'unassigned second provider sees no bookings');
select is((select count(*) from public.files),0::bigint,'second provider cannot read another provider verification files');
select throws_ok($$select public.transition_booking(current_setting('test.booking_a')::uuid,'confirmed','')$$,'42501',null,'unassigned provider cannot accept a booking');
select throws_ok($$select public.update_location(current_setting('test.booking_a')::uuid,14.55,121.02)$$,'42501',null,'unassigned provider cannot share booking location');

select set_config('request.jwt.claims','{"sub":"bbbbbbbb-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select count(*) from public.bookings),2::bigint,'assigned provider sees its own requests');
select lives_ok($$select public.transition_booking(current_setting('test.booking_a')::uuid,'confirmed','')$$,'assigned approved provider accepts the request');
select throws_ok($$select public.transition_booking(current_setting('test.booking_b')::uuid,'confirmed','')$$,'P0001',null,'overlapping accepted booking is prevented');
select throws_ok($$select public.transition_booking(current_setting('test.booking_a')::uuid,'completed','')$$,'42501',null,'provider cannot skip job states');
select lives_ok($$select public.transition_booking(current_setting('test.booking_a')::uuid,'en_route','')$$,'provider can mark en route');
select lives_ok($$select public.update_location(current_setting('test.booking_a')::uuid,14.55,121.02)$$,'active assigned provider can explicitly share its position');
select lives_ok($$select public.transition_booking(current_setting('test.booking_a')::uuid,'in_progress','')$$,'provider can start work');
select lives_ok($$select public.transition_booking(current_setting('test.booking_a')::uuid,'completed','')$$,'provider can complete work');
select is((select count(*) from public.invoices),1::bigint,'completion issues one persisted invoice');
select is((select count(*) from public.booking_locations),0::bigint,'completion removes current location');

select set_config('request.jwt.claims','{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}',true);
select lives_ok($$select public.submit_review(current_setting('test.booking_a')::uuid,5,'A completed service review from the actual customer.')$$,'completed booking customer can review');
select throws_ok($$select public.submit_review(current_setting('test.booking_a')::uuid,5,'Another review from the same customer.')$$,'23505',null,'one review per booking is enforced');
select set_config('request.jwt.claims','{"sub":"aaaaaaaa-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok($$select public.submit_review(current_setting('test.booking_a')::uuid,1,'An unrelated customer cannot review this service.')$$,'42501',null,'second customer cannot review the completed booking');

-- Quotation ownership, acceptance and server snapshot checks.
reset role;
insert into public.provider_services(id,provider_id,category_id,title,rate_centavos,duration_minutes,pricing_mode) values('dddddddd-0000-4000-8000-000000000002','bbbbbbbb-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Test quoted electrical service',30000,60,'quote');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}',true);
select set_config('test.quote_slot',(public.available_slots('dddddddd-0000-4000-8000-000000000002',(now() at time zone 'Asia/Manila')::date+3)->0->>'starts_at'),true);
select set_config('test.quote_draft',public.save_booking_draft(null,'dddddddd-0000-4000-8000-000000000002','A detailed quotation-based repair task','{"label":"Home","line1":"Fictional quotation address","city":"Makati City","postal_code":"1200"}',current_setting('test.quote_slot')::timestamptz)::text,true);
select throws_ok($$select public.confirm_booking(current_setting('test.quote_draft')::uuid,1)$$,'P0001',null,'changed or client-invented price is rejected');
select set_config('test.quote_booking',public.confirm_booking(current_setting('test.quote_draft')::uuid,35000)::text,true);
select set_config('request.jwt.claims','{"sub":"bbbbbbbb-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.transition_booking(current_setting('test.quote_booking')::uuid,'confirmed','')$$,'P0001',null,'quote cannot be confirmed before customer acceptance');
select lives_ok($$select public.booking_quote(current_setting('test.quote_booking')::uuid,55000,false)$$,'assigned provider can propose a labor quotation');
select set_config('request.jwt.claims','{"sub":"aaaaaaaa-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok($$select public.booking_quote(current_setting('test.quote_booking')::uuid,null,true)$$,'42501',null,'second customer cannot accept another quotation');
select set_config('request.jwt.claims','{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}',true);
select lives_ok($$select public.booking_quote(current_setting('test.quote_booking')::uuid,null,true)$$,'owning customer can accept quotation');
select is((select total_centavos from public.bookings where id=current_setting('test.quote_booking')::uuid),60000,'accepted quote preserves the original fee and recalculates total');
select set_config('request.jwt.claims','{"sub":"cccccccc-0000-4000-8000-000000000001","role":"authenticated"}',true);
select set_config('test.payment',(select id::text from public.payments where booking_id=current_setting('test.booking_a')::uuid),true);
select lives_ok($$select public.settle_payment(current_setting('test.payment')::uuid,'99999999-0000-4000-8000-000000000009','paid','cash','Verified fictional cash settlement reference TEST001')$$,'administrator records an authorized settlement');
select lives_ok($$select public.settle_payment(current_setting('test.payment')::uuid,'99999999-0000-4000-8000-000000000009','paid','cash','Verified fictional cash settlement reference TEST001')$$,'repeated payment event is idempotent');
select is((select count(*) from public.payment_events),1::bigint,'only one payment event is recorded');
select is((select held_net_centavos from public.commission_ledger where booking_id=current_setting('test.booking_a')::uuid),0,'cash settlement is not a platform-held payout balance');
select ok((select count(*)>0 from public.audit_logs),'important admin changes generate audit records');
select throws_ok($$delete from public.audit_logs$$,'42501',null,'administrator API cannot delete audit entries');
select set_config('test.release',(public.create_release_draft('1.0.0',701,'8.0','Fictional draft without an artifact')->>'id'),true);
select throws_ok($$select public.publish_release(current_setting('test.release')::uuid,false)$$,'P0001',null,'administrator cannot publish an incomplete APK draft');

set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
select is((select count(*) from public.app_releases where id=current_setting('test.release')::uuid),0::bigint,'draft APK metadata is not public');
select is((select count(*) from storage.objects where bucket_id='android-releases'),0::bigint,'unpublished APK storage objects have no public read policy');
select * from finish();
rollback;

