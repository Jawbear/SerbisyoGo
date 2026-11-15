-- Migration: 202611160014_unique_names_and_auth_checks.sql
-- Description: Enforce unique names across users, provide registration availability check (unique email and name), and ensure password/identity integrity.

-- 1. Deduplicate any existing identical full_names before creating the unique index
do $$
declare
  dup_record record;
  profile_rec record;
  counter int;
begin
  for dup_record in (
    select lower(trim(full_name)) as norm_name
    from public.profiles
    where full_name is not null and trim(full_name) <> ''
    group by lower(trim(full_name))
    having count(*) > 1
  ) loop
    counter := 1;
    for profile_rec in (
      select id from public.profiles
      where lower(trim(full_name)) = dup_record.norm_name
      order by created_at asc
    ) loop
      if counter > 1 then
        update public.profiles
        set full_name = left(full_name || ' ' || counter, 100)
        where id = profile_rec.id;
      end if;
      counter := counter + 1;
    end loop;
  end loop;
end $$;

-- Create unique index on normalized full_name in public.profiles
create unique index if not exists profiles_full_name_unique_idx
on public.profiles (lower(trim(full_name)))
where full_name is not null and trim(full_name) <> '';

-- 2. Create security definer RPC function to check registration availability (email & name)
create or replace function public.check_registration_availability(
  p_email text,
  p_full_name text default null
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  norm_email text := lower(trim(coalesce(p_email, '')));
  norm_name text := lower(trim(coalesce(p_full_name, '')));
  email_taken boolean := false;
  name_taken boolean := false;
begin
  -- Check email in auth.users
  if norm_email <> '' then
    select exists(
      select 1 from auth.users where lower(trim(email)) = norm_email
    ) into email_taken;
  end if;

  if email_taken then
    return jsonb_build_object(
      'available', false,
      'field', 'email',
      'error', 'This email is already in use or registered. Please sign in or use another email.'
    );
  end if;

  -- Check full_name in public.profiles
  if norm_name <> '' then
    select exists(
      select 1 from public.profiles where lower(trim(full_name)) = norm_name
    ) into name_taken;
  end if;

  if name_taken then
    return jsonb_build_object(
      'available', false,
      'field', 'name',
      'error', 'This name is already taken. Please choose a unique name.'
    );
  end if;

  return jsonb_build_object('available', true);
end $$;

grant execute on function public.check_registration_availability(text, text) to anon, authenticated, service_role;

-- 3. Update new_user() trigger to guarantee unique names for Google OAuth signups
create or replace function public.new_user() returns trigger
language plpgsql security definer set search_path='' as $$
declare
  raw_name text;
  clean_name text;
  unique_name text;
  user_phone text;
  suffix int := 1;
begin
  -- Extract best available name from OAuth metadata or email prefix
  raw_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(trim(new.raw_user_meta_data->>'user_name'), ''),
    split_part(coalesce(new.email, ''), '@', 1),
    'User'
  );
  clean_name := left(raw_name, 90);
  unique_name := clean_name;

  -- Ensure name uniqueness for OAuth signups so they never collide
  while exists(
    select 1 from public.profiles
    where lower(trim(full_name)) = lower(trim(unique_name))
      and id <> new.id
  ) loop
    suffix := suffix + 1;
    unique_name := left(clean_name, 90) || ' ' || suffix;
  end loop;

  -- Validate phone if provided in metadata
  if (new.raw_user_meta_data->>'phone') ~ '^\+639[0-9]{9}$' then
    user_phone := new.raw_user_meta_data->>'phone';
  else
    user_phone := null;
  end if;

  -- Create profile if it does not exist, or backfill name if empty
  insert into public.profiles(id, full_name, phone)
  values(new.id, unique_name, user_phone)
  on conflict (id) do update set
    full_name = case when public.profiles.full_name = '' then excluded.full_name else public.profiles.full_name end,
    updated_at = now();

  -- Always assign standard customer role
  insert into public.role_assignments(user_id, role)
  values(new.id, 'customer')
  on conflict (user_id) do nothing;

  return new;
end $$;

notify pgrst, 'reload schema';
