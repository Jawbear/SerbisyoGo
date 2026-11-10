create function public.require_user() returns uuid language plpgsql stable security definer set search_path='' as $$ begin if not public.active_user() then raise exception 'Active authenticated account required' using errcode='42501'; end if; return auth.uid(); end $$;
create function public.require_admin() returns uuid language plpgsql stable security definer set search_path='' as $$ begin if not public.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if; return auth.uid(); end $$;
create function public.user_context() returns jsonb language sql stable security definer set search_path='' as $$ select jsonb_build_object('profile',to_jsonb(p),'role',r.role) from public.profiles p join public.role_assignments r on r.user_id=p.id where p.id=auth.uid() $$;
create function public.save_profile(p_name text,p_phone text,p_preferences jsonb default '{}') returns void language plpgsql security definer set search_path='' as $$
begin perform public.require_user();
 if length(trim(p_name)) not between 2 and 100 or p_phone !~ '^\+639[0-9]{9}$' or jsonb_typeof(p_preferences)<>'object' then raise exception 'Invalid profile'; end if;
 update public.profiles set full_name=trim(p_name),phone=p_phone,preferences=jsonb_build_object('booking_notifications',coalesce((p_preferences->>'booking_notifications')::boolean,true)) where id=auth.uid();
end $$;
create function public.check_address(p_address jsonb) returns boolean language sql immutable set search_path='' as $$ select coalesce(length(p_address->>'line1') between 5 and 250 and length(p_address->>'city') between 2 and 100 and (p_address->>'postal_code') ~ '^[0-9]{4}$' and length(p_address->>'label') between 1 and 40,false) $$;
create function public.save_booking_draft(p_id uuid,p_service uuid,p_description text,p_address jsonb,p_starts_at timestamptz default null) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid=public.require_user(); result uuid; begin
 if not public.check_address(p_address) or length(trim(p_description)) not between 10 and 3000 then raise exception 'Complete the address and task description'; end if;
 if not exists(select 1 from public.provider_services where id=p_service and active and public.approved_provider(provider_id)) then raise exception 'Service unavailable'; end if;
 if p_id is null then
 insert into public.booking_drafts(customer_id,provider_service_id,description,address,starts_at) values(uid,p_service,p_description,p_address,p_starts_at) returning id into result;
 else
 update public.booking_drafts set provider_service_id=p_service,description=p_description,address=p_address,starts_at=p_starts_at where id=p_id and customer_id=uid returning id into result;
 if result is null then raise exception 'Draft not found' using errcode='42501'; end if;
 end if; return result;
end $$;
create function public.slot_available(p_provider uuid,p_start timestamptz,p_end timestamptz,p_ignore uuid default null) returns boolean language sql stable security definer set search_path='' as $$
 select p_start>now() and p_start<p_end and p_start<now()+interval '90 days'
 and (p_start at time zone 'Asia/Manila')::date=(p_end at time zone 'Asia/Manila')::date
 and exists(select 1 from public.weekly_availability a where a.provider_id=p_provider and a.weekday=extract(dow from p_start at time zone 'Asia/Manila')::int
 and a.starts_minute<=extract(hour from p_start at time zone 'Asia/Manila')::int*60+extract(minute from p_start at time zone 'Asia/Manila')::int
 and a.ends_minute>=extract(hour from p_end at time zone 'Asia/Manila')::int*60+extract(minute from p_end at time zone 'Asia/Manila')::int)
 and not exists(select 1 from public.unavailable_periods u where u.provider_id=p_provider and tstzrange(u.starts_at,u.ends_at,'[)')&&tstzrange(p_start,p_end,'[)'))
 and not exists(select 1 from public.bookings b where b.provider_id=p_provider and (p_ignore is null or b.id<>p_ignore) and b.status in ('confirmed','en_route','in_progress','completed') and tstzrange(b.starts_at,b.ends_at,'[)')&&tstzrange(p_start,p_end,'[)'))
$$;
create function public.available_slots(p_service uuid,p_day date) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare s public.provider_services; start_time timestamptz; end_time timestamptz; result jsonb='[]'; m int; begin
 select * into s from public.provider_services where id=p_service and active;
 if s.id is null or not public.approved_provider(s.provider_id) or p_day<(now() at time zone 'Asia/Manila')::date or p_day>(now() at time zone 'Asia/Manila')::date+89 then return result; end if;
 for m in 0..47 loop
 start_time=(p_day::timestamp+make_interval(mins=>m*30)) at time zone 'Asia/Manila'; end_time=start_time+make_interval(mins=>s.duration_minutes);
 if public.slot_available(s.provider_id,start_time,end_time) then result=result||jsonb_build_array(jsonb_build_object('starts_at',start_time,'ends_at',end_time)); end if;
 end loop; return result;
end $$;
create function public.draft_price(p_draft uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare s public.provider_services; cfg public.app_settings; begin
 perform public.require_user(); select ps.* into s from public.booking_drafts d join public.provider_services ps on ps.id=d.provider_service_id where d.id=p_draft and d.customer_id=auth.uid();
 if s.id is null then raise exception 'Draft not found' using errcode='42501'; end if;
 select * into cfg from public.app_settings where active;
 if cfg.id is null or cfg.fee_centavos is null or cfg.commission_bps is null then raise exception 'Booking pricing has not been configured by an administrator'; end if;
 return jsonb_build_object('labor_centavos',s.rate_centavos,'fee_centavos',cfg.fee_centavos,'total_centavos',s.rate_centavos+cfg.fee_centavos,'is_estimate',s.pricing_mode='quote','duration_minutes',s.duration_minutes);
end $$;
create function public.confirm_booking(p_draft uuid,p_expected_total integer default null) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid=public.require_user(); d public.booking_drafts; s public.provider_services; cfg public.app_settings; bid uuid; cid uuid; finish timestamptz; begin
 select id into bid from public.bookings where customer_id=uid and idempotency_key=p_draft; if bid is not null then return bid; end if;
 select * into d from public.booking_drafts where id=p_draft and customer_id=uid for update;
 if d.id is null then raise exception 'Draft not found' using errcode='42501'; end if;
 select id into bid from public.bookings where customer_id=uid and idempotency_key=p_draft; if bid is not null then return bid; end if;
 select * into s from public.provider_services where id=d.provider_service_id and active for share;
 perform 1 from public.provider_profiles where id=s.provider_id for update;
 if s.id is null or not public.approved_provider(s.provider_id) or uid=s.provider_id then raise exception 'Provider unavailable'; end if;
 if not exists(select 1 from public.categories where id=s.category_id and active) then raise exception 'Service category unavailable'; end if;
 finish=d.starts_at+make_interval(mins=>s.duration_minutes);
 if d.starts_at is null or not public.slot_available(s.provider_id,d.starts_at,finish) then raise exception 'This time is no longer available. Choose another schedule.'; end if;
 select * into cfg from public.app_settings where active for share;
 if cfg.id is null or cfg.fee_centavos is null or cfg.commission_bps is null then raise exception 'Pricing is not configured'; end if;
 if p_expected_total is null or p_expected_total<>s.rate_centavos+cfg.fee_centavos then raise exception 'The price has changed. Review the updated breakdown before confirming.'; end if;
 insert into public.bookings(customer_id,provider_id,provider_service_id,idempotency_key,service_title,description,address_snapshot,starts_at,ends_at,labor_centavos,fee_centavos,commission_bps,commission_centavos,total_centavos,is_estimate)
 values(uid,s.provider_id,s.id,p_draft,s.title,d.description,d.address,d.starts_at,finish,s.rate_centavos,cfg.fee_centavos,cfg.commission_bps,((s.rate_centavos::bigint*cfg.commission_bps+5000)/10000)::int,s.rate_centavos+cfg.fee_centavos,s.pricing_mode='quote') returning id into bid;
 insert into public.booking_events(booking_id,actor_id,to_status) values(bid,uid,'requested');
 insert into public.conversations(booking_id) values(bid) returning id into cid;
 insert into public.conversation_members(conversation_id,user_id) values(cid,uid),(cid,s.provider_id);
 insert into public.payments(booking_id,amount_centavos) values(bid,s.rate_centavos+cfg.fee_centavos);
 insert into public.notifications(user_id,title,body,href) select s.provider_id,'New booking request',s.title,'/bookings/detail/?id='||bid from public.profiles where id=s.provider_id and coalesce((preferences->>'booking_notifications')::boolean,true);
 return bid;
end $$;
create function public.transition_booking(p_booking uuid,p_status text,p_reason text default '') returns void language plpgsql security definer set search_path='' as $$
declare uid uuid=public.require_user(); b public.bookings; allowed boolean=false; begin
 -- All acceptance/availability changes serialize on the same provider row.
 perform 1 from public.provider_profiles where id=(select provider_id from public.bookings where id=p_booking) for update;
 select * into b from public.bookings where id=p_booking for update;
 if b.id is null then raise exception 'Booking not found'; end if;
 if public.is_admin() then allowed=(b.status in ('requested','confirmed','en_route','in_progress') and p_status='cancelled') or (b.status='requested' and p_status='declined');
 elsif uid=b.provider_id and public.approved_provider(uid) then
 allowed=(b.status='requested' and p_status in ('confirmed','declined')) or (b.status='confirmed' and p_status in ('en_route','cancelled')) or (b.status='en_route' and p_status='in_progress') or (b.status='in_progress' and p_status='completed');
 elsif uid=b.customer_id then allowed=b.status in ('requested','confirmed') and p_status='cancelled';
 end if;
 if not allowed then raise exception 'Unauthorized or invalid booking transition' using errcode='42501'; end if;
 if p_status in ('cancelled','declined') and length(trim(p_reason))<5 then raise exception 'A reason of at least 5 characters is required'; end if;
 if p_status='confirmed' then
 if b.is_estimate and not b.quote_accepted then raise exception 'Customer must accept the quotation first'; end if;
 if not public.slot_available(b.provider_id,b.starts_at,b.ends_at,b.id) then raise exception 'Schedule conflict. Please arrange a new booking.'; end if;
 end if;
 update public.bookings set status=p_status where id=b.id;
 insert into public.booking_events(booking_id,actor_id,from_status,to_status,reason) values(b.id,uid,b.status,p_status,nullif(p_reason,''));
 if p_status='completed' then
 insert into public.invoices(booking_id,invoice_number,labor_centavos,fee_centavos,total_centavos) values(b.id,'INV-'||b.reference,b.labor_centavos,b.fee_centavos,b.total_centavos) on conflict(booking_id) do nothing;
 end if;
 if p_status in ('completed','cancelled','declined') then delete from public.booking_locations where booking_id=b.id; end if;
 insert into public.notifications(user_id,title,body,href) select id,'Booking updated',b.service_title||': '||replace(p_status,'_',' '),'/bookings/detail/?id='||b.id from public.profiles where id=case when uid=b.customer_id then b.provider_id else b.customer_id end and coalesce((preferences->>'booking_notifications')::boolean,true);
end $$;
create function public.booking_quote(p_booking uuid,p_labor integer,p_accept boolean default false) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid=public.require_user(); b public.bookings; begin
 select * into b from public.bookings where id=p_booking for update;
 if b.status<>'requested' or not b.is_estimate or b.id is null then raise exception 'Quotation not available'; end if;
 if p_accept and uid=b.customer_id and b.quoted_labor_centavos is not null then
 update public.bookings set labor_centavos=b.quoted_labor_centavos,total_centavos=b.quoted_labor_centavos+b.fee_centavos,commission_centavos=((b.quoted_labor_centavos::bigint*b.commission_bps+5000)/10000)::int,quote_accepted=true where id=b.id;
 update public.payments set amount_centavos=b.quoted_labor_centavos+b.fee_centavos where booking_id=b.id;
 elsif not p_accept and uid=b.provider_id and public.approved_provider(uid) and p_labor between 0 and 100000000 then
 update public.bookings set quoted_labor_centavos=p_labor,quote_accepted=false where id=b.id;
 else raise exception 'Quotation not authorized' using errcode='42501'; end if;
end $$;
create function public.update_location(p_booking uuid,p_lat double precision,p_lng double precision) returns void language plpgsql security definer set search_path='' as $$
begin perform public.require_user(); if not exists(select 1 from public.bookings where id=p_booking and provider_id=auth.uid() and status in ('en_route','in_progress') and public.approved_provider(provider_id)) then raise exception 'Active assigned job required' using errcode='42501'; end if;
 insert into public.booking_locations(booking_id,provider_id,latitude,longitude) values(p_booking,auth.uid(),p_lat,p_lng) on conflict(booking_id) do update set latitude=p_lat,longitude=p_lng,updated_at=now();
end $$;
create function public.send_message(p_conversation uuid,p_body text,p_nonce uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid=public.require_user(); mid uuid; begin if not public.conversation_member(p_conversation) then raise exception 'Conversation membership required' using errcode='42501'; end if;
 insert into public.messages(conversation_id,sender_id,body,client_nonce) values(p_conversation,uid,trim(p_body),p_nonce) on conflict(sender_id,client_nonce) do nothing returning id into mid;
 if mid is null then select id into mid from public.messages where sender_id=uid and client_nonce=p_nonce and conversation_id=p_conversation; end if;
 return mid;
end $$;
create function public.mark_read(p_conversation uuid default null) returns void language plpgsql security definer set search_path='' as $$
begin perform public.require_user(); if p_conversation is null then update public.notifications set read_at=now() where user_id=auth.uid() and read_at is null;
 else update public.conversation_members set last_read_at=now() where conversation_id=p_conversation and user_id=auth.uid(); end if; end $$;
create function public.submit_review(p_booking uuid,p_rating integer,p_body text) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid=public.require_user(); bid uuid; pid uuid; begin
 select provider_id into pid from public.bookings where id=p_booking and customer_id=uid and status='completed' for share;
 if pid is null then raise exception 'Only the customer of a completed booking may review it' using errcode='42501'; end if;
 insert into public.reviews(booking_id,customer_id,provider_id,rating,body) values(p_booking,uid,pid,p_rating,trim(p_body)) returning id into bid; return bid;
end $$;
create function public.open_case(p_booking uuid,p_subject text,p_body text) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid=public.require_user(); cid uuid; begin
 if p_booking is not null and not public.booking_member(p_booking) then raise exception 'Own booking required' using errcode='42501'; end if;
 insert into public.support_cases(owner_id,booking_id,subject,body) values(uid,p_booking,trim(p_subject),trim(p_body)) returning id into cid; return cid;
end $$;
create function public.case_reply(p_case uuid,p_body text) returns void language plpgsql security definer set search_path='' as $$
begin perform public.require_user(); if not (public.case_owner(p_case) or public.is_admin()) then raise exception 'Case access required' using errcode='42501'; end if;
 insert into public.case_messages(case_id,sender_id,body) values(p_case,auth.uid(),trim(p_body)); end $$;
create function public.request_refund(p_booking uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$
begin perform public.require_user(); if not exists(select 1 from public.bookings b join public.payments p on p.booking_id=b.id where b.id=p_booking and b.customer_id=auth.uid() and p.status='paid') then raise exception 'A paid customer booking is required' using errcode='42501'; end if;
 if exists(select 1 from public.refund_requests where booking_id=p_booking and status in ('requested','reviewing','refund_recorded')) then raise exception 'A refund request already exists'; end if;
 insert into public.refund_requests(booking_id,requested_by,reason) values(p_booking,auth.uid(),p_reason); end $$;

create function public.submit_provider(p_profile jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid=public.require_user(); aid uuid; begin
 if length(p_profile->>'display_name') not between 2 and 100 or length(p_profile->>'headline') not between 5 and 160 or length(p_profile->>'bio') not between 20 and 2000 or length(p_profile->>'city') not between 2 and 100 or jsonb_array_length(p_profile->'service_areas') not between 1 and 20 then raise exception 'Invalid provider profile'; end if;
 insert into public.provider_profiles(id,display_name,headline,bio,city,service_areas) values(uid,p_profile->>'display_name',p_profile->>'headline',p_profile->>'bio',p_profile->>'city',array(select jsonb_array_elements_text(p_profile->'service_areas'))) on conflict(id) do nothing;
 if exists(select 1 from public.provider_applications where provider_id=uid and status='pending') then raise exception 'A profile application is already awaiting review'; end if;
 insert into public.provider_applications(provider_id,proposed_profile) values(uid,jsonb_build_object('display_name',p_profile->>'display_name','headline',p_profile->>'headline','bio',p_profile->>'bio','city',p_profile->>'city','service_areas',p_profile->'service_areas')) returning id into aid;
 return aid;
end $$;
create function public.save_provider_service(p_id uuid,p_category uuid,p_title text,p_rate integer,p_duration integer,p_mode text,p_active boolean default true) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid=public.require_user(); sid uuid; begin
 if not exists(select 1 from public.provider_profiles where id=uid and status<>'suspended') then raise exception 'Provider application required'; end if;
 if not exists(select 1 from public.categories where id=p_category and active) then raise exception 'Active category required'; end if;
 if p_id is null then insert into public.provider_services(provider_id,category_id,title,rate_centavos,duration_minutes,pricing_mode,active) values(uid,p_category,trim(p_title),p_rate,p_duration,p_mode,p_active) returning id into sid;
 else update public.provider_services set category_id=p_category,title=trim(p_title),rate_centavos=p_rate,duration_minutes=p_duration,pricing_mode=p_mode,active=p_active where id=p_id and provider_id=uid returning id into sid; end if;
 if sid is null then raise exception 'Service access required' using errcode='42501'; end if; return sid;
end $$;
create function public.save_availability(p_week jsonb) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid=public.require_user(); item jsonb; begin
 perform 1 from public.provider_profiles where id=uid and status<>'suspended' for update; if not found then raise exception 'Provider application required'; end if;
 if jsonb_array_length(p_week)>28 then raise exception 'Too many availability windows'; end if;
 delete from public.weekly_availability where provider_id=uid;
 for item in select * from jsonb_array_elements(p_week) loop
 if exists(select 1 from public.weekly_availability where provider_id=uid and weekday=(item->>'weekday')::int and int4range(starts_minute,ends_minute,'[)')&&int4range((item->>'starts_minute')::int,(item->>'ends_minute')::int,'[)')) then raise exception 'Availability windows overlap'; end if;
 insert into public.weekly_availability(provider_id,weekday,starts_minute,ends_minute) values(uid,(item->>'weekday')::int,(item->>'starts_minute')::int,(item->>'ends_minute')::int);
 end loop;
end $$;
create function public.set_unavailable(p_id uuid,p_start timestamptz default null,p_end timestamptz default null,p_reason text default '') returns void language plpgsql security definer set search_path='' as $$
declare uid uuid=public.require_user(); begin
 perform 1 from public.provider_profiles where id=uid for update; if not found then raise exception 'Provider application required'; end if;
 if p_id is not null then delete from public.unavailable_periods where id=p_id and provider_id=uid;
 else
 if exists(select 1 from public.bookings where provider_id=uid and status in ('confirmed','en_route','in_progress') and tstzrange(starts_at,ends_at,'[)')&&tstzrange(p_start,p_end,'[)')) then raise exception 'This period contains an accepted booking'; end if;
 insert into public.unavailable_periods(provider_id,starts_at,ends_at,reason) values(uid,p_start,p_end,left(p_reason,300));
 end if;
end $$;
create function public.request_payout() returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid=public.require_user(); amount integer; rid uuid; begin
 perform 1 from public.provider_profiles where id=uid and status='approved' for update; if not found then raise exception 'Approved provider required'; end if;
 select coalesce(sum(held_net_centavos),0) into amount from public.commission_ledger l where provider_id=uid and held_net_centavos>0 and not exists(select 1 from public.payout_items i join public.payout_requests p on p.id=i.payout_id where i.ledger_id=l.id and p.status<>'rejected');
 if amount<=0 then raise exception 'No platform-held balance is available for payout. Cash jobs are collected directly.'; end if;
 insert into public.payout_requests(provider_id,amount_centavos) values(uid,amount) returning id into rid;
 delete from public.payout_items i using public.payout_requests p where i.payout_id=p.id and p.provider_id=uid and p.status='rejected';
 insert into public.payout_items(payout_id,ledger_id) select rid,l.id from public.commission_ledger l where provider_id=uid and held_net_centavos>0 and not exists(select 1 from public.payout_items i where i.ledger_id=l.id);
 return rid;
end $$;

create view public.public_providers with(security_invoker=true) as
 select p.*,coalesce((select round(avg(r.rating),1) from public.reviews r where r.provider_id=p.id and r.visible),0) as rating,
 (select count(*)::int from public.reviews r where r.provider_id=p.id and r.visible) as review_count,
 coalesce((select min(s.rate_centavos) from public.provider_services s where s.provider_id=p.id and s.active),0) as min_rate
 from public.provider_profiles p where public.approved_provider(p.id);
grant select on public.public_providers to anon,authenticated;

