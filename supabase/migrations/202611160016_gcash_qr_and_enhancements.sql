-- Migration: 202611160016_gcash_qr_and_enhancements.sql
-- Description: Add QR code support to GCash settings and seed initial test configuration if empty

alter table public.gcash_settings add column if not exists qr_code_url text;

-- Update save_gcash_settings to support an optional QR code URL/path
create or replace function public.save_gcash_settings(
  p_name text,
  p_phone text,
  p_instructions text,
  p_enabled boolean,
  p_qr_url text default null
) returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid=public.require_admin(); begin
  if p_name is null or p_phone is null or p_enabled is null then raise exception 'Recipient details are required'; end if;
  insert into public.gcash_settings(id, recipient_name, recipient_phone, instructions, enabled, qr_code_url)
  values(true, trim(p_name), trim(p_phone), coalesce(trim(p_instructions), ''), p_enabled, nullif(trim(p_qr_url), ''))
  on conflict(id) do update set
    recipient_name=excluded.recipient_name,
    recipient_phone=excluded.recipient_phone,
    instructions=excluded.instructions,
    enabled=excluded.enabled,
    qr_code_url=excluded.qr_code_url,
    updated_at=now();
  insert into public.audit_logs(actor_id, action, entity, details)
  values(uid, 'configure', 'gcash_settings', jsonb_build_object('enabled', p_enabled, 'has_qr', p_qr_url is not null and trim(p_qr_url) <> ''));
end $$;

grant execute on function public.save_gcash_settings(text, text, text, boolean, text) to authenticated, service_role;

-- Ensure default active GCash configuration exists so payments are functional out-of-the-box
insert into public.gcash_settings (id, recipient_name, recipient_phone, instructions, enabled, qr_code_url)
values (
  true,
  'SerbisyoGo Payments',
  '09171234567',
  'Scan QR using the GCash app or send via Express Send to 09171234567. After sending, enter your 10–20 digit reference number and upload the receipt screenshot.',
  true,
  null
)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
