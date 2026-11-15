-- Personal-wallet GCash transfers: receipt submission is NOT proof of payment.
-- Only an administrator who independently checks the wallet can settle it.
create table public.gcash_settings (
 id boolean primary key default true check(id),
 recipient_name text not null check(length(trim(recipient_name)) between 2 and 100),
 recipient_phone text not null check(recipient_phone ~ '^09[0-9]{9}$'),
 instructions text not null default '' check(length(instructions)<=1000),
 enabled boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.gcash_settings enable row level security;
revoke all on public.gcash_settings from anon,authenticated;
grant select on public.gcash_settings to authenticated;
grant all on public.gcash_settings to service_role;
create policy gcash_settings_read on public.gcash_settings for select to authenticated using(public.active_user() and (enabled or public.is_admin()));

alter table public.payments drop constraint payments_method_check;
alter table public.payments add constraint payments_method_check check(method in ('cash','manual_platform','gcash'));
alter table public.files drop constraint files_kind_check;
alter table public.files add constraint files_kind_check check(kind in ('verification','booking','support','avatar','payment'));
alter table public.files drop constraint files_scope_check;
alter table public.files add constraint files_scope_check check((kind in ('booking','payment') and (booking_id is not null or (kind='booking' and draft_id is not null))) or (kind='support' and case_id is not null) or kind in ('verification','avatar'));

create table public.gcash_submissions (
 id uuid primary key default gen_random_uuid(),
 payment_id uuid not null references public.payments(id) on delete cascade,
 customer_id uuid not null references public.profiles(id) on delete cascade,
 receipt_id uuid not null unique references public.files(id) on delete cascade,
 reference text not null check(reference ~ '^[0-9]{10,20}$'),
 amount_centavos integer not null check(amount_centavos>0),
 recipient_name text not null, recipient_phone text not null,
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 reason text, reviewed_by uuid references public.profiles(id) on delete set null,
 reviewed_at timestamptz, created_at timestamptz not null default now()
);
create unique index gcash_one_pending on public.gcash_submissions(payment_id) where status='pending';
create unique index gcash_active_reference on public.gcash_submissions(reference) where status<>'rejected';
alter table public.gcash_submissions enable row level security;
revoke all on public.gcash_submissions from anon,authenticated;
grant select on public.gcash_submissions to authenticated;
grant all on public.gcash_submissions to service_role;
create policy gcash_submission_read on public.gcash_submissions for select to authenticated using(public.is_admin() or (customer_id=auth.uid() and public.active_user()));

create function public.save_gcash_settings(p_name text,p_phone text,p_instructions text,p_enabled boolean) returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid=public.require_admin(); begin
 if p_name is null or p_phone is null or p_enabled is null then raise exception 'Recipient details are required'; end if;
 insert into public.gcash_settings(id,recipient_name,recipient_phone,instructions,enabled)
 values(true,trim(p_name),trim(p_phone),coalesce(trim(p_instructions),''),p_enabled)
 on conflict(id) do update set recipient_name=excluded.recipient_name,recipient_phone=excluded.recipient_phone,instructions=excluded.instructions,enabled=excluded.enabled,updated_at=now();
 insert into public.audit_logs(actor_id,action,entity,details) values(uid,'configure','gcash_settings',jsonb_build_object('enabled',p_enabled));
end $$;

create function public.submit_gcash_receipt(p_booking uuid,p_reference text,p_receipt uuid,p_expected_amount integer,p_recipient_phone text) returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid=public.require_user(); p public.payments; b public.bookings; cfg public.gcash_settings; sid uuid; ref text=trim(p_reference); begin
 select * into p from public.payments where booking_id=p_booking for update;
 select * into b from public.bookings where id=p_booking for update;
 if b.id is null or b.customer_id<>uid then raise exception 'Own booking required' using errcode='42501'; end if;
 select id into sid from public.gcash_submissions where payment_id=p.id and reference=ref and receipt_id=p_receipt and customer_id=uid and status<>'rejected';
 if sid is not null then return sid; end if;
 if b.status<>'completed' or p.status<>'pending' then raise exception 'Payment requires a completed service with a pending payment'; end if;
 select * into cfg from public.gcash_settings where enabled for share;
 if cfg.id is null then raise exception 'GCash payments are not enabled'; end if;
 if p_expected_amount is distinct from p.amount_centavos or p_recipient_phone is distinct from cfg.recipient_phone then raise exception 'Payment details changed. Refresh and check the recipient and amount before submitting'; end if;
 if ref is null or ref !~ '^[0-9]{10,20}$' then raise exception 'Enter the 10–20 digit GCash transaction reference'; end if;
 if not exists(select 1 from public.files where id=p_receipt and owner_id=uid and booking_id=b.id and kind='payment') then raise exception 'Upload your GCash receipt for this booking first'; end if;
 if exists(select 1 from public.gcash_submissions where receipt_id=p_receipt) then raise exception 'Choose a new receipt image after rejection'; end if;
 if exists(select 1 from public.gcash_submissions where payment_id=p.id and status='pending') then raise exception 'Your receipt is already awaiting review'; end if;
 insert into public.gcash_submissions(payment_id,customer_id,receipt_id,reference,amount_centavos,recipient_name,recipient_phone)
 values(p.id,uid,p_receipt,ref,p.amount_centavos,cfg.recipient_name,cfg.recipient_phone) returning id into sid;
 update public.payments set method='gcash' where id=p.id;
 insert into public.notifications(user_id,title,body,href) select r.user_id,'GCash receipt awaiting review',b.reference,'/admin/transactions/?id='||p.id from public.role_assignments r join public.profiles u on u.id=r.user_id where r.role='admin' and u.status='active';
 return sid;
end $$;

create function public.review_gcash_receipt(p_submission uuid,p_approve boolean,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid=public.require_admin(); s public.gcash_submissions; p public.payments; begin
 if p_approve is null or p_reason is null or length(trim(p_reason)) not between 10 and 2000 then raise exception 'Record at least 10 characters explaining your wallet verification'; end if;
 select * into p from public.payments where id=(select payment_id from public.gcash_submissions where id=p_submission) for update;
 select * into s from public.gcash_submissions where id=p_submission for update;
 if s.id is null then raise exception 'Receipt not found'; end if;
 if (s.status='approved' and p_approve) or (s.status='rejected' and not p_approve) then return; end if;
 if s.status<>'pending' or p.status<>'pending' then raise exception 'Receipt or payment has already been reviewed'; end if;
 if s.amount_centavos<>p.amount_centavos then raise exception 'Receipt amount does not match payment'; end if;
 update public.gcash_submissions set status=case when p_approve then 'approved' else 'rejected' end,reason=trim(p_reason),reviewed_by=uid,reviewed_at=now() where id=s.id;
 if p_approve then
   perform public.settle_payment(p.id,s.id,'paid','manual_platform','GCash '||s.reference||': '||trim(p_reason));
   update public.payments set method='gcash' where id=p.id;
 end if;
 insert into public.audit_logs(actor_id,action,entity,entity_id,details) values(uid,case when p_approve then 'approve' else 'reject' end,'gcash_payment',p.id::text,jsonb_build_object('reason',trim(p_reason)));
 insert into public.notifications(user_id,title,body,href) values(s.customer_id,case when p_approve then 'GCash payment verified' else 'GCash receipt needs attention' end,trim(p_reason),'/bookings/detail/?id='||p.booking_id);
end $$;

-- Prevent the generic cash settlement form from bypassing receipt review.
create function public.guard_gcash_settlement() returns trigger language plpgsql set search_path='' as $$
begin
 if old.status='pending' and new.status='paid' and (old.method='gcash' or exists(select 1 from public.gcash_submissions where payment_id=old.id and status='pending'))
 and not exists(select 1 from public.gcash_submissions where payment_id=old.id and status='approved') then raise exception 'Review and verify the GCash receipt before recording payment'; end if;
 return new;
end $$;
create trigger guard_gcash_settlement before update on public.payments for each row execute function public.guard_gcash_settlement();
revoke execute on function public.guard_gcash_settlement() from public,anon,authenticated;
revoke execute on function public.save_gcash_settings(text,text,text,boolean),public.submit_gcash_receipt(uuid,text,uuid,integer,text),public.review_gcash_receipt(uuid,boolean,text) from public,anon;
grant execute on function public.save_gcash_settings(text,text,text,boolean),public.submit_gcash_receipt(uuid,text,uuid,integer,text),public.review_gcash_receipt(uuid,boolean,text) to authenticated,service_role;
notify pgrst,'reload schema';
