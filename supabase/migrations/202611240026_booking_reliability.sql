-- Express the entire appointment in Manila local time. A 1440-minute
-- closing time is midnight at the end of the provider's working day.
create or replace function public.slot_available(
  p_provider uuid, p_start timestamptz, p_end timestamptz, p_ignore uuid default null
) returns boolean language sql stable security definer set search_path = '' as $$
  with local_slot as (
    select p_start at time zone 'Asia/Manila' as starts_local,
           p_end at time zone 'Asia/Manila' as ends_local
  )
  select case when p_start is null or p_end is null or p_start >= p_end then false
  else p_start > now() and p_start < now() + interval '90 days'
    and exists (
      select 1 from public.weekly_availability a cross join local_slot s
      where a.provider_id = p_provider
        and a.weekday = extract(dow from s.starts_local)::integer
        and s.starts_local >= s.starts_local::date + make_interval(mins => a.starts_minute)
        and s.ends_local <= s.starts_local::date + make_interval(mins => a.ends_minute)
    )
    and not exists (
      select 1 from public.unavailable_periods u where u.provider_id = p_provider
        and tstzrange(u.starts_at, u.ends_at, '[)') && tstzrange(p_start, p_end, '[)')
    )
    and not exists (
      select 1 from public.bookings b where b.provider_id = p_provider
        and (p_ignore is null or b.id <> p_ignore)
        and b.status in ('confirmed', 'en_route', 'in_progress', 'completed')
        and tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(p_start, p_end, '[)')
    ) end
$$;

-- An acknowledgement belongs to one specific message. Match the submitted
-- payload on retries so a client cannot mistake a collision for delivery.
create or replace function public.send_message(p_conversation uuid, p_body text, p_nonce uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public.require_user();
  message_id uuid;
begin
  if not public.conversation_member(p_conversation) then
    raise exception 'Conversation membership required' using errcode = '42501';
  end if;
  insert into public.messages(conversation_id, sender_id, body, client_nonce)
  values (p_conversation, uid, trim(p_body), p_nonce)
  on conflict(sender_id, client_nonce) do nothing returning id into message_id;
  if message_id is null then
    select id into message_id from public.messages
    where sender_id = uid and client_nonce = p_nonce
      and conversation_id = p_conversation and body = trim(p_body);
    if not found then
      raise exception 'This message identifier already belongs to a different message.' using errcode = '22023';
    end if;
  end if;
  return message_id;
end $$;

create or replace function public.transition_booking(p_booking uuid, p_status text, p_reason text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public.require_user();
  b public.bookings;
  allowed boolean := false;
  reason text := nullif(trim(p_reason), '');
begin
  perform 1 from public.provider_profiles
  where id = (select provider_id from public.bookings where id = p_booking) for update;
  select * into b from public.bookings where id = p_booking for update;
  if not found then raise exception 'Booking not found'; end if;
  if public.is_admin() then
    allowed := (b.status in ('requested','confirmed','en_route','in_progress') and p_status = 'cancelled')
               or (b.status = 'requested' and p_status = 'declined');
  elsif uid = b.provider_id and public.approved_provider(uid) then
    allowed := (b.status = 'requested' and p_status in ('confirmed','declined'))
               or (b.status = 'confirmed' and p_status in ('en_route','cancelled'))
               or (b.status = 'en_route' and p_status = 'in_progress')
               or (b.status = 'in_progress' and p_status = 'completed');
  elsif uid = b.customer_id then
    allowed := b.status in ('requested','confirmed') and p_status = 'cancelled';
  end if;
  if allowed is not true then
    raise exception 'Unauthorized or invalid booking transition' using errcode = '42501';
  end if;
  if p_status in ('cancelled','declined') and coalesce(length(reason), 0) < 5 then
    raise exception 'A reason of at least 5 characters is required';
  end if;
  if p_status = 'confirmed' then
    if b.is_estimate and not b.quote_accepted then raise exception 'Customer must accept the quotation first'; end if;
    if not public.slot_available(b.provider_id, b.starts_at, b.ends_at, b.id) then
      raise exception 'Schedule conflict. Please arrange a new booking.';
    end if;
  end if;
  update public.bookings set status = p_status where id = b.id;
  insert into public.booking_events(booking_id,actor_id,from_status,to_status,reason)
  values (b.id,uid,b.status,p_status,reason);
  if p_status = 'completed' then
    insert into public.invoices(booking_id,invoice_number,labor_centavos,fee_centavos,total_centavos)
    values (b.id,'INV-'||b.reference,b.labor_centavos,b.fee_centavos,b.total_centavos)
    on conflict(booking_id) do nothing;
  end if;
  if p_status in ('completed','cancelled','declined') then
    delete from public.booking_locations where booking_id = b.id;
  end if;
  insert into public.notifications(user_id,title,body,href)
  select id, 'Booking updated', b.service_title || ': ' || replace(p_status,'_',' '), '/bookings/detail/?id=' || b.id
  from public.profiles
  where id in (b.customer_id, b.provider_id) and id <> uid
    and coalesce((preferences->>'booking_notifications')::boolean, true);
end $$;
