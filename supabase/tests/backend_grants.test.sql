begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
select ok(bool_and(has_table_privilege('service_role', format('public.%I', tablename), privilege)),
 'trusted backend has explicit CRUD privileges on application tables')
from pg_tables cross join unnest(array['SELECT','INSERT','UPDATE','DELETE']) as p(privilege)
where schemaname='public' and tablename in (
 'profiles','role_assignments','account_restrictions','addresses','categories',
 'provider_profiles','provider_applications','provider_services','weekly_availability',
 'unavailable_periods','booking_drafts','bookings','booking_events','booking_locations',
 'conversations','conversation_members','messages','payments','payment_events',
 'invoices','commission_ledger','payout_requests','payout_items','refund_requests',
 'reviews','support_cases','case_messages','case_notes','files','announcements',
 'notifications','app_settings','audit_logs','app_releases');
select ok(has_sequence_privilege('service_role','public.app_settings_version_seq','USAGE'),
 'trusted backend can create a versioned settings record');
select ok(has_function_privilege('service_role','public.create_release_draft(text,integer,text,text)','EXECUTE'),
 'trusted release backend has explicit RPC execution permission');
select ok(not has_table_privilege('authenticated','public.role_assignments','UPDATE'),
 'signed-in browser cannot assign roles');
select ok(not has_table_privilege('anon','public.role_assignments','SELECT'),
 'anonymous browser cannot inspect protected roles');
select ok(not has_table_privilege('authenticated','public.app_releases','INSERT'),
 'signed-in browser cannot bypass trusted release workflows');
select ok(not has_function_privilege('anon','public.create_release_draft(text,integer,text,text)','EXECUTE'),
 'anonymous browser cannot execute privileged release RPC');
select * from finish();
rollback;
