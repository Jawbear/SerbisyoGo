-- Migration: 202611150013_google_oauth_accounts.sql
-- Description: Enhance new_user() trigger to cleanly provision profiles and roles
-- for Google OAuth (Gmail) signups as well as standard email/password signups.

create or replace function public.new_user() returns trigger
language plpgsql security definer set search_path='' as $$
declare
  raw_name text;
  clean_name text;
  user_phone text;
begin
  -- Extract best available name from OAuth metadata or email prefix
  raw_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(trim(new.raw_user_meta_data->>'user_name'), ''),
    split_part(coalesce(new.email, ''), '@', 1),
    'User'
  );
  clean_name := left(raw_name, 100);

  -- Validate phone if provided in metadata; otherwise leave null for user to complete later
  if (new.raw_user_meta_data->>'phone') ~ '^\+639[0-9]{9}$' then
    user_phone := new.raw_user_meta_data->>'phone';
  else
    user_phone := null;
  end if;

  -- Create profile if it does not exist, or backfill name if empty
  insert into public.profiles(id, full_name, phone)
  values(new.id, clean_name, user_phone)
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
