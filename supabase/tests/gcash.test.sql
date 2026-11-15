begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,raw_user_meta_data) values
 ('91000000-0000-4000-8000-000000000001','gcash-customer@example.test','{"full_name":"GCash Customer"}'),
 ('91000000-0000-4000-8000-000000000002','gcash-other@example.test','{"full_name":"Other Customer"}'),
 ('91000000-0000-4000-8000-000000000003','gcash-admin@example.test','{"full_name":"GCash Admin"}'),
 ('91000000-0000-4000-8000-000000000004','gcash-provider@example.test','{"full_name":"GCash Provider"}');
update public.role_assignments set role='admin' where user_id='91000000-0000-4000-8000-000000000003';
update public.role_assignments set role='provider' where user_id='91000000-0000-4000-8000-000000000004';
insert into public.categories(id,slug,name) values('92000000-0000-4000-8000-000000000001','gcash-testing','GCash testing');
insert into public.provider_profiles(id,display_name,headline,bio,city,status) values('91000000-0000-4000-8000-000000000004','GCash Provider','Home repairs','Fictional payment test provider profile.','Bunawan','approved');
insert into public.provider_services(id,provider_id,category_id,title,rate_centavos,duration_minutes,pricing_mode) values('93000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000004','92000000-0000-4000-8000-000000000001','Repair service',50000,60,'fixed');
insert into public.bookings(id,customer_id,provider_id,provider_service_id,idempotency_key,service_title,description,address_snapshot,starts_at,ends_at,status,labor_centavos,fee_centavos,commission_bps,commission_centavos,total_centavos,is_estimate) values
 ('94000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000004','93000000-0000-4000-8000-000000000001',gen_random_uuid(),'Repair service','Fictional completed service','{"line1":"12 Test Street","city":"Bunawan","postal_code":"8506","label":"Home"}',now()-interval '2 days',now()-interval '2 days'+interval '1 hour','completed',50000,5000,1000,5000,55000,false);
insert into public.payments(id,booking_id,amount_centavos) values('95000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000001',55000);
insert into public.files(id,owner_id,kind,bucket,path,booking_id,original_name,mime_type,byte_size) values
 ('96000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001','payment','private-files','gcash-test/receipt.png','94000000-0000-4000-8000-000000000001','receipt.png','image/png',100),
 ('96000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000001','payment','private-files','gcash-test/receipt2.png','94000000-0000-4000-8000-000000000001','receipt2.png','image/png',100);

select ok(not has_table_privilege('authenticated','public.gcash_submissions','INSERT'),'clients cannot insert their own approved payment');
select ok(not has_table_privilege('authenticated','public.gcash_settings','UPDATE'),'clients cannot replace the wallet recipient');
select ok(not has_function_privilege('anon','public.review_gcash_receipt(uuid,boolean,text)','EXECUTE'),'anonymous receipt review is denied');
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
set local role authenticated;
select lives_ok($$select public.save_gcash_settings('Fictional Test Wallet','09171234567','Testing only',true)$$,'admin can configure GCash');
reset role;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select throws_like($$select public.save_gcash_settings('Other wallet','09171234568','',true)$$,'%Administrator access required%','customer cannot change the payment recipient');
select throws_like($$select public.submit_gcash_receipt('94000000-0000-4000-8000-000000000001','1234567890123','96000000-0000-4000-8000-000000000001',55000,'09171234567')$$,'%Own booking required%','another customer cannot submit a receipt');
reset role;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select throws_like($$select public.submit_gcash_receipt('94000000-0000-4000-8000-000000000001','1234567890123','96000000-0000-4000-8000-000000000001',100,'09171234567')$$,'%Payment details changed%','server rejects a changed amount');
select throws_like($$select public.submit_gcash_receipt('94000000-0000-4000-8000-000000000001','1234567890123','96000000-0000-4000-8000-000000000001',55000,'09171234568')$$,'%Payment details changed%','server rejects a changed recipient');
select lives_ok($$select public.submit_gcash_receipt('94000000-0000-4000-8000-000000000001','1234567890123','96000000-0000-4000-8000-000000000001',55000,'09171234567')$$,'customer submits receipt');
select lives_ok($$select public.submit_gcash_receipt('94000000-0000-4000-8000-000000000001','1234567890123','96000000-0000-4000-8000-000000000001',55000,'09171234567')$$,'retrying the same receipt is idempotent');
select is((select count(*)::integer from public.gcash_submissions),1,'retry does not duplicate receipt');
select is((select status from public.payments where id='95000000-0000-4000-8000-000000000001'),'pending','receipt alone never marks payment paid');
select throws_like($$select public.submit_gcash_receipt('94000000-0000-4000-8000-000000000001','1234567890999','96000000-0000-4000-8000-000000000002',55000,'09171234567')$$,'%already awaiting review%','second receipt cannot bypass pending review');
select throws_like($$select public.review_gcash_receipt((select id from public.gcash_submissions limit 1),true,'I declare myself paid')$$,'%Administrator access required%','customer cannot approve receipt');
reset role;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000004',true);
set local role authenticated;
select is((select count(*)::integer from public.gcash_submissions),0,'provider cannot read private GCash submissions');
select is((select count(*)::integer from public.files where kind='payment'),0,'provider cannot read private wallet receipts');
reset role;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
set local role authenticated;
select throws_like($$select public.settle_payment('95000000-0000-4000-8000-000000000001',gen_random_uuid(),'paid','cash','Attempt to bypass wallet review')$$,'%Review and verify%','generic settlement cannot bypass GCash review');
select lives_ok($$select public.review_gcash_receipt((select id from public.gcash_submissions limit 1),true,'Verified exact reference and amount in wallet history')$$,'admin records independent verification');
select lives_ok($$select public.review_gcash_receipt((select id from public.gcash_submissions limit 1),true,'Verified exact reference and amount in wallet history')$$,'approval retry is idempotent');
select is((select status from public.payments where id='95000000-0000-4000-8000-000000000001'),'paid','verified transfer is paid');
select is((select method from public.payments where id='95000000-0000-4000-8000-000000000001'),'gcash','verified payment retains GCash method');
select is((select count(*)::integer from public.payment_events where payment_id='95000000-0000-4000-8000-000000000001'),1,'approval retries create one payment event');
select is((select held_net_centavos from public.commission_ledger where booking_id='94000000-0000-4000-8000-000000000001'),45000,'GCash platform-held funds use the existing commission ledger');
select * from finish();
rollback;
