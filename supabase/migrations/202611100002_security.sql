create function public.active_user() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.profiles where id=auth.uid() and status='active') $$;
create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$ select public.active_user() and exists(select 1 from public.role_assignments where user_id=auth.uid() and role='admin') $$;
create function public.booking_member(bid uuid) returns boolean language sql stable security definer set search_path='' as $$ select public.active_user() and exists(select 1 from public.bookings where id=bid and auth.uid() in (customer_id,provider_id)) $$;
create function public.conversation_member(cid uuid) returns boolean language sql stable security definer set search_path='' as $$ select public.active_user() and exists(select 1 from public.conversation_members where conversation_id=cid and user_id=auth.uid()) $$;
create function public.case_owner(cid uuid) returns boolean language sql stable security definer set search_path='' as $$ select public.active_user() and exists(select 1 from public.support_cases where id=cid and owner_id=auth.uid()) $$;
create function public.approved_provider(pid uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.provider_profiles p join public.profiles u on u.id=p.id where p.id=pid and p.status='approved' and u.status='active') $$;
create function public.file_allowed(fid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.files f where f.id=fid and (public.is_admin() or (public.active_user() and (f.owner_id=auth.uid() or (f.kind='booking' and public.booking_member(f.booking_id)) or (f.kind='support' and public.case_owner(f.case_id))))))
$$;

do $$ declare t record; begin for t in select tablename from pg_tables where schemaname='public' loop
 execute format('alter table public.%I enable row level security',t.tablename);
 execute format('revoke all on public.%I from anon, authenticated',t.tablename);
 execute format('grant select on public.%I to authenticated',t.tablename);
 if t.tablename<>'audit_logs' then
 execute format('create policy admin_read on public.%I for select to authenticated using (public.is_admin())',t.tablename);
 end if;
end loop; end $$;
create policy audit_admin_read on public.audit_logs for select to authenticated using(public.is_admin());
create policy profile_own on public.profiles for select to authenticated using(id=auth.uid());
create policy role_own on public.role_assignments for select to authenticated using(user_id=auth.uid());
create policy addresses_own on public.addresses for all to authenticated using(user_id=auth.uid() and public.active_user()) with check(user_id=auth.uid() and public.active_user());
grant insert,update,delete on public.addresses to authenticated;
create policy catalog_public on public.categories for select to anon,authenticated using(active);
grant select on public.categories, public.provider_profiles,public.provider_services,public.reviews,public.announcements,public.app_releases to anon;
create policy provider_public on public.provider_profiles for select to anon,authenticated using(public.approved_provider(id));
create policy provider_own on public.provider_profiles for select to authenticated using(id=auth.uid());
create policy application_own on public.provider_applications for select to authenticated using(provider_id=auth.uid() and public.active_user());
create policy service_public on public.provider_services for select to anon,authenticated using(active and public.approved_provider(provider_id) and exists(select 1 from public.categories c where c.id=category_id and c.active));
create policy service_own on public.provider_services for select to authenticated using(provider_id=auth.uid() and public.active_user());
create policy weekly_own on public.weekly_availability for select to authenticated using(provider_id=auth.uid() and public.active_user());
create policy unavailable_own on public.unavailable_periods for select to authenticated using(provider_id=auth.uid() and public.active_user());
create policy drafts_own on public.booking_drafts for select to authenticated using(customer_id=auth.uid() and public.active_user());
create policy bookings_members on public.bookings for select to authenticated using(public.booking_member(id));
create policy events_members on public.booking_events for select to authenticated using(public.booking_member(booking_id));
create policy locations_members on public.booking_locations for select to authenticated using(public.booking_member(booking_id) and exists(select 1 from public.bookings b where b.id=booking_id and b.status in ('en_route','in_progress')));
create policy conversations_members on public.conversations for select to authenticated using(public.conversation_member(id));
create policy members_own on public.conversation_members for select to authenticated using(user_id=auth.uid() and public.active_user());
create policy messages_members on public.messages for select to authenticated using(public.conversation_member(conversation_id));
create policy payments_members on public.payments for select to authenticated using(public.booking_member(booking_id));
create policy payment_events_members on public.payment_events for select to authenticated using(exists(select 1 from public.payments p where p.id=payment_id and public.booking_member(p.booking_id)));
create policy invoices_members on public.invoices for select to authenticated using(public.booking_member(booking_id));
create policy ledger_own on public.commission_ledger for select to authenticated using(provider_id=auth.uid() and public.active_user());
create policy payouts_own on public.payout_requests for select to authenticated using(provider_id=auth.uid() and public.active_user());
create policy payout_items_own on public.payout_items for select to authenticated using(exists(select 1 from public.payout_requests p where p.id=payout_id and p.provider_id=auth.uid() and public.active_user()));
create policy refund_own on public.refund_requests for select to authenticated using(requested_by=auth.uid() and public.active_user());
create policy reviews_public on public.reviews for select to anon,authenticated using(visible and public.approved_provider(provider_id) and exists(select 1 from public.bookings b where b.id=booking_id and b.status='completed'));
-- Public reviews are inserted through an eligible-booking function only. Eligibility remains immutable.
drop policy reviews_public on public.reviews;
create policy reviews_public on public.reviews for select to anon,authenticated using(visible and public.approved_provider(provider_id));
create policy reviews_own on public.reviews for select to authenticated using(customer_id=auth.uid());
create policy cases_own on public.support_cases for select to authenticated using(public.case_owner(id));
create policy case_messages_own on public.case_messages for select to authenticated using(public.case_owner(case_id));
-- case_notes deliberately has only the admin SELECT policy and no client writes.
create policy files_allowed on public.files for select to authenticated using(public.file_allowed(id));
create policy announcement_public on public.announcements for select to anon,authenticated using(status='published' and publish_at<=now() and (audience='everyone' or (public.active_user() and audience=case when exists(select 1 from public.role_assignments where user_id=auth.uid() and role='provider') then 'providers' else 'customers' end)));
create policy notifications_own on public.notifications for select to authenticated using(user_id=auth.uid() and public.active_user());
create policy release_public on public.app_releases for select to anon,authenticated using(status='published' and verified_at is not null and published_at<=now());

create function public.reject_mutation() returns trigger language plpgsql set search_path='' as $$ begin raise exception 'Append-only record'; end $$;
create trigger audit_immutable before update or delete on public.audit_logs for each row execute function public.reject_mutation();
create trigger events_immutable before update or delete on public.booking_events for each row execute function public.reject_mutation();
create trigger payment_events_immutable before update or delete on public.payment_events for each row execute function public.reject_mutation();
create trigger invoices_immutable before update or delete on public.invoices for each row execute function public.reject_mutation();
create function public.audit_admin_change() returns trigger language plpgsql security definer set search_path='' as $$
declare rowdata jsonb; begin
 rowdata=case when TG_OP='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 if public.is_admin() then
 insert into public.audit_logs(actor_id,action,entity,entity_id,details) values(auth.uid(),lower(TG_OP),TG_TABLE_NAME,coalesce(rowdata->>'id',rowdata->>'user_id'),jsonb_strip_nulls(jsonb_build_object('status',rowdata->'status','previous_status',case when TG_OP='UPDATE' then to_jsonb(old)->'status' end)));
 end if;
 if TG_OP='DELETE' then return old; else return new; end if;
end $$;
do $$ declare t text; begin foreach t in array array['provider_profiles','provider_applications','profiles','account_restrictions','categories','provider_services','bookings','payments','payment_events','payout_requests','refund_requests','support_cases','case_notes','case_messages','announcements','app_settings','app_releases'] loop
 execute format('create trigger admin_audit after insert or update or delete on public.%I for each row execute function public.audit_admin_change()',t);
end loop; end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('private-files','private-files',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf']),
 ('avatars','avatars',true,5242880,array['image/jpeg','image/png','image/webp']),
 ('android-releases','android-releases',false,52428800,array['application/vnd.android.package-archive','application/octet-stream']) on conflict(id) do nothing;
-- No browser upload/update/delete grants. Edge Functions validate bytes, ownership, paths and admin privilege before service writes.
-- Private reads use short-lived signed URLs issued by files after explicit authorization. Draft APKs have no public storage policy.
create policy public_avatar_read on storage.objects for select to anon,authenticated using(bucket_id='avatars' and exists(select 1 from public.files f where f.path=name and f.kind='avatar' and (f.owner_id=auth.uid() or exists(select 1 from public.provider_profiles p where p.id=f.owner_id and p.avatar_path=name and public.approved_provider(p.id)))));

-- Postgres Changes uses the source table RLS for every subscriber; no public broadcast channels are created.
alter publication supabase_realtime add table public.messages, public.notifications, public.bookings, public.booking_locations;
