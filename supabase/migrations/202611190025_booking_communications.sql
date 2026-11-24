-- A customer accepts exactly the labor amount displayed on their device.
create function public.accept_booking_quote(p_booking uuid, p_expected_labor integer)
returns void language plpgsql security definer set search_path = '' as $$
declare
  customer uuid := public.require_user();
  quoted integer;
begin
  select quoted_labor_centavos into quoted from public.bookings
  where id = p_booking and customer_id = customer for update;
  if not found then raise exception 'Booking unavailable' using errcode = '42501'; end if;
  if quoted is null or quoted is distinct from p_expected_labor then
    raise exception 'The quotation changed. Refresh the booking and review the latest price.';
  end if;
  perform public.booking_quote(p_booking, p_expected_labor, true);
end $$;
revoke all on function public.accept_booking_quote(uuid, integer) from public, anon;
grant execute on function public.accept_booking_quote(uuid, integer) to authenticated;

create index if not exists messages_conversation_recent_idx
on public.messages(conversation_id, created_at desc, id desc);

create view public.conversation_inbox with (security_invoker = true) as
select c.id, c.booking_id, b.reference, b.service_title,
  coalesce((select max(m.created_at) from public.messages m where m.conversation_id = c.id), c.created_at) as last_activity,
  (select count(*) from public.messages m where m.conversation_id = c.id
   and m.sender_id <> cm.user_id and m.created_at > cm.last_read_at) as unread
from public.conversation_members cm
join public.conversations c on c.id = cm.conversation_id
join public.bookings b on b.id = c.booking_id
where cm.user_id = (select auth.uid());
-- Clear explicit grants from the project's default ACL before granting read access.
revoke all on public.conversation_inbox from public, anon, authenticated;
grant select on public.conversation_inbox to authenticated;

-- Advance the cursor only through a message the participant actually loaded.
create function public.read_through_message(p_message uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.require_user();
begin
  update public.conversation_members cm
  set last_read_at = greatest(cm.last_read_at, m.created_at)
  from public.messages m where m.id = p_message
    and cm.conversation_id = m.conversation_id and cm.user_id = uid;
  if not found then raise exception 'Message unavailable' using errcode = '42501'; end if;
end $$;
revoke all on function public.read_through_message(uuid) from public, anon;
grant execute on function public.read_through_message(uuid) to authenticated;

create function public.notify_message_recipient() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (user_id, title, body, href)
  select cm.user_id, 'New booking message', b.service_title,
         '/messages/?booking=' || c.booking_id
  from public.conversation_members cm
  join public.conversations c on cm.conversation_id = c.id
  join public.bookings b on b.id = c.booking_id
  join public.profiles p on cm.user_id = p.id
  where cm.conversation_id = new.conversation_id and cm.user_id <> new.sender_id
    and coalesce((p.preferences->>'booking_notifications')::boolean, true);
  return new;
end $$;
revoke all on function public.notify_message_recipient() from public, anon, authenticated;
create trigger notify_new_message after insert on public.messages
for each row execute function public.notify_message_recipient();

alter publication supabase_realtime add table public.payments, public.gcash_submissions;
