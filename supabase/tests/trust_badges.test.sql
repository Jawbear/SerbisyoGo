begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,raw_user_meta_data) values
 ('a2300000-0000-4000-8000-000000000001','badge-admin@example.test','{"full_name":"Badge Review Administrator"}'),
 ('a2300000-0000-4000-8000-000000000002','badge-owner@example.test','{"full_name":"Badge Review Owner"}'),
 ('a2300000-0000-4000-8000-000000000003','badge-other@example.test','{"full_name":"Badge Review Other"}');
update public.role_assignments set role='admin' where user_id='a2300000-0000-4000-8000-000000000001';
insert into public.provider_profiles(id,display_name,headline,bio,city,status) values
 ('a2300000-0000-4000-8000-000000000002','Badge Owner','Fictional trade service','Private fictional badge review fixtures.','Bunawan','approved'),
 ('a2300000-0000-4000-8000-000000000003','Badge Other','Fictional trade service','Other private fictional review fixtures.','Bunawan','pending');
insert into public.files(id,owner_id,kind,bucket,path,original_name,mime_type,byte_size,verification_category) values
 ('a2310000-0000-4000-8000-000000000001','a2300000-0000-4000-8000-000000000002','verification','private-files','badge/id.pdf','Fictional ID.pdf','application/pdf',100,'gov_id'),
 ('a2310000-0000-4000-8000-000000000002','a2300000-0000-4000-8000-000000000002','verification','private-files','badge/skill.pdf','Fictional trade.pdf','application/pdf',100,'tesda_nc2'),
 ('a2310000-0000-4000-8000-000000000003','a2300000-0000-4000-8000-000000000003','verification','private-files','badge/other.pdf','Other ID.pdf','application/pdf',100,'gov_id');
select is(public.provider_trust_badges('a2300000-0000-4000-8000-000000000002')->>'identity_reviewed','false','upload alone does not grant identity badge');
select is(public.provider_trust_badges('a2300000-0000-4000-8000-000000000002')->>'skills_reviewed','false','approval alone does not grant skills badge');
select set_config('request.jwt.claim.sub','a2300000-0000-4000-8000-000000000002',true);
set local role authenticated;
select throws_like($$select public.review_provider_credential('a2300000-0000-4000-8000-000000000002','a2310000-0000-4000-8000-000000000001','identity',true,'Fictional test review')$$,'%Administrator access required%','provider cannot award own badge');
select throws_like($$insert into public.provider_credential_reviews(provider_id,kind,file_id,reason) values('a2300000-0000-4000-8000-000000000002','identity','a2310000-0000-4000-8000-000000000001','Forged badge')$$,'%permission denied%','direct badge forgery is denied');
reset role;
select set_config('request.jwt.claim.sub','a2300000-0000-4000-8000-000000000001',true);
set local role authenticated;
select throws_like($$select public.review_provider_credential('a2300000-0000-4000-8000-000000000002','a2310000-0000-4000-8000-000000000003','identity',true,'Fictional test review')$$,'%private verification document%','cannot borrow another provider document');
select throws_like($$select public.review_provider_credential('a2300000-0000-4000-8000-000000000002','a2310000-0000-4000-8000-000000000002','identity',true,'Fictional test review')$$,'%government ID%','skill certificate is not identity evidence');
select throws_like($$select public.review_provider_credential('a2300000-0000-4000-8000-000000000002','a2310000-0000-4000-8000-000000000001','skills',true,'Fictional test review')$$,'%trade or professional credential%','government ID cannot produce skills badge');
select throws_like($$select public.review_provider_credential('a2300000-0000-4000-8000-000000000002','a2310000-0000-4000-8000-000000000001','identity',true,'')$$,'%review reason%','reason is required');
select lives_ok($$select public.review_provider_credential('a2300000-0000-4000-8000-000000000002','a2310000-0000-4000-8000-000000000001','identity',true,'Inspected fictional identity fixture')$$,'admin grants identity review');
select is(public.provider_trust_badges('a2300000-0000-4000-8000-000000000002')->>'identity_reviewed','true','identity becomes visible after explicit review');
select is(public.provider_trust_badges('a2300000-0000-4000-8000-000000000002')->>'skills_reviewed','false','identity review does not imply skills review');
select lives_ok($$select public.review_provider_credential('a2300000-0000-4000-8000-000000000002','a2310000-0000-4000-8000-000000000002','skills',true,'Inspected fictional trade fixture')$$,'admin separately grants skills review');
select is(public.provider_trust_badges('a2300000-0000-4000-8000-000000000002')->>'skills_label','TESDA NC II reviewed','skills label identifies actual category');
select is((select count(*)::integer from public.audit_logs where action='credential_badge_granted' and entity_id='a2300000-0000-4000-8000-000000000002'),2,'badge grants are audited');
reset role;
set local role anon;
select is((select trust_badges->>'identity_reviewed' from public.public_providers where id='a2300000-0000-4000-8000-000000000002'),'true','public view exposes approved badge summary');
select is((select count(*)::integer from jsonb_object_keys(public.provider_trust_badges('a2300000-0000-4000-8000-000000000002'))),3,'public summary contains no document or reviewer details');
select throws_like($$select * from public.provider_credential_reviews$$,'%permission denied%','anonymous users cannot read review documents');
reset role;
select set_config('request.jwt.claim.sub','a2300000-0000-4000-8000-000000000003',true);
set local role authenticated;
select is((select count(*)::integer from public.provider_credential_reviews),0,'other providers cannot read private review records');
reset role;
select set_config('request.jwt.claim.sub','a2300000-0000-4000-8000-000000000002',true);
set local role authenticated;
select is((select count(*)::integer from public.provider_credential_reviews),2,'owner can read own review records');
reset role;
update public.files set verification_category='training_cert' where id='a2310000-0000-4000-8000-000000000002';
select is(public.provider_trust_badges('a2300000-0000-4000-8000-000000000002')->>'skills_reviewed','false','changing reviewed document invalidates its badge');
select set_config('request.jwt.claim.sub','a2300000-0000-4000-8000-000000000001',true);
set local role authenticated;
select lives_ok($$select public.review_provider_credential('a2300000-0000-4000-8000-000000000002',null,'identity',false,'Revoked fictional identity review')$$,'admin can revoke badge');
select is(public.provider_trust_badges('a2300000-0000-4000-8000-000000000002')->>'identity_reviewed','false','revoked badge is no longer public');
select lives_ok($$select public.review_provider_credential('a2300000-0000-4000-8000-000000000003','a2310000-0000-4000-8000-000000000003','identity',true,'Reviewed pending applicant document')$$,'document can be reviewed separately from approval');
select is(public.provider_trust_badges('a2300000-0000-4000-8000-000000000003')->>'identity_reviewed','false','pending applicant does not get public approved badge');
reset role;
delete from public.files where id='a2310000-0000-4000-8000-000000000003';
select is((select count(*)::integer from public.provider_credential_reviews where provider_id='a2300000-0000-4000-8000-000000000003'),0,'deleting document removes its review');
select * from finish();
rollback;
