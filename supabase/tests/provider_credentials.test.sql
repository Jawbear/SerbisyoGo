begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,raw_user_meta_data) values
 ('a1900000-0000-4000-8000-000000000001','credentials-admin@example.test','{"full_name":"Credentials Administrator"}'),
 ('a1900000-0000-4000-8000-000000000002','credentials-provider@example.test','{"full_name":"Credentials Applicant"}'),
 ('a1900000-0000-4000-8000-000000000003','credentials-other@example.test','{"full_name":"Other Credentials Applicant"}');
update public.role_assignments set role='admin' where user_id='a1900000-0000-4000-8000-000000000001';
insert into public.provider_profiles(id,display_name,headline,bio,city,status) values
 ('a1900000-0000-4000-8000-000000000002','Credentials Applicant','Fictional repair trade','Fictional credentials for isolated SQL testing.','Bunawan','pending'),
 ('a1900000-0000-4000-8000-000000000003','Other Credentials Applicant','Fictional repair trade','Fictional credentials for isolated SQL testing.','Bunawan','suspended');
insert into public.provider_applications(id,provider_id,proposed_profile) values
 ('a1910000-0000-4000-8000-000000000001','a1900000-0000-4000-8000-000000000002','{"display_name":"Credentials Applicant","headline":"Fictional repair trade","bio":"Fictional credentials for isolated SQL testing.","city":"Bunawan","service_areas":["Bunawan"]}');
insert into public.provider_services(id,provider_id,category_id,title,rate_centavos,duration_minutes,pricing_mode)
 values('a1920000-0000-4000-8000-000000000001','a1900000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','Fictional repair',50000,60,'fixed');
insert into public.weekly_availability(provider_id,weekday,starts_minute,ends_minute)
 values('a1900000-0000-4000-8000-000000000002',1,480,1020);
select set_config('request.jwt.claim.sub','a1900000-0000-4000-8000-000000000001',true);
set local role authenticated;
select throws_like($$select public.admin_action('provider','a1910000-0000-4000-8000-000000000001','approve','{"reason":"Inspected fictional credentials"}')$$,'%required%','approval without documents is rejected');
reset role;
insert into public.files(id,owner_id,kind,bucket,path,original_name,mime_type,byte_size) values
 ('a1930000-0000-4000-8000-000000000001','a1900000-0000-4000-8000-000000000002','verification','private-files','credentials-test/id.pdf','[Government ID] fake-label.pdf','application/pdf',100),
 ('a1930000-0000-4000-8000-000000000002','a1900000-0000-4000-8000-000000000002','verification','private-files','credentials-test/trade.pdf','[PRC License] fake-label.pdf','application/pdf',100),
 ('a1930000-0000-4000-8000-000000000003','a1900000-0000-4000-8000-000000000002','verification','private-files','credentials-test/clearance.pdf','[Clearance] fake-label.pdf','application/pdf',100);
set local role authenticated;
select throws_like($$select public.admin_action('provider','a1910000-0000-4000-8000-000000000001','approve','{"reason":"Inspected fictional credentials"}')$$,'%At least one accepted ID or credential%','filename prefixes alone do not satisfy approval');
reset role;
-- A single government ID is sufficient; the other uploads stay uncategorized.
update public.files set verification_category='gov_id' where id='a1930000-0000-4000-8000-000000000001';
update public.provider_services set active=false where id='a1920000-0000-4000-8000-000000000001';
set local role authenticated;
select throws_like($$select public.admin_action('provider','a1910000-0000-4000-8000-000000000001','approve','{"reason":"Inspected fictional credentials"}')$$,'%required%','complete documents do not replace an active service');
reset role;
update public.provider_services set active=true where id='a1920000-0000-4000-8000-000000000001';
delete from public.weekly_availability where provider_id='a1900000-0000-4000-8000-000000000002';
set local role authenticated;
select throws_like($$select public.admin_action('provider','a1910000-0000-4000-8000-000000000001','approve','{"reason":"Inspected fictional credentials"}')$$,'%required%','complete documents do not replace availability');
select is((select status from public.provider_applications where id='a1910000-0000-4000-8000-000000000001'),'pending','failed reviews leave the application pending');
select is((select role from public.role_assignments where user_id='a1900000-0000-4000-8000-000000000002'),'customer','failed reviews do not grant provider access');
reset role;
insert into public.weekly_availability(provider_id,weekday,starts_minute,ends_minute)
 values('a1900000-0000-4000-8000-000000000002',1,480,1020);
set local role authenticated;
select lives_ok($$select public.admin_action('provider','a1910000-0000-4000-8000-000000000001','approve','{"reason":"Inspected fictional credentials"}')$$,'admin can approve a complete application');
select is((select status from public.provider_profiles where id='a1900000-0000-4000-8000-000000000002'),'approved','complete provider becomes approved');
select is((select role from public.role_assignments where user_id='a1900000-0000-4000-8000-000000000002'),'provider','only successful review grants provider access');
select is((select reason from public.provider_applications where id='a1910000-0000-4000-8000-000000000001'),'Inspected fictional credentials','review reason is retained');
select lives_ok($$select public.admin_action('provider','a1900000-0000-4000-8000-000000000002','suspend','{"reason":"Fictional suspension for reactivation test"}')$$,'admin can suspend the approved provider');
reset role;
update public.provider_services set active=false where id='a1920000-0000-4000-8000-000000000001';
set local role authenticated;
select throws_like($$select public.admin_action('provider','a1900000-0000-4000-8000-000000000002','activate','{"reason":"Fictional reactivation test"}')$$,'%Active services and availability%','reactivation also requires an active service');
reset role;
update public.provider_services set active=true where id='a1920000-0000-4000-8000-000000000001';
delete from public.weekly_availability where provider_id='a1900000-0000-4000-8000-000000000002';
set local role authenticated;
select throws_like($$select public.admin_action('provider','a1900000-0000-4000-8000-000000000002','activate','{"reason":"Fictional reactivation test"}')$$,'%Active services and availability%','reactivation also requires availability');
reset role;
insert into public.weekly_availability(provider_id,weekday,starts_minute,ends_minute)
 values('a1900000-0000-4000-8000-000000000002',1,480,1020);
set local role authenticated;
select lives_ok($$select public.admin_action('provider','a1900000-0000-4000-8000-000000000002','activate','{"reason":"Fictional reactivation test"}')$$,'complete provider can be reactivated');
select throws_like($$select public.admin_action('provider','a1900000-0000-4000-8000-000000000003','activate','{"reason":"Reactivation without own documents"}')$$,'%At least one accepted ID or credential%','reactivation cannot borrow another provider documents or bypass requirements');
reset role;
update public.files set verification_category='other_proof' where id='a1930000-0000-4000-8000-000000000001';
select throws_like($$update public.provider_profiles set status='approved' where id='a1900000-0000-4000-8000-000000000002'$$,'%At least one accepted ID or credential%','assigning approved again still checks credentials');
update public.files set verification_category='gov_id' where id='a1930000-0000-4000-8000-000000000001';
select lives_ok($$update public.provider_profiles set status='approved' where id='a1900000-0000-4000-8000-000000000002'$$,'one gov_id is an accepted alternative');
update public.files set verification_category='tesda_nc2' where id='a1930000-0000-4000-8000-000000000001';
select lives_ok($$update public.provider_profiles set status='approved' where id='a1900000-0000-4000-8000-000000000002'$$,'one tesda_nc2 is an accepted alternative');
update public.files set verification_category='tesda_nc1' where id='a1930000-0000-4000-8000-000000000001';
select lives_ok($$update public.provider_profiles set status='approved' where id='a1900000-0000-4000-8000-000000000002'$$,'one tesda_nc1 is an accepted alternative');
update public.files set verification_category='tesda_coc' where id='a1930000-0000-4000-8000-000000000001';
select lives_ok($$update public.provider_profiles set status='approved' where id='a1900000-0000-4000-8000-000000000002'$$,'one tesda_coc is an accepted alternative');
update public.files set verification_category='prc_license' where id='a1930000-0000-4000-8000-000000000001';
select lives_ok($$update public.provider_profiles set status='approved' where id='a1900000-0000-4000-8000-000000000002'$$,'one prc_license is an accepted alternative');
update public.files set verification_category='clearance' where id='a1930000-0000-4000-8000-000000000001';
select lives_ok($$update public.provider_profiles set status='approved' where id='a1900000-0000-4000-8000-000000000002'$$,'one clearance is an accepted alternative');
update public.files set verification_category='training_cert' where id='a1930000-0000-4000-8000-000000000001';
select lives_ok($$update public.provider_profiles set status='approved' where id='a1900000-0000-4000-8000-000000000002'$$,'one training_cert is an accepted alternative');
update public.files set verification_category='employment_proof' where id='a1930000-0000-4000-8000-000000000001';
select lives_ok($$update public.provider_profiles set status='approved' where id='a1900000-0000-4000-8000-000000000002'$$,'one employment_proof is an accepted alternative');
update public.files set verification_category='business_permit' where id='a1930000-0000-4000-8000-000000000001';
select lives_ok($$update public.provider_profiles set status='approved' where id='a1900000-0000-4000-8000-000000000002'$$,'one business_permit is an accepted alternative');
select throws_like($$update public.files set verification_category='invented' where id='a1930000-0000-4000-8000-000000000001'$$,'%files_verification_category%','unknown categories are rejected');
select throws_like($$update public.files set kind='avatar' where id='a1930000-0000-4000-8000-000000000001'$$,'%files_verification_category%','non-verification files cannot count as credentials');
select set_config('request.jwt.claim.sub','a1900000-0000-4000-8000-000000000003',true);
set local role authenticated;
select throws_like($$select public.admin_action('provider','a1900000-0000-4000-8000-000000000003','activate','{"reason":"Attempted self approval"}')$$,'%Administrator access required%','applicants cannot approve themselves');
select * from finish();
rollback;
