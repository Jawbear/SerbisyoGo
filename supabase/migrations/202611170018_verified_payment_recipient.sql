-- Require an administrator to verify the wallet before accepting transfers.
-- Existing wallets deliberately start disabled after this upgrade. No identity
-- or historical payment/receipt is changed; the operator must reverify settings.
alter table public.gcash_settings
 add column recipient_verified_at timestamptz,
 add column recipient_verified_by uuid references public.profiles(id) on delete set null;
update public.gcash_settings set enabled=false, updated_at=now();
alter table public.gcash_settings add constraint gcash_enabled_verified
 check(not enabled or recipient_verified_at is not null);

create function public.save_gcash_settings(
 p_name text,p_phone text,p_instructions text,p_enabled boolean,
 p_qr_url text,p_recipient_verified boolean
) returns void language plpgsql security definer set search_path='' as $$
declare
 uid uuid := public.require_admin();
 current_config public.gcash_settings;
 wallet_changed boolean;
 verified_at timestamptz;
 verified_by uuid;
begin
 if p_name is null or p_phone is null or p_enabled is null then
  raise exception 'Recipient details are required';
 end if;
 perform pg_advisory_xact_lock(hashtext('serbisyogo-gcash-settings'));
 select * into current_config from public.gcash_settings where id=true for update;
 wallet_changed := current_config.id is null or
  row(current_config.recipient_name,current_config.recipient_phone,current_config.qr_code_url)
   is distinct from row(btrim(p_name),btrim(p_phone),nullif(btrim(p_qr_url),''));
 verified_at := case when wallet_changed then null else current_config.recipient_verified_at end;
 verified_by := case when wallet_changed then null else current_config.recipient_verified_by end;
 if p_recipient_verified is true then
  verified_at := now(); verified_by := uid;
 end if;
 if p_enabled and verified_at is null then
  raise exception 'Verify the recipient name, mobile number and any supplied QR in your GCash app before enabling payments';
 end if;
 insert into public.gcash_settings(id,recipient_name,recipient_phone,instructions,enabled,qr_code_url,recipient_verified_at,recipient_verified_by)
 values(true,btrim(p_name),btrim(p_phone),coalesce(btrim(p_instructions),''),p_enabled,nullif(btrim(p_qr_url),''),verified_at,verified_by)
 on conflict(id) do update set recipient_name=excluded.recipient_name,
  recipient_phone=excluded.recipient_phone,instructions=excluded.instructions,
  enabled=excluded.enabled,qr_code_url=excluded.qr_code_url,
  recipient_verified_at=excluded.recipient_verified_at,
  recipient_verified_by=excluded.recipient_verified_by,updated_at=now();
 insert into public.audit_logs(actor_id,action,entity,details)
 values(uid,'configure','gcash_settings',jsonb_build_object(
  'enabled',p_enabled,'recipient_changed',wallet_changed,
  'recipient_verified',p_recipient_verified is true,'has_qr',nullif(btrim(p_qr_url),'') is not null));
end $$;

-- Retain old clients without letting either old RPC bypass verification.
create or replace function public.save_gcash_settings(p_name text,p_phone text,p_instructions text,p_enabled boolean)
 returns void language sql security definer set search_path='' as $$
 select public.save_gcash_settings(p_name,p_phone,p_instructions,p_enabled,null,false)
$$;
-- Remove the historical fifth-argument default so four-argument calls are unambiguous.
drop function public.save_gcash_settings(text,text,text,boolean,text);
create function public.save_gcash_settings(p_name text,p_phone text,p_instructions text,p_enabled boolean,p_qr_url text)
 returns void language sql security definer set search_path='' as $$
 select public.save_gcash_settings(p_name,p_phone,p_instructions,p_enabled,p_qr_url,false)
$$;
revoke execute on function public.save_gcash_settings(text,text,text,boolean),
 public.save_gcash_settings(text,text,text,boolean,text),
 public.save_gcash_settings(text,text,text,boolean,text,boolean) from public,anon;
grant execute on function public.save_gcash_settings(text,text,text,boolean),
 public.save_gcash_settings(text,text,text,boolean,text),
 public.save_gcash_settings(text,text,text,boolean,text,boolean) to authenticated,service_role;

notify pgrst, 'reload schema';
