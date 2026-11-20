begin;
set local search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,raw_user_meta_data) values
 ('aa240000-0000-4000-8000-000000000001','discovery-owner@example.test','{"full_name":"Discovery Provider Monitor"}'),
 ('aa240000-0000-4000-8000-000000000002','discovery-other@example.test','{"full_name":"Discovery Provider Other"}');
insert into public.provider_profiles(id,display_name,headline,bio,city,status) values
 ('aa240000-0000-4000-8000-000000000001','Area owner','House repairs','Repairs fixtures used in the discovery test.','Bunawan','approved'),
 ('aa240000-0000-4000-8000-000000000002','Other owner','House repairs','Repairs fixtures used in the discovery test.','Bunawan','approved');
insert into public.provider_services(id,provider_id,category_id,title,rate_centavos,duration_minutes,pricing_mode)
values ('aa240000-0000-4000-8000-000000000003','aa240000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','House repairs',10000,30,'fixed');
insert into public.weekly_availability(provider_id,weekday,starts_minute,ends_minute)
select 'aa240000-0000-4000-8000-000000000001',extract(dow from (now() at time zone 'Asia/Manila')::date+1),600,660;
select set_config('request.jwt.claim.sub','aa240000-0000-4000-8000-000000000001',true);
set local role authenticated;
select is((select service_longitude from public.public_providers where id=auth.uid()),null::double precision,'existing providers have no public pin by default');
select lives_ok($$select public.set_service_area_pin(8.178122,125.993511)$$,'provider publishes an approximate point');
select is((select service_longitude from public.public_providers where id=auth.uid()),125.994::double precision,'published coordinates are coarse');
select is((select service_latitude from public.public_providers where id='aa240000-0000-4000-8000-000000000002'),null::double precision,'setting a pin leaves another provider unchanged');
select throws_like($$select public.set_service_area_pin(8,null)$$,'%public_service_point_valid%','a partial coordinate pair cannot be saved');
select throws_like($$select public.set_service_area_pin(94,126)$$,'%public_service_point_valid%','invalid latitudes are rejected');
select lives_ok($$select public.set_service_area_pin(null,null)$$,'owner can unpublish their pin');
reset role;
set local role anon;
select is((select service_latitude from public.public_providers where id='aa240000-0000-4000-8000-000000000001'),null::double precision,'removed pin disappears from public results');
select is((select min_rate from public.public_providers where id='aa240000-0000-4000-8000-000000000002'),null::integer,'missing offering has no advertised rate');
select ok(not has_function_privilege('anon','public.set_service_area_pin(double precision,double precision)','execute'),'anonymous clients cannot write pins');
select is(public.discovery_available_services((now() at time zone 'Asia/Manila')::date+1,array['aa240000-0000-4000-8000-000000000003'::uuid]),
 '["aa240000-0000-4000-8000-000000000003"]'::jsonb,'date search returns an offering with an actual available slot');
select is(public.discovery_available_services((now() at time zone 'Asia/Manila')::date+2,array['aa240000-0000-4000-8000-000000000003'::uuid]),
 '[]'::jsonb,'date search omits a service outside its working hours');
reset role;
update auth.users set raw_app_meta_data = '{"development_fixture":"serbisyogo-development-v1"}'
where id='aa240000-0000-4000-8000-000000000001';
set local role anon;
select is((select count(*) from public.public_providers where id='aa240000-0000-4000-8000-000000000001'),0::bigint,'seeded QA professionals do not appear in discovery');
select is((select count(*) from public.provider_services where id='aa240000-0000-4000-8000-000000000003'),0::bigint,'seeded QA offers are excluded from the public catalog');
select is(public.discovery_available_services((now() at time zone 'Asia/Manila')::date+1,array['aa240000-0000-4000-8000-000000000003'::uuid]),
 '[]'::jsonb,'QA slots are excluded from discovery');
select ok(public.marketplace_account('aa240000-0000-4000-8000-000000000002'),'ordinary accounts remain eligible for discovery');
reset role;
set local role authenticated;
select is((select count(*) from public.provider_profiles where id=auth.uid()),1::bigint,'fixture owner retains private access');
select is((select count(*) from public.public_providers where id=auth.uid()),0::bigint,'an owner cannot publish their QA listing');
select * from finish();
rollback;
