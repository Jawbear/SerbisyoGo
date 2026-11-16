-- Shared first names are allowed. Compare the complete name ignoring case and
-- repeated whitespace. Stop on existing conflicts; never rename real people.
create or replace function public.account_name_key(p_name text) returns text
language sql immutable parallel safe set search_path='' as $$
 select lower(btrim(regexp_replace(coalesce(p_name,''), '[[:space:]]+', ' ', 'g')))
$$;

do $$
begin
 if exists(select 1 from public.profiles
   where public.account_name_key(full_name) <> ''
   group by public.account_name_key(full_name) having count(*) > 1) then
  raise exception 'Duplicate full names found. Run the account audit and resolve the affected profiles before applying this migration.';
 end if;
 if exists(select 1 from auth.users where btrim(coalesce(email,'')) <> ''
   group by lower(btrim(email)) having count(*) > 1) then
  raise exception 'Duplicate emails found. Run the account audit and resolve the affected identities before applying this migration.';
 end if;
end $$;

-- Build the stronger index before replacing the earlier constraint.
create unique index profiles_full_name_normalized_unique_idx
 on public.profiles(public.account_name_key(full_name))
 where public.account_name_key(full_name) <> '';
drop index if exists public.profiles_full_name_unique_idx;
alter index public.profiles_full_name_normalized_unique_idx rename to profiles_full_name_unique_idx;
create unique index auth_users_normalized_email_unique_idx
 on auth.users(lower(btrim(email))) where btrim(coalesce(email,'')) <> '';

create or replace function public.validate_account_name() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 new.full_name := btrim(regexp_replace(new.full_name, '[[:space:]]+', ' ', 'g'));
 if exists(select 1 from public.profiles p where p.id <> new.id
   and public.account_name_key(p.full_name) = public.account_name_key(new.full_name)
   and public.account_name_key(new.full_name) <> '') then
  raise exception 'This full name is already registered. Shared first names are allowed; the full name must be different.' using errcode='23505';
 end if;
 return new;
end $$;
create trigger validate_account_name before insert or update of full_name on public.profiles
 for each row execute function public.validate_account_name();

create or replace function public.check_registration_availability(p_email text,p_full_name text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from auth.users where lower(btrim(email)) = lower(btrim(p_email))) then
  return jsonb_build_object('available',false,'field','email','error','This email address is already registered. Please sign in or use another email.');
 end if;
 if public.account_name_key(p_full_name) <> '' and exists(select 1 from public.profiles
   where public.account_name_key(full_name) = public.account_name_key(p_full_name)) then
  return jsonb_build_object('available',false,'field','name','error','This full name is already registered. Shared first names are allowed; the full name must be different.');
 end if;
 return jsonb_build_object('available',true);
end $$;

create or replace function public.new_user() returns trigger
language plpgsql security definer set search_path='' as $$
declare account_name text; user_phone text;
begin
 account_name := left(coalesce(
  nullif(btrim(new.raw_user_meta_data->>'full_name'),''),
  nullif(btrim(new.raw_user_meta_data->>'name'),''),
  nullif(btrim(new.raw_user_meta_data->>'user_name'),''),
  nullif(split_part(coalesce(new.email,''),'@',1),''),'User'),100);
 if (new.raw_user_meta_data->>'phone') ~ '^\+639[0-9]{9}$' then
  user_phone := new.raw_user_meta_data->>'phone';
 end if;
 insert into public.profiles(id,full_name,phone) values(new.id,account_name,user_phone)
 on conflict(id) do nothing;
 insert into public.role_assignments(user_id,role) values(new.id,'customer')
 on conflict(user_id) do nothing;
 return new;
end $$;

notify pgrst, 'reload schema';
