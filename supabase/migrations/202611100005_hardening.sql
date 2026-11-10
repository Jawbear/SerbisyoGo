create function public.audience_allowed(a text) returns boolean language sql stable security definer set search_path='' as $$ select a='everyone' or (public.active_user() and a=case when exists(select 1 from public.role_assignments where user_id=auth.uid() and role='provider') then 'providers' else 'customers' end) $$;
grant execute on function public.audience_allowed(text) to anon,authenticated;
drop policy announcement_public on public.announcements;
create policy announcement_public on public.announcements for select to anon,authenticated using(status='published' and publish_at<=now() and public.audience_allowed(audience));
-- Avatars are served only by the files function after checking publication/ownership.
update storage.buckets set public=false where id='avatars';
drop policy public_avatar_read on storage.objects;
-- Ensure audited financial history can never be altered directly, including accidental service-role updates.
create trigger ledger_no_update before update on public.commission_ledger for each row execute function public.reject_mutation();
create trigger case_notes_immutable before update or delete on public.case_notes for each row execute function public.reject_mutation();
-- Materialized account status stays inaccessible to profile form updates; roles have no client mutation grants.
alter default privileges in schema public revoke execute on functions from public;
