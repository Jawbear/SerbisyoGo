-- RLS bypass does not supply SQL object privileges. Explicitly authorize the
-- server-only role instead of relying on hosted-project default grants.
grant usage on schema public to service_role;
grant select, insert, update, delete on table
 public.profiles, public.role_assignments, public.account_restrictions,
 public.addresses, public.categories, public.provider_profiles,
 public.provider_applications, public.provider_services,
 public.weekly_availability, public.unavailable_periods,
 public.booking_drafts, public.bookings, public.booking_events,
 public.booking_locations, public.conversations, public.conversation_members,
 public.messages, public.payments, public.payment_events, public.invoices,
 public.commission_ledger, public.payout_requests, public.payout_items,
 public.refund_requests, public.reviews, public.support_cases,
 public.case_messages, public.case_notes, public.files,
 public.announcements, public.notifications, public.app_settings,
 public.audit_logs, public.app_releases
to service_role;
grant usage, select on sequence public.app_settings_version_seq to service_role;
-- Trusted backend calls still validate the user before using elevated access.
grant execute on all functions in schema public to service_role;
-- No anon/authenticated grants or RLS policies are broadened by this migration.
-- Append-only triggers continue to reject forbidden updates/deletes.
notify pgrst, 'reload schema';
