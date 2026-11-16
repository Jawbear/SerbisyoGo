begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();

insert into auth.users(id,email,raw_user_meta_data) values
 ('91000000-0000-4000-8000-000000000001','identity-a@example.test','{"full_name":"Identity Santos"}'),
 ('91000000-0000-4000-8000-000000000002','identity-b@example.test','{"full_name":"Identity Cruz"}');
select is((select full_name from public.profiles where id='91000000-0000-4000-8000-000000000002'),'Identity Cruz','shared first names are allowed');
select is((public.check_registration_availability(' IDENTITY-A@example.test ','Different Person')->>'field'),'email','duplicate email ignores case and surrounding spaces');
select is((public.check_registration_availability('new-identity@example.test',E' identity\t SANTOS ')->>'field'),'name','duplicate full name ignores case and repeated whitespace');
select is((public.check_registration_availability('new-identity@example.test','Identity Reyes')->>'available')::boolean,true,'shared first name remains available');
select throws_like($$insert into auth.users(id,email,raw_user_meta_data) values('91000000-0000-4000-8000-000000000003','identity-c@example.test','{"full_name":"IDENTITY   Santos"}')$$,'%full name is already registered%','signup rejects duplicate names instead of adding a suffix');
select throws_like($$update public.profiles set full_name='identity santos' where id='91000000-0000-4000-8000-000000000002'$$,'%full name is already registered%','profile edits cannot introduce duplicate names');
select throws_like($$update auth.users set email=' IDENTITY-A@example.test ' where id='91000000-0000-4000-8000-000000000002'$$,'%auth_users_normalized_email_unique_idx%','email edits cannot bypass uniqueness with case or spaces');
select is((select count(*) from auth.users where id='91000000-0000-4000-8000-000000000003'),0::bigint,'rejected signup leaves no partial identity');
select * from finish();
rollback;
