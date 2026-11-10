-- All money is integer PHP centavos. All instants are timestamptz (UTC in API).
create extension if not exists btree_gist with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '' check(char_length(full_name)<=100),
 phone text check(phone ~ '^\+639[0-9]{9}$'), avatar_path text,
 status text not null default 'active' check(status in ('active','restricted','deactivated')),
 preferences jsonb not null default '{"booking_notifications":true}',
 consent_at timestamptz not null default now(), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.role_assignments (
 user_id uuid primary key references public.profiles(id), role text not null check(role in ('customer','provider','admin')),
 granted_by uuid references public.profiles(id), created_at timestamptz not null default now()
);
create table public.account_restrictions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id),
 actor_id uuid not null references public.profiles(id), status text not null, reason text not null check(length(reason) between 5 and 1000), created_at timestamptz not null default now()
);
create table public.addresses (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id), label text not null check(length(label) between 1 and 40),
 line1 text not null check(length(line1) between 5 and 250), city text not null check(length(city) between 2 and 100), postal_code text not null check(postal_code ~ '^[0-9]{4}$'),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.categories (
 id uuid primary key default gen_random_uuid(), slug text unique not null check(slug ~ '^[a-z0-9-]+$'), name text not null check(length(name) between 2 and 100),
 description text not null default '', icon text not null default 'wrench', active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
-- This table contains public data only. Identity documents and phone numbers are separate.
create table public.provider_profiles (
 id uuid primary key references public.profiles(id), display_name text not null, headline text not null, bio text not null,
 city text not null, avatar_path text, service_areas text[] not null default '{}',
 status text not null default 'pending' check(status in ('pending','changes_requested','approved','suspended')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(length(display_name) between 2 and 100),check(length(headline) between 5 and 160),check(length(bio) between 20 and 2000)
);
create table public.provider_applications (
 id uuid primary key default gen_random_uuid(), provider_id uuid not null references public.provider_profiles(id), proposed_profile jsonb not null,
 status text not null default 'pending' check(status in ('pending','changes_requested','approved','rejected')),
 reason text, reviewed_by uuid references public.profiles(id), reviewed_at timestamptz, created_at timestamptz not null default now()
);
create unique index one_pending_application on public.provider_applications(provider_id) where status='pending';
create table public.provider_services (
 id uuid primary key default gen_random_uuid(), provider_id uuid not null references public.provider_profiles(id), category_id uuid not null references public.categories(id),
 title text not null check(length(title) between 3 and 120), rate_centavos integer not null check(rate_centavos between 0 and 100000000),
 duration_minutes integer not null check(duration_minutes between 30 and 480), pricing_mode text not null check(pricing_mode in ('fixed','quote')), active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.weekly_availability (
 id uuid primary key default gen_random_uuid(), provider_id uuid not null references public.provider_profiles(id), weekday integer not null check(weekday between 0 and 6),
 starts_minute integer not null check(starts_minute between 0 and 1439), ends_minute integer not null check(ends_minute between 1 and 1440),
 unique(provider_id,weekday,starts_minute),check(starts_minute<ends_minute),created_at timestamptz not null default now()
);
create table public.unavailable_periods (
 id uuid primary key default gen_random_uuid(), provider_id uuid not null references public.provider_profiles(id), starts_at timestamptz not null, ends_at timestamptz not null,
 reason text, check(starts_at<ends_at), created_at timestamptz not null default now()
);
create table public.booking_drafts (
 id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.profiles(id), provider_service_id uuid not null references public.provider_services(id),
 description text not null check(length(description) between 10 and 3000), address jsonb not null, starts_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.bookings (
 id uuid primary key default gen_random_uuid(), reference text unique not null default ('SG-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),
 customer_id uuid not null references public.profiles(id), provider_id uuid not null references public.provider_profiles(id), provider_service_id uuid not null references public.provider_services(id),
 idempotency_key uuid not null, service_title text not null, description text not null, address_snapshot jsonb not null,
 starts_at timestamptz not null, ends_at timestamptz not null,
 status text not null default 'requested' check(status in ('requested','confirmed','en_route','in_progress','completed','declined','cancelled')),
 labor_centavos integer not null check(labor_centavos>=0), fee_centavos integer not null check(fee_centavos>=0), commission_bps integer not null check(commission_bps between 0 and 10000),
 commission_centavos integer not null check(commission_centavos>=0), total_centavos integer not null check(total_centavos=labor_centavos+fee_centavos),
 is_estimate boolean not null, quote_accepted boolean not null default false, quoted_labor_centavos integer check(quoted_labor_centavos between 0 and 100000000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(customer_id,idempotency_key),
 check(customer_id<>provider_id),check(starts_at<ends_at),
 exclude using gist(provider_id with =, tstzrange(starts_at,ends_at,'[)') with &&) where (status in ('confirmed','en_route','in_progress','completed'))
);
create table public.booking_events (
 id uuid primary key default gen_random_uuid(), booking_id uuid not null references public.bookings(id), actor_id uuid not null references public.profiles(id),
 from_status text, to_status text not null, reason text, created_at timestamptz not null default now()
);
create table public.booking_locations (
 booking_id uuid primary key references public.bookings(id), provider_id uuid not null references public.provider_profiles(id),
 latitude double precision not null check(latitude between -90 and 90), longitude double precision not null check(longitude between -180 and 180), updated_at timestamptz not null default now()
);
create table public.conversations (
 id uuid primary key default gen_random_uuid(), booking_id uuid unique not null references public.bookings(id), created_at timestamptz not null default now()
);
create table public.conversation_members (
 conversation_id uuid not null references public.conversations(id), user_id uuid not null references public.profiles(id), last_read_at timestamptz not null default now(),
 primary key(conversation_id,user_id), created_at timestamptz not null default now()
);
create table public.messages (
 id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversations(id), sender_id uuid not null references public.profiles(id),
 body text not null check(length(trim(body)) between 1 and 4000), client_nonce uuid not null,
 created_at timestamptz not null default now(), unique(sender_id,client_nonce)
);
create table public.payments (
 id uuid primary key default gen_random_uuid(), booking_id uuid unique not null references public.bookings(id),
 method text not null default 'cash' check(method in ('cash','manual_platform')),
 status text not null default 'pending' check(status in ('pending','paid','failed','refunded')),
 amount_centavos integer not null check(amount_centavos>=0), settled_by uuid references public.profiles(id), settled_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.payment_events (
 id uuid primary key default gen_random_uuid(), payment_id uuid not null references public.payments(id), event_key uuid not null unique,
 status text not null check(status in ('paid','failed','refunded')), source text not null check(source in ('authorized_manual','verified_gateway')),
 actor_id uuid references public.profiles(id), reason text not null, created_at timestamptz not null default now()
);
create table public.invoices (
 id uuid primary key default gen_random_uuid(), booking_id uuid unique not null references public.bookings(id), invoice_number text unique not null,
 labor_centavos integer not null, fee_centavos integer not null, total_centavos integer not null check(total_centavos=labor_centavos+fee_centavos),
 issued_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create table public.commission_ledger (
 id uuid primary key default gen_random_uuid(), booking_id uuid unique not null references public.bookings(id), provider_id uuid not null references public.provider_profiles(id),
 labor_centavos integer not null, commission_centavos integer not null, platform_fee_centavos integer not null,
 held_net_centavos integer not null default 0, cash_commission_due_centavos integer not null default 0,
 created_at timestamptz not null default now()
);
create table public.payout_requests (
 id uuid primary key default gen_random_uuid(), provider_id uuid not null references public.provider_profiles(id), amount_centavos integer not null check(amount_centavos>0),
 status text not null default 'requested' check(status in ('requested','approved','rejected','transfer_recorded')), reason text, transfer_reference text,
 reviewed_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.payout_items (
 payout_id uuid not null references public.payout_requests(id), ledger_id uuid not null unique references public.commission_ledger(id), primary key(payout_id,ledger_id)
);
create table public.refund_requests (
 id uuid primary key default gen_random_uuid(), booking_id uuid not null references public.bookings(id), requested_by uuid not null references public.profiles(id),
 reason text not null check(length(reason) between 5 and 2000), status text not null default 'requested' check(status in ('requested','reviewing','rejected','refund_recorded')),
 resolution text, created_at timestamptz not null default now()
);
create table public.reviews (
 id uuid primary key default gen_random_uuid(), booking_id uuid unique not null references public.bookings(id), customer_id uuid not null references public.profiles(id),
 provider_id uuid not null references public.provider_profiles(id), rating integer not null check(rating between 1 and 5), body text not null check(length(body) between 10 and 2000),
 visible boolean not null default true, created_at timestamptz not null default now()
);
create table public.support_cases (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id), booking_id uuid references public.bookings(id),
 subject text not null check(length(subject) between 5 and 160), body text not null check(length(body) between 10 and 5000),
 priority text not null default 'normal' check(priority in ('low','normal','high','urgent')), status text not null default 'open' check(status in ('open','reviewing','resolved','closed')),
 resolution text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.case_messages (
 id uuid primary key default gen_random_uuid(), case_id uuid not null references public.support_cases(id), sender_id uuid not null references public.profiles(id),
 body text not null check(length(body) between 1 and 5000), created_at timestamptz not null default now()
);
create table public.case_notes (
 id uuid primary key default gen_random_uuid(), case_id uuid not null references public.support_cases(id), admin_id uuid not null references public.profiles(id),
 body text not null check(length(body) between 1 and 5000), created_at timestamptz not null default now()
);
-- File metadata is registered only by the verified-upload Edge Function.
create table public.files (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id),
 kind text not null check(kind in ('verification','booking','support','avatar')), bucket text not null, path text unique not null,
 booking_id uuid references public.bookings(id), case_id uuid references public.support_cases(id),
 original_name text not null, mime_type text not null, byte_size integer not null check(byte_size between 1 and 10485760),
 created_at timestamptz not null default now(),
 check((kind='booking' and booking_id is not null) or (kind='support' and case_id is not null) or kind in ('verification','avatar'))
);
create table public.announcements (
 id uuid primary key default gen_random_uuid(), title text not null check(length(title) between 3 and 160), body text not null check(length(body) between 5 and 5000),
 audience text not null check(audience in ('everyone','customers','providers')), status text not null default 'draft' check(status in ('draft','published','archived')),
 publish_at timestamptz, created_by uuid not null references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.notifications (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id), title text not null, body text not null, href text not null,
 read_at timestamptz, created_at timestamptz not null default now()
);
-- Versioned settings: no pricing policy is silently invented in production.
create table public.app_settings (
 id uuid primary key default gen_random_uuid(), version integer generated always as identity unique,
 fee_centavos integer check(fee_centavos between 0 and 100000000), commission_bps integer check(commission_bps between 0 and 10000),
 support_email text, active boolean not null default false, created_by uuid references public.profiles(id), created_at timestamptz not null default now()
);
create unique index one_active_settings on public.app_settings(active) where active;
create table public.audit_logs (
 id uuid primary key default gen_random_uuid(), actor_id uuid references public.profiles(id), action text not null, entity text not null, entity_id text,
 details jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.app_releases (
 id uuid primary key default gen_random_uuid(), version_name text not null check(version_name ~ '^[0-9]+\.[0-9]+\.[0-9]+([-+][a-zA-Z0-9.-]+)?$'), version_code integer unique not null check(version_code>0),
 artifact_path text unique not null, byte_size bigint check(byte_size>0), sha256 text check(sha256 ~ '^[a-f0-9]{64}$'),
 min_android text not null check(min_android ~ '^[0-9]+(\.[0-9]+)?$'), release_notes text not null check(length(release_notes) between 10 and 10000),
 status text not null default 'draft' check(status in ('draft','published','archived')), created_by uuid not null references public.profiles(id),
 verified_at timestamptz, published_at timestamptz, created_at timestamptz not null default now(),
 check(status<>'published' or (byte_size is not null and sha256 is not null and verified_at is not null and published_at is not null))
);

create index profiles_status_idx on public.profiles(status);
create index addresses_owner_idx on public.addresses(user_id);
create index providers_public_idx on public.provider_profiles(status,city);
create index services_provider_idx on public.provider_services(provider_id,active);
create index services_category_idx on public.provider_services(category_id,active);
create index applications_status_idx on public.provider_applications(status,created_at);
create index availability_provider_idx on public.weekly_availability(provider_id,weekday);
create index unavailable_provider_idx on public.unavailable_periods(provider_id,starts_at);
create index drafts_customer_idx on public.booking_drafts(customer_id);
create index bookings_customer_idx on public.bookings(customer_id,created_at desc);
create index bookings_provider_idx on public.bookings(provider_id,starts_at);
create index bookings_status_idx on public.bookings(status,created_at desc);
create index events_booking_idx on public.booking_events(booking_id,created_at);
create index members_user_idx on public.conversation_members(user_id);
create index messages_conversation_idx on public.messages(conversation_id,created_at);
create index reviews_provider_idx on public.reviews(provider_id,visible);
create index cases_owner_idx on public.support_cases(owner_id,created_at desc);
create index cases_status_idx on public.support_cases(status,priority);
create index notes_case_idx on public.case_notes(case_id);
create index case_messages_case_idx on public.case_messages(case_id,created_at);
create index files_owner_idx on public.files(owner_id,kind);
create index files_booking_idx on public.files(booking_id);
create index files_case_idx on public.files(case_id);
create index payments_status_idx on public.payments(status,created_at);
create index ledger_provider_idx on public.commission_ledger(provider_id);
create index payouts_provider_idx on public.payout_requests(provider_id,status);
create index notifications_owner_idx on public.notifications(user_id,created_at desc);
create index audit_created_idx on public.audit_logs(created_at desc);
create index releases_public_idx on public.app_releases(status,version_code desc);

create function public.touch_updated_at() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now(); return new; end $$;
do $$ declare t text; begin foreach t in array array['profiles','addresses','categories','provider_profiles','provider_services','booking_drafts','bookings','payments','support_cases','announcements','payout_requests'] loop
 execute format('create trigger touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()',t);
end loop; end $$;
create function public.new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,full_name) values(new.id,left(coalesce(new.raw_user_meta_data->>'full_name',''),100));
 insert into public.role_assignments(user_id,role) values(new.id,'customer');
 return new;
end $$;
create trigger auth_user_created after insert on auth.users for each row execute function public.new_user();
