begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();

select ok(not exists(select 1 from public.gcash_settings where enabled),'migration leaves payment collection disabled until recipient verification');
select ok(not has_function_privilege('anon','public.save_gcash_settings(text,text,text,boolean,text,boolean)','EXECUTE'),'anonymous callers cannot verify recipients');
select ok(not has_table_privilege('authenticated','public.gcash_settings','UPDATE'),'clients cannot directly forge recipient verification');
insert into auth.users(id,email,raw_user_meta_data) values
 ('a1800000-0000-4000-8000-000000000001','recipient-admin@example.test','{"full_name":"Recipient Test Administrator"}'),
 ('a1800000-0000-4000-8000-000000000002','recipient-customer@example.test','{"full_name":"Recipient Test Customer"}');
update public.role_assignments set role='admin' where user_id='a1800000-0000-4000-8000-000000000001';
select set_config('request.jwt.claim.sub','a1800000-0000-4000-8000-000000000001',true);
set local role authenticated;
select throws_like($$select public.save_gcash_settings('Fictional Wallet','09170000001','Testing only',true,null,false)$$,'%Verify the recipient%','new recipient cannot be enabled without verification');
select throws_like($$select public.save_gcash_settings('Fictional Wallet','09170000001','Testing only',true)$$,'%Verify the recipient%','four-argument legacy RPC cannot bypass verification');
select throws_like($$select public.save_gcash_settings('Fictional Wallet','09170000001','Testing only',true,null)$$,'%Verify the recipient%','five-argument legacy RPC cannot bypass verification');
select lives_ok($$select public.save_gcash_settings('Fictional Wallet','09170000001','Testing only',true,null,true)$$,'admin can record independent verification and enable payments');
select ok((select enabled and recipient_verified_at is not null from public.gcash_settings),'enabled recipient has a verification timestamp');
select is((select recipient_verified_by from public.gcash_settings),'a1800000-0000-4000-8000-000000000001'::uuid,'verification records the administrator');
select throws_like($$select public.save_gcash_settings('Fictional Wallet','09170000002','Testing only',true,null,false)$$,'%Verify the recipient%','changing the mobile number requires verification again');
select is((select recipient_phone from public.gcash_settings),'09170000001','rejected recipient change preserves previous settings');
select throws_like($$select public.save_gcash_settings('Different Wallet','09170000001','Testing only',true,null,false)$$,'%Verify the recipient%','changing the name requires verification again');
select throws_like($$select public.save_gcash_settings('Fictional Wallet','09170000001','Testing only',true,'https://example.test/new-qr.png',false)$$,'%Verify the recipient%','changing QR requires verification again');
select lives_ok($$select public.save_gcash_settings('Fictional Wallet','09170000001','Updated instructions',true,null)$$,'instruction-only updates preserve existing verification');
select lives_ok($$select public.save_gcash_settings('Changed Wallet','09170000002','Testing only',false,null,false)$$,'admin can save a different recipient while disabled');
select ok((select not enabled and recipient_verified_at is null and recipient_verified_by is null from public.gcash_settings),'recipient changes clear verification and keep payments disabled');
select throws_like($$select public.save_gcash_settings('Changed Wallet','09170000002','Testing only',true)$$,'%Verify the recipient%','disabling a changed recipient does not let a later legacy call enable it');
select lives_ok($$select public.save_gcash_settings('Changed Wallet','09170000002','Testing only',true,null,true)$$,'changed wallet can be explicitly verified again');
select ok(exists(select 1 from public.audit_logs where actor_id=auth.uid() and entity='gcash_settings' and details->>'recipient_verified'='true'),'recipient verification has an audit receipt');
reset role;
select throws_like($$update public.gcash_settings set enabled=true,recipient_verified_at=null$$,'%gcash_enabled_verified%','database constraint rejects enabled settings without verification');
select set_config('request.jwt.claim.sub','a1800000-0000-4000-8000-000000000002',true);
set local role authenticated;
select throws_like($$select public.save_gcash_settings('Attacker Wallet','09170000003','Testing only',true,null,true)$$,'%Administrator access required%','customer cannot claim to have verified a wallet');
select * from finish();
rollback;
