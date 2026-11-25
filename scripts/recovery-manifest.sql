-- Run with psql -XAtq. Output contains table names, counts and aggregate hashes.
-- Supply -v upgrade=yes only for comparing historical columns across 023 to 025.
\set ON_ERROR_STOP on
\if :{?upgrade}
\else
  \set upgrade no
\endif
begin transaction isolation level repeatable read read only;
set local time zone 'UTC';
set local datestyle = 'ISO, YMD';
set local intervalstyle = 'iso_8601';
set local extra_float_digits = 3;

select format($query$
  select %L, count(*), encode(sha256(convert_to(
    coalesce(string_agg(row_hash, '' order by row_hash collate "C"), ''), 'UTF8')), 'hex')
  from (
    select encode(sha256(convert_to((%s)::text, 'UTF8')), 'hex') as row_hash
    from %I.%I row_data
  ) hashed
$query$, schemaname || '.' || tablename,
  case when :'upgrade'::boolean and schemaname = 'public' and tablename = 'provider_profiles'
       then 'to_jsonb(row_data) - ''service_latitude'' - ''service_longitude'''
       else 'to_jsonb(row_data)' end, schemaname, tablename)
from pg_catalog.pg_tables
where schemaname = 'public'
   or (not :'upgrade'::boolean and schemaname in ('admin_private', 'supabase_migrations', 'auth'))
   or (schemaname = 'auth' and tablename in ('users', 'identities'))
   or (schemaname = 'storage' and tablename in ('buckets', 'objects'))
order by schemaname collate "C", tablename collate "C"
\gexec

select 'payment_total_centavos', coalesce(sum(amount_centavos), 0) from public.payments;
select 'booking_total_centavos', coalesce(sum(total_centavos), 0) from public.bookings;
select 'messages_without_sender_membership', count(*)
from public.messages m left join public.conversation_members cm
  on (cm.conversation_id, cm.user_id) = (m.conversation_id, m.sender_id)
where cm.user_id is null;
commit;
