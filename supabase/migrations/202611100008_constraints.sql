create unique index one_open_refund_request on public.refund_requests(booking_id) where status in ('requested','reviewing','refund_recorded');
create or replace function public.new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
insert into public.profiles(id,full_name,phone) values(new.id,left(coalesce(new.raw_user_meta_data->>'full_name',''),100),case when (new.raw_user_meta_data->>'phone') ~ '^\+639[0-9]{9}$' then new.raw_user_meta_data->>'phone' else null end);
insert into public.role_assignments(user_id,role) values(new.id,'customer');return new;end $$;
-- Metadata is never used to choose a role, approval or account status.
