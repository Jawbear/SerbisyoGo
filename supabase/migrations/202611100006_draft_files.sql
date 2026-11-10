alter table public.files add column draft_id uuid references public.booking_drafts(id);
alter table public.files drop constraint files_check;
alter table public.files add constraint files_scope_check check((kind='booking' and (booking_id is not null or draft_id is not null)) or (kind='support' and case_id is not null) or kind in ('verification','avatar'));
create index files_draft_idx on public.files(draft_id);
create or replace function public.file_allowed(fid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.files f where f.id=fid and (public.is_admin() or (public.active_user() and (f.owner_id=auth.uid() or (f.kind='booking' and public.booking_member(f.booking_id)) or (f.kind='support' and public.case_owner(f.case_id))))))
$$;
create function public.attach_draft_files() returns trigger language plpgsql security definer set search_path='' as $$
begin update public.files set booking_id=new.id,draft_id=null where draft_id=new.idempotency_key and owner_id=new.customer_id and kind='booking';return new;end $$;
create trigger attach_files_after_booking after insert on public.bookings for each row execute function public.attach_draft_files();
revoke execute on function public.attach_draft_files() from public,anon,authenticated;
