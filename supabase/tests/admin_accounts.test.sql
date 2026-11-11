begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,raw_user_meta_data) values
 ('81000000-0000-4000-8000-000000000001','admin-a@example.test','{"full_name":"Admin A"}'),
 ('81000000-0000-4000-8000-000000000002','admin-b@example.test','{"full_name":"Admin B"}'),
 ('82000000-0000-4000-8000-000000000001','erase-me@example.test','{"full_name":"Erase Me"}'),
 ('82000000-0000-4000-8000-000000000002','keep-me@example.test','{"full_name":"Keep Me"}'),
 ('83000000-0000-4000-8000-000000000001','provider@example.test','{"full_name":"Provider Test"}');
update public.role_assignments set role='admin' where user_id::text like '81000000%';
update public.role_assignments set role='provider' where user_id='83000000-0000-4000-8000-000000000001';
insert into public.categories(id,slug,name) values('84000000-0000-4000-8000-000000000001','purge-test-category','Purge test category');
insert into public.provider_profiles(id,display_name,headline,bio,city,status) values('83000000-0000-4000-8000-000000000001','Test Provider','Scheduled home repairs','Fictional provider used only inside this rolled-back test transaction.','Bunawan','approved');
insert into public.provider_services(id,provider_id,category_id,title,rate_centavos,duration_minutes,pricing_mode) values('85000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000001','84000000-0000-4000-8000-000000000001','Repair service',50000,60,'fixed');
insert into public.bookings(id,customer_id,provider_id,provider_service_id,idempotency_key,service_title,description,address_snapshot,starts_at,ends_at,status,labor_centavos,fee_centavos,commission_bps,commission_centavos,total_centavos,is_estimate) values
 ('86000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000001','85000000-0000-4000-8000-000000000001','86100000-0000-4000-8000-000000000001','Repair service','Disposable completed service','{"line1":"12 Test Street","city":"Bunawan","postal_code":"8506","label":"Home"}',now()+interval '1 day',now()+interval '1 day 1 hour','completed',50000,5000,1000,5000,55000,false),
 ('86000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000002','83000000-0000-4000-8000-000000000001','85000000-0000-4000-8000-000000000001','86100000-0000-4000-8000-000000000002','Repair service','Unrelated customer service','{"line1":"24 Other Street","city":"Bunawan","postal_code":"8506","label":"Home"}',now()+interval '3 days',now()+interval '3 days 1 hour','requested',50000,5000,1000,5000,55000,false);
insert into public.conversations(id,booking_id) values('87000000-0000-4000-8000-000000000001','86000000-0000-4000-8000-000000000001');
insert into public.conversation_members(conversation_id,user_id) values('87000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001'),('87000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000001');
insert into public.messages(conversation_id,sender_id,body,client_nonce) values('87000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','Erase this message',gen_random_uuid());
insert into public.payments(id,booking_id,amount_centavos,status) values('88000000-0000-4000-8000-000000000001','86000000-0000-4000-8000-000000000001',55000,'paid');
insert into public.payment_events(payment_id,event_key,status,source,reason) values('88000000-0000-4000-8000-000000000001',gen_random_uuid(),'paid','authorized_manual','Disposable payment test');
insert into public.invoices(booking_id,invoice_number,labor_centavos,fee_centavos,total_centavos) values('86000000-0000-4000-8000-000000000001','PURGE-TEST-INVOICE',50000,5000,55000);
insert into public.commission_ledger(id,booking_id,provider_id,labor_centavos,commission_centavos,platform_fee_centavos) values('89000000-0000-4000-8000-000000000001','86000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000001',50000,5000,5000);
insert into public.support_cases(id,owner_id,booking_id,subject,body) values('8a000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','86000000-0000-4000-8000-000000000001','Disposable support case','Erase the related support conversation.');
insert into public.case_notes(case_id,admin_id,body) values('8a000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000001','Private disposable note');
insert into public.files(owner_id,kind,bucket,path,booking_id,original_name,mime_type,byte_size) values('82000000-0000-4000-8000-000000000001','booking','private-files','82000000-0000-4000-8000-000000000001/test.png','86000000-0000-4000-8000-000000000001','test.png','image/png',100);

select ok(not has_schema_privilege('authenticated','admin_private','USAGE'),'clients cannot access private purge state');
select ok(not has_function_privilege('authenticated','public.admin_begin_account_purge(uuid,uuid,text,text)','EXECUTE'),'browser JWT cannot impersonate the trusted purge backend');
select ok(not has_function_privilege('anon','public.admin_accounts(text,text,text,integer,integer,uuid)','EXECUTE'),'anonymous callers cannot list account emails');
select set_config('request.jwt.claim.sub','82000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select throws_like($$select public.admin_accounts()$$,'%Administrator access required%','customers cannot enumerate users');
select throws_like($$select public.admin_save_account('82000000-0000-4000-8000-000000000001','Escalation',null,'active','admin','Escalation attempt')$$,'%Administrator access required%','customers cannot grant admin roles');
reset role;
select set_config('request.jwt.claim.sub','81000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select is((public.admin_accounts('erase-me','','',0,25)->>'total')::integer,1,'administrator can search actual Auth email');
select lives_ok($$select public.admin_save_account('82000000-0000-4000-8000-000000000001','Updated Customer','+639171234567','restricted','customer','Reviewed account details')$$,'admin can update name, phone and status');
select is((public.admin_accounts('','','',0,1,'82000000-0000-4000-8000-000000000001')->'rows'->0->>'full_name'),'Updated Customer','account search reflects the saved name');
select throws_like($$select public.admin_save_account('81000000-0000-4000-8000-000000000001','Admin A',null,'deactivated','customer','Self removal attempt')$$,'%own administrator access%','self deactivation/demotion is blocked');
select throws_like($$select public.admin_save_account('82000000-0000-4000-8000-000000000002','Keep Me',null,'active','provider','Bypass verification')$$,'%Approve the provider application%','role editing does not bypass provider verification');
select lives_ok($$select public.admin_save_account('82000000-0000-4000-8000-000000000002','Keep Me',null,'active','admin','Authorized staff promotion')$$,'admin can promote another account with a reason');
select lives_ok($$select public.admin_save_account('82000000-0000-4000-8000-000000000002','Keep Me',null,'active','customer','Staff promotion rolled back')$$,'admin can demote another account');
reset role;
select throws_like($$select public.admin_account_purge_plan('82000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000001')$$,'%Active administrator required%','trusted purge revalidates its actor');
select throws_like($$select public.admin_begin_account_purge('81000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000001','admin-a@example.test','Self deletion attempt')$$,'%own administrator account%','self deletion is blocked server-side');
select throws_like($$select public.admin_begin_account_purge('81000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','wrong@example.test','Erasure requested')$$,'%exact account email%','permanent deletion needs the correct typed confirmation');
select throws_like($$delete from public.commission_ledger where id='89000000-0000-4000-8000-000000000001'$$,'%Financial ledger records are retained%','ordinary ledger deletion remains forbidden');
select set_config('test.account_purge',(public.admin_begin_account_purge('81000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','erase-me@example.test','Explicit permanent erasure')->>'operation_id'),true);
select is((select status from public.profiles where id='82000000-0000-4000-8000-000000000001'),'deactivated','target access is blocked before erasure starts');
select lives_ok($$select public.admin_purge_account_records('81000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001',current_setting('test.account_purge')::uuid)$$,'related records including immutable histories can be purged only through the dedicated transaction');
select is((select count(*) from public.profiles where id='82000000-0000-4000-8000-000000000001'),0::bigint,'target profile was erased');
select is((select count(*) from public.bookings where id='86000000-0000-4000-8000-000000000001'),0::bigint,'related booking was erased');
select is((select count(*) from public.bookings where id='86000000-0000-4000-8000-000000000002'),1::bigint,'unrelated booking was retained');
select is((select count(*) from public.profiles where id='82000000-0000-4000-8000-000000000002'),1::bigint,'other user account was retained');
select is((select count(*) from public.payments where id='88000000-0000-4000-8000-000000000001'),0::bigint,'linked payment was erased');
select is((select count(*) from public.commission_ledger where id='89000000-0000-4000-8000-000000000001'),0::bigint,'linked ledger was erased');
select is((select count(*) from public.case_notes where case_id='8a000000-0000-4000-8000-000000000001'),0::bigint,'related private notes were erased');
select is((select count(*) from public.files where owner_id='82000000-0000-4000-8000-000000000001'),0::bigint,'file metadata was erased');
select is((select count(*) from admin_private.purge_transactions),0::bigint,'the immutable-record exception ends with its transaction');
select throws_like($$select public.admin_finish_account_purge('81000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001',current_setting('test.account_purge')::uuid)$$,'%Authentication deletion is incomplete%','success cannot be reported before Auth deletion');
delete from auth.users where id='82000000-0000-4000-8000-000000000001';
select lives_ok($$select public.admin_finish_account_purge('81000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001',current_setting('test.account_purge')::uuid)$$,'purge can finalize after Auth deletion');
select is((select count(*) from admin_private.account_purges where target_id='82000000-0000-4000-8000-000000000001'),0::bigint,'target-linked purge state is removed after success');
select is((select count(*) from public.audit_logs where entity_id='82000000-0000-4000-8000-000000000001' or actor_id='82000000-0000-4000-8000-000000000001'),0::bigint,'target-identifying audit rows are erased');
select * from finish();
rollback;
