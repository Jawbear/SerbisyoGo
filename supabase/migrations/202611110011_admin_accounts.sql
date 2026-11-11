-- Administrative account management. Browser/mobile callers never receive an
-- Auth admin key. Permanent purges are service-only, resumable operations.
create schema if not exists admin_private;
revoke all on schema admin_private from public, anon, authenticated, service_role;
create table admin_private.account_purges (
 id uuid primary key default gen_random_uuid(), target_id uuid unique not null,
 actor_id uuid not null, confirmation_hash text not null, reason text not null,
 phase text not null default 'files' check(phase in ('files','auth')),
 counts jsonb not null default '{}', created_at timestamptz not null default now()
);
create table admin_private.purge_transactions (
 transaction_id bigint primary key, backend_id integer not null
);
revoke all on all tables in schema admin_private from public, anon, authenticated, service_role;

create function admin_private.require_admin_actor(p_actor uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.profiles p join public.role_assignments r on r.user_id=p.id where p.id=p_actor and p.status='active' and r.role='admin') then
  raise exception 'Active administrator required' using errcode='42501';
 end if;
end $$;

create function public.admin_accounts(p_search text default '',p_role text default '',p_status text default '',p_offset integer default 0,p_limit integer default 25,p_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare rows jsonb; total integer; begin
 perform public.require_admin();
 if p_offset<0 or p_limit not between 1 and 100 or length(p_search)>100 then raise exception 'Invalid account search'; end if;
 with accounts as (
  select u.id,u.email,u.email_confirmed_at,u.last_sign_in_at,u.created_at,p.updated_at,
   coalesce(p.full_name,'Deletion pending') full_name,p.phone,
   coalesce(r.role,'customer') role,case when q.id is not null then 'deleting' else p.status end status,
   pp.status provider_status,q.id purge_id
  from auth.users u left join public.profiles p on p.id=u.id left join public.role_assignments r on r.user_id=u.id
  left join public.provider_profiles pp on pp.id=u.id left join admin_private.account_purges q on q.target_id=u.id
  where u.deleted_at is null and (p.id is not null or q.id is not null)
  union all
  select q.target_id,null::text,null::timestamptz,null::timestamptz,q.created_at,null::timestamptz,
   'Deletion pending',null::text,'customer','deleting',null::text,q.id
  from admin_private.account_purges q where not exists(select 1 from auth.users where id=q.target_id)
 ), filtered as (
  select * from accounts a where (p_id is null or a.id=p_id) and (p_role='' or a.role=p_role) and (p_status='' or a.status=p_status)
  and (p_search='' or a.full_name ilike '%'||p_search||'%' or a.email ilike '%'||p_search||'%' or a.phone ilike '%'||p_search||'%')
 ), page as (select * from filtered order by created_at desc,id offset p_offset limit p_limit)
 select (select count(*) from filtered),coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]') into total,rows;
 return jsonb_build_object('rows',rows,'total',total,'offset',p_offset,'limit',p_limit);
end $$;

create function public.admin_save_account(p_id uuid,p_name text,p_phone text,p_status text,p_role text,p_reason text,p_updated_at timestamptz default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid=public.require_admin(); original public.profiles; old_role text; begin
 perform pg_advisory_xact_lock(hashtext('serbisyogo-admin-accounts'));
 perform admin_private.require_admin_actor(actor);
 select * into original from public.profiles where id=p_id for update;
 if original.id is null then raise exception 'Account not found'; end if;
 if exists(select 1 from admin_private.account_purges where target_id=p_id) then raise exception 'Permanent deletion is already in progress'; end if;
 if length(trim(p_name)) not between 2 and 100 or (p_phone is not null and p_phone !~ '^\+639[0-9]{9}$') or p_status not in ('active','restricted','deactivated') or p_role not in ('customer','provider','admin') or length(trim(p_reason)) not between 5 and 1000 then raise exception 'Valid profile, role, account status and reason are required'; end if;
 if p_updated_at is not null and original.updated_at<>p_updated_at then raise exception 'This account changed. Refresh before saving'; end if;
 select role into old_role from public.role_assignments where user_id=p_id;
 if p_id=actor and (p_role<>'admin' or p_status<>'active') then raise exception 'You cannot remove your own administrator access'; end if;
 if old_role='admin' and (p_role<>'admin' or p_status<>'active') and original.status='active' and (select count(*) from public.profiles p join public.role_assignments r on r.user_id=p.id where p.status='active' and r.role='admin')<=1 then raise exception 'The last active administrator must be retained'; end if;
 if p_role='provider' and old_role<>'provider' and not exists(select 1 from public.provider_profiles where id=p_id and status='approved') then raise exception 'Approve the provider application before assigning the provider role'; end if;
 update public.profiles set full_name=trim(p_name),phone=p_phone,status=p_status where id=p_id;
 update public.role_assignments set role=p_role,granted_by=case when role<>p_role then actor else granted_by end where user_id=p_id;
 insert into public.account_restrictions(user_id,actor_id,status,reason) values(p_id,actor,p_status,trim(p_reason));
 insert into public.audit_logs(actor_id,action,entity,entity_id,details) values(actor,'account_updated','account',p_id::text,jsonb_build_object('reason',trim(p_reason),'role',p_role,'status',p_status));
 return p_id;
end $$;

create function public.admin_account_auth_guard(p_id uuid,p_action text,p_reason text) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid=public.require_admin(); begin
 perform pg_advisory_xact_lock(hashtext('serbisyogo-admin-accounts'));
 perform admin_private.require_admin_actor(actor);
 if p_action not in ('email_change','password_reset','email_verified','account_created') or length(trim(p_reason)) not between 5 and 1000 then raise exception 'Valid administrative action and reason required'; end if;
 if p_action<>'account_created' and not exists(select 1 from public.profiles where id=p_id) then raise exception 'Account not found'; end if;
 if exists(select 1 from admin_private.account_purges where target_id=p_id) then raise exception 'Permanent deletion is already in progress'; end if;
 insert into public.audit_logs(actor_id,action,entity,entity_id,details) values(actor,p_action||'_requested','account',p_id::text,jsonb_build_object('reason',trim(p_reason)));
 return actor;
end $$;

create function admin_private.account_plan(p_target uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare b uuid[]; d uuid[]; c uuid[]; v uuid[]; s uuid[]; f uuid[]; pay uuid[]; ledger uuid[]; payouts uuid[]; objects jsonb; begin
 b=array(select id from public.bookings where customer_id=p_target or provider_id=p_target);
 s=array(select id from public.provider_services where provider_id=p_target);
 d=array(select id from public.booking_drafts where customer_id=p_target or provider_service_id=any(s));
 c=array(select id from public.support_cases where owner_id=p_target or booking_id=any(b));
 v=array(select id from public.conversations where booking_id=any(b) or id in(select conversation_id from public.conversation_members where user_id=p_target));
 f=array(select id from public.files where owner_id=p_target or booking_id=any(b) or draft_id=any(d) or case_id=any(c));
 pay=array(select id from public.payments where booking_id=any(b));
 ledger=array(select id from public.commission_ledger where booking_id=any(b) or provider_id=p_target);
 payouts=array(select id from public.payout_requests where provider_id=p_target);
 select coalesce(jsonb_agg(to_jsonb(paths)),'[]') into objects from (
  select bucket,path from public.files where id=any(f)
  union select 'android-releases',artifact_path from public.app_releases where created_by=p_target
  union select o.bucket_id,o.name from storage.objects o where coalesce(to_jsonb(o)->>'owner_id',to_jsonb(o)->>'owner')=p_target::text or o.name like p_target::text||'/%'
 ) paths;
 return jsonb_build_object('bookings',to_jsonb(b),'drafts',to_jsonb(d),'cases',to_jsonb(c),'conversations',to_jsonb(v),'services',to_jsonb(s),'file_ids',to_jsonb(f),'payments',to_jsonb(pay),'ledger',to_jsonb(ledger),'payouts',to_jsonb(payouts),'files',objects,
 'counts',jsonb_build_object('bookings',cardinality(b),'drafts',cardinality(d),'support_cases',cardinality(c),'conversations',cardinality(v),'services',cardinality(s),'files',jsonb_array_length(objects),'payments',cardinality(pay),'ledger_entries',cardinality(ledger),'payouts',cardinality(payouts),
 'messages',(select count(*) from public.messages where sender_id=p_target or conversation_id=any(v)),
 'support_messages',(select count(*) from public.case_messages where sender_id=p_target or case_id=any(c)),
 'reviews',(select count(*) from public.reviews where customer_id=p_target or provider_id=p_target or booking_id=any(b))));
end $$;

create function public.admin_account_purge_plan(p_actor uuid,p_target uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 perform admin_private.require_admin_actor(p_actor);
 if p_actor=p_target then raise exception 'You cannot permanently delete your own administrator account'; end if;
 if not exists(select 1 from auth.users where id=p_target) and not exists(select 1 from admin_private.account_purges where target_id=p_target) then raise exception 'Account not found'; end if;
 return admin_private.account_plan(p_target);
end $$;

create function public.admin_begin_account_purge(p_actor uuid,p_target uuid,p_confirmation text,p_reason text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare job admin_private.account_purges; expected text; plan jsonb; begin
 perform pg_advisory_xact_lock(hashtext('serbisyogo-admin-accounts'));
 perform admin_private.require_admin_actor(p_actor);
 if p_target=p_actor then raise exception 'You cannot permanently delete your own administrator account'; end if;
 if length(trim(p_reason)) not between 5 and 1000 then raise exception 'A deletion reason is required'; end if;
 select * into job from admin_private.account_purges where target_id=p_target for update;
 if job.id is null then
  select coalesce(nullif(email,''),id::text) into expected from auth.users where id=p_target;
  if expected is null then raise exception 'Account not found'; end if;
  if lower(trim(p_confirmation))<>lower(expected) then raise exception 'Type the exact account email or ID to confirm permanent deletion'; end if;
  plan=admin_private.account_plan(p_target);
  insert into admin_private.account_purges(target_id,actor_id,confirmation_hash,reason,counts) values(p_target,p_actor,encode(extensions.digest(lower(trim(p_confirmation))||p_target::text,'sha256'),'hex'),trim(p_reason),plan->'counts') returning * into job;
  update public.profiles set status='deactivated' where id=p_target;
  update public.provider_profiles set status='suspended' where id=p_target;
 else
  if job.confirmation_hash<>encode(extensions.digest(lower(trim(p_confirmation))||p_target::text,'sha256'),'hex') and trim(p_confirmation)<>p_target::text then raise exception 'Deletion confirmation does not match'; end if;
  plan=admin_private.account_plan(p_target);
 end if;
 return jsonb_build_object('operation_id',job.id,'phase',job.phase,'plan',plan);
end $$;

-- Only the dedicated purge transaction may delete append-only records. An
-- authenticated caller cannot create this private transaction marker.
create or replace function public.reject_mutation() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='DELETE' and exists(select 1 from admin_private.purge_transactions where transaction_id=txid_current() and backend_id=pg_backend_pid()) then return old; end if;
 raise exception 'Append-only record';
end $$;
create or replace function public.protect_ledger() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='DELETE' then
  if exists(select 1 from admin_private.purge_transactions where transaction_id=txid_current() and backend_id=pg_backend_pid()) then return old; end if;
  raise exception 'Financial ledger records are retained';
 end if;
 if (to_jsonb(new)-'reversed_at')<>(to_jsonb(old)-'reversed_at') or old.reversed_at is not null then raise exception 'Only the first reversal marker can be recorded'; end if;
 return new;
end $$;

create or replace function public.audit_admin_change() returns trigger language plpgsql security definer set search_path='' as $$
declare rowdata jsonb; begin
 if not exists(select 1 from admin_private.purge_transactions where transaction_id=txid_current() and backend_id=pg_backend_pid()) and public.is_admin() then
  rowdata=case when TG_OP='DELETE' then to_jsonb(old) else to_jsonb(new) end;
  insert into public.audit_logs(actor_id,action,entity,entity_id,details) values(auth.uid(),lower(TG_OP),TG_TABLE_NAME,coalesce(rowdata->>'id',rowdata->>'user_id'),jsonb_strip_nulls(jsonb_build_object('status',rowdata->'status','previous_status',case when TG_OP='UPDATE' then to_jsonb(old)->'status' end)));
 end if;
 if TG_OP='DELETE' then return old; else return new; end if;
end $$;

create function public.admin_purge_account_records(p_actor uuid,p_target uuid,p_operation uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare job admin_private.account_purges; plan jsonb; b uuid[]; d uuid[]; c uuid[]; v uuid[]; s uuid[]; f uuid[]; pay uuid[]; ledger uuid[]; payouts uuid[]; ids text[]; begin
 perform pg_advisory_xact_lock(hashtext('serbisyogo-admin-accounts'));
 perform admin_private.require_admin_actor(p_actor);
 if p_actor=p_target then raise exception 'Self deletion is not allowed'; end if;
 select * into job from admin_private.account_purges where id=p_operation and target_id=p_target for update;
 if job.id is null then raise exception 'Confirmed deletion operation required'; end if;
 if job.phase='auth' then return job.counts; end if;
 plan=admin_private.account_plan(p_target);
 if exists(select 1 from storage.objects o join jsonb_to_recordset(plan->'files') as x(bucket text,path text) on o.bucket_id=x.bucket and o.name=x.path) then raise exception 'File cleanup is incomplete. Retry permanent deletion'; end if;
 b=array(select jsonb_array_elements_text(plan->'bookings')::uuid); d=array(select jsonb_array_elements_text(plan->'drafts')::uuid);
 c=array(select jsonb_array_elements_text(plan->'cases')::uuid); v=array(select jsonb_array_elements_text(plan->'conversations')::uuid);
 s=array(select jsonb_array_elements_text(plan->'services')::uuid); f=array(select jsonb_array_elements_text(plan->'file_ids')::uuid);
 pay=array(select jsonb_array_elements_text(plan->'payments')::uuid); ledger=array(select jsonb_array_elements_text(plan->'ledger')::uuid); payouts=array(select jsonb_array_elements_text(plan->'payouts')::uuid);
 ids=array(select unnest(array[p_target]||b||d||c||v||s||f||pay||ledger||payouts)::text);
 ids=ids||array(select id::text from public.provider_applications where provider_id=p_target)
  ||array(select id::text from public.payment_events where payment_id=any(pay) or actor_id=p_target)
  ||array(select id::text from public.booking_events where booking_id=any(b) or actor_id=p_target)
  ||array(select id::text from public.case_notes where case_id=any(c) or admin_id=p_target)
  ||array(select id::text from public.case_messages where case_id=any(c) or sender_id=p_target)
  ||array(select id::text from public.refund_requests where booking_id=any(b) or requested_by=p_target)
  ||array(select id::text from public.announcements where created_by=p_target)
  ||array(select id::text from public.app_releases where created_by=p_target)
  ||array(select id::text from public.account_restrictions where user_id=p_target or actor_id=p_target);
 insert into admin_private.purge_transactions(transaction_id,backend_id) values(txid_current(),pg_backend_pid());
 delete from public.payout_items where payout_id=any(payouts) or ledger_id=any(ledger);
 delete from public.payout_requests where id=any(payouts);
 update public.payout_requests set reviewed_by=null where reviewed_by=p_target;
 delete from public.commission_ledger where id=any(ledger);
 delete from public.invoices where booking_id=any(b);
 delete from public.payment_events where payment_id=any(pay) or actor_id=p_target;
 delete from public.payments where id=any(pay);
 update public.payments set settled_by=null where settled_by=p_target;
 delete from public.refund_requests where booking_id=any(b) or requested_by=p_target;
 delete from public.reviews where booking_id=any(b) or customer_id=p_target or provider_id=p_target;
 delete from public.case_notes where case_id=any(c) or admin_id=p_target;
 delete from public.case_messages where case_id=any(c) or sender_id=p_target;
 delete from public.messages where conversation_id=any(v) or sender_id=p_target;
 delete from public.conversation_members where conversation_id=any(v) or user_id=p_target;
 delete from public.conversations where id=any(v);
 delete from public.files where id=any(f);
 delete from public.support_cases where id=any(c);
 delete from public.booking_locations where booking_id=any(b) or provider_id=p_target;
 delete from public.booking_events where booking_id=any(b) or actor_id=p_target;
 delete from public.bookings where id=any(b);
 delete from public.booking_drafts where id=any(d);
 delete from public.weekly_availability where provider_id=p_target;
 delete from public.unavailable_periods where provider_id=p_target;
 delete from public.provider_services where id=any(s);
 delete from public.provider_applications where provider_id=p_target;
 update public.provider_applications set reviewed_by=null where reviewed_by=p_target;
 delete from public.provider_profiles where id=p_target;
 delete from public.addresses where user_id=p_target;
 delete from public.notifications where user_id=p_target or exists(select 1 from unnest(ids) i where position(i in coalesce(href,''))>0);
 delete from public.account_restrictions where user_id=p_target or actor_id=p_target;
 delete from public.announcements where created_by=p_target;
 delete from public.app_releases where created_by=p_target;
 update public.app_settings set created_by=null where created_by=p_target;
 update public.role_assignments set granted_by=null where granted_by=p_target;
 delete from public.role_assignments where user_id=p_target;
 delete from public.audit_logs where actor_id=p_target or entity_id=any(ids) or details::text like '%'||p_target::text||'%';
 delete from public.profiles where id=p_target;
 update admin_private.account_purges set actor_id=p_actor where actor_id=p_target;
 delete from admin_private.purge_transactions where transaction_id=txid_current() and backend_id=pg_backend_pid();
 update admin_private.account_purges set phase='auth',counts=plan->'counts' where id=job.id;
 return plan->'counts';
end $$;

create function public.admin_finish_account_purge(p_actor uuid,p_target uuid,p_operation uuid) returns void
language plpgsql security definer set search_path='' as $$
declare job admin_private.account_purges; begin
 perform admin_private.require_admin_actor(p_actor);
 select * into job from admin_private.account_purges where id=p_operation and target_id=p_target and phase='auth' for update;
 if job.id is null then raise exception 'Account purge has not reached finalization'; end if;
 if exists(select 1 from auth.users where id=p_target) or exists(select 1 from public.profiles where id=p_target) then raise exception 'Authentication deletion is incomplete'; end if;
 if exists(select 1 from storage.objects o where coalesce(to_jsonb(o)->>'owner_id',to_jsonb(o)->>'owner')=p_target::text or o.name like p_target::text||'/%') then raise exception 'Storage cleanup is incomplete'; end if;
 -- A non-identifying administrative operation receipt contains no erased user
 -- ID, name, email or free-text reason. All target-linked app records are gone.
 insert into public.audit_logs(actor_id,action,entity,entity_id,details) values(p_actor,'account_purged','administrative_operation',p_operation::text,job.counts);
 delete from admin_private.account_purges where id=job.id;
end $$;

create function public.require_active_file_owner() returns trigger language plpgsql security definer set search_path='' as $$
begin if not exists(select 1 from public.profiles where id=new.owner_id and status='active') then raise exception 'File owner is inactive or being permanently deleted'; end if; return new; end $$;
create trigger active_file_owner before insert on public.files for each row execute function public.require_active_file_owner();

revoke all on all functions in schema admin_private from public,anon,authenticated,service_role;
revoke execute on function public.admin_accounts(text,text,text,integer,integer,uuid),public.admin_save_account(uuid,text,text,text,text,text,timestamptz),public.admin_account_auth_guard(uuid,text,text) from public,anon;
grant execute on function public.admin_accounts(text,text,text,integer,integer,uuid),public.admin_save_account(uuid,text,text,text,text,text,timestamptz),public.admin_account_auth_guard(uuid,text,text) to authenticated;
revoke execute on function public.admin_account_purge_plan(uuid,uuid),public.admin_begin_account_purge(uuid,uuid,text,text),public.admin_purge_account_records(uuid,uuid,uuid),public.admin_finish_account_purge(uuid,uuid,uuid),public.require_active_file_owner(),public.reject_mutation(),public.protect_ledger() from public,anon,authenticated;
grant execute on function public.admin_account_purge_plan(uuid,uuid),public.admin_begin_account_purge(uuid,uuid,text,text),public.admin_purge_account_records(uuid,uuid,uuid),public.admin_finish_account_purge(uuid,uuid,uuid) to service_role;
