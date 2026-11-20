-- A provider can publish a service-area landmark independently of their private
-- booking tracking location. Existing profiles start with no public pin.
alter table public.provider_profiles
  add column service_latitude double precision,
  add column service_longitude double precision,
  add constraint public_service_point_valid check (
    (service_latitude is null and service_longitude is null) or
    (service_latitude is not null and service_longitude is not null
     and service_latitude between -85 and 85 and service_longitude between -180 and 180)
  );

create function public.set_service_area_pin(p_latitude double precision, p_longitude double precision)
returns void language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := public.require_user();
begin
  update public.provider_profiles
     set service_latitude = round(p_latitude::numeric, 3),
         service_longitude = round(p_longitude::numeric, 3)
   where id = owner_id;
  if not found then raise exception 'Create a provider profile first'; end if;
end;
$$;
revoke all on function public.set_service_area_pin(double precision,double precision) from public, anon;
grant execute on function public.set_service_area_pin(double precision,double precision) to authenticated;

-- The development seeder marks QA identities in trusted Auth app metadata.
-- Keep private test histories intact and omit them from public endorsements.
create function public.marketplace_account(p_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select not exists(select 1 from auth.users u where u.id = p_id
    and u.raw_app_meta_data->>'development_fixture' = 'serbisyogo-development-v1');
$$;
revoke all on function public.marketplace_account(uuid) from public;
grant execute on function public.marketplace_account(uuid) to anon, authenticated, service_role;

alter policy provider_public on public.provider_profiles
using(public.approved_provider(id) and public.marketplace_account(id));
alter policy service_public on public.provider_services
using(active and public.approved_provider(provider_id) and public.marketplace_account(provider_id)
  and exists(select 1 from public.categories c where c.id=category_id and c.active));
alter policy reviews_public on public.reviews
using(visible and public.approved_provider(provider_id)
  and public.marketplace_account(provider_id) and public.marketplace_account(customer_id));

create or replace view public.public_providers with(security_invoker=true) as
select p.id,p.display_name,p.headline,p.bio,p.city,p.avatar_path,p.service_areas,p.status,p.created_at,p.updated_at,
  coalesce((select round(avg(r.rating),1) from public.reviews r where r.provider_id=p.id and r.visible and public.marketplace_account(r.customer_id)),0) as rating,
  (select count(*)::int from public.reviews r where r.provider_id=p.id and r.visible and public.marketplace_account(r.customer_id)) as review_count,
  (select min(s.rate_centavos) from public.provider_services s join public.categories c on c.id=s.category_id
    where s.provider_id=p.id and s.active and c.active) as min_rate,
  public.provider_trust_badges(p.id) as trust_badges, p.service_latitude,p.service_longitude
from public.provider_profiles p where public.approved_provider(p.id) and public.marketplace_account(p.id);

create function public.discovery_available_services(p_day date,p_services uuid[])
returns jsonb language sql stable security invoker set search_path='' as $$
  select coalesce(jsonb_agg(s.id),'[]'::jsonb)
  from public.provider_services s join public.categories c on c.id=s.category_id and c.active
  where s.active and s.id=any(p_services) and cardinality(p_services)<=50
    and public.approved_provider(s.provider_id) and public.marketplace_account(s.provider_id)
    and jsonb_array_length(public.available_slots(s.id,p_day))>0;
$$;
revoke all on function public.discovery_available_services(date,uuid[]) from public;
grant execute on function public.discovery_available_services(date,uuid[]) to anon,authenticated;
notify pgrst,'reload schema';
