-- The original RPC remains available to earlier clients. Check the amount
-- under the booking lock for every acceptance path before updating payment.
create or replace function public.booking_quote(p_booking uuid, p_labor integer, p_accept boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := public.require_user();
  booking public.bookings;
begin
  select * into booking from public.bookings where id = p_booking for update;
  if not found or booking.status <> 'requested' or not booking.is_estimate then
    raise exception 'Quotation not available';
  end if;
  if p_accept and actor = booking.customer_id then
    if booking.quoted_labor_centavos is null or p_labor is distinct from booking.quoted_labor_centavos then
      raise exception 'The quotation changed. Refresh the booking and review the latest price.';
    end if;
    update public.bookings set labor_centavos = p_labor,
      total_centavos = p_labor + booking.fee_centavos,
      commission_centavos = ((p_labor::bigint * booking.commission_bps + 5000) / 10000)::integer,
      quote_accepted = true where id = booking.id;
    update public.payments set amount_centavos = p_labor + booking.fee_centavos where booking_id = booking.id;
  elsif not p_accept and actor = booking.provider_id and public.approved_provider(actor)
        and p_labor between 0 and 100000000 then
    update public.bookings set quoted_labor_centavos = p_labor, quote_accepted = false where id = booking.id;
  else
    raise exception 'Quotation not authorized' using errcode = '42501';
  end if;
end $$;

-- Hold the booking lock through the location write. A transition to a
-- terminal state takes the same lock before clearing the last position.
create or replace function public.update_location(p_booking uuid, p_lat double precision, p_lng double precision)
returns void language plpgsql security definer set search_path = '' as $$
declare
  provider uuid := public.require_user();
begin
  perform 1 from public.bookings
  where id = p_booking and provider_id = provider and status in ('en_route','in_progress')
    and public.approved_provider(provider)
  for update;
  if not found then
    raise exception 'Active assigned job required' using errcode = '42501';
  end if;
  insert into public.booking_locations(booking_id,provider_id,latitude,longitude)
  values (p_booking,provider,p_lat,p_lng)
  on conflict (booking_id) do update set latitude = excluded.latitude, longitude = excluded.longitude, updated_at = now();
end $$;
