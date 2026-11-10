create function public.admin_action(p_entity text,p_id uuid,p_action text,p_data jsonb default '{}') returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid=public.require_admin(); result uuid=p_id; pid uuid; proposed jsonb; current_status text; reason text=trim(coalesce(p_data->>'reason','')); begin
 if p_entity='provider' then
 if length(reason)<5 then raise exception 'A review reason is required'; end if;
 if p_action in ('approve','request_changes') then
 select provider_id,proposed_profile into pid,proposed from public.provider_applications where id=p_id and status='pending' for update;
 if pid is null then raise exception 'Pending application not found'; end if;
 if p_action='approve' then
 if not exists(select 1 from public.files where owner_id=pid and kind='verification') or not exists(select 1 from public.provider_services where provider_id=pid and active) or not exists(select 1 from public.weekly_availability where provider_id=pid) then raise exception 'Verification documents, services and availability are required before approval'; end if;
 update public.provider_profiles set display_name=proposed->>'display_name',headline=proposed->>'headline',bio=proposed->>'bio',city=proposed->>'city',service_areas=array(select jsonb_array_elements_text(proposed->'service_areas')),status='approved' where id=pid;
 update public.role_assignments set role='provider',granted_by=uid where user_id=pid and role<>'admin';
 else update public.provider_profiles set status=case when status='approved' then 'approved' else 'changes_requested' end where id=pid;
 end if;
 update public.provider_applications set status=case when p_action='approve' then 'approved' else 'changes_requested' end,reason=reason,reviewed_by=uid,reviewed_at=now() where id=p_id;
 elsif p_action='suspend' then update public.provider_profiles set status='suspended' where id=p_id;
 else raise exception 'Unknown provider action'; end if;
 elsif p_entity='customer' then
 if p_id=uid or exists(select 1 from public.role_assignments where user_id=p_id and role='admin') then raise exception 'Admin accounts require the secure provisioning workflow'; end if;
 if p_action not in ('restrict','activate','deactivate') or length(reason)<5 then raise exception 'Valid restriction action and reason required'; end if;
 update public.profiles set status=case p_action when 'restrict' then 'restricted' when 'deactivate' then 'deactivated' else 'active' end where id=p_id;
 insert into public.account_restrictions(user_id,actor_id,status,reason) values(p_id,uid,p_action,reason);
 elsif p_entity='category' then
 if p_action='archive' then update public.categories set active=false where id=p_id;
 elsif p_action='save' then
 if p_id is null then insert into public.categories(slug,name,description,icon,active) values(p_data->>'slug',p_data->>'name',coalesce(p_data->>'description',''),coalesce(p_data->>'icon','wrench'),coalesce((p_data->>'active')::boolean,true)) returning id into result;
 else update public.categories set name=p_data->>'name',description=coalesce(p_data->>'description',''),active=coalesce((p_data->>'active')::boolean,true) where id=p_id; end if;
 else raise exception 'Unknown category action'; end if;
 elsif p_entity='service' then
 if p_action='archive' then update public.provider_services set active=false where id=p_id;
 elsif p_action='save' then update public.provider_services set rate_centavos=(p_data->>'rate_centavos')::int,duration_minutes=(p_data->>'duration_minutes')::int,pricing_mode=p_data->>'pricing_mode',active=coalesce((p_data->>'active')::boolean,true) where id=p_id;
 else raise exception 'Unknown service action'; end if;
 elsif p_entity='settings' then
 if p_action not in ('draft','activate') then raise exception 'Unknown settings action'; end if;
 if p_data->>'support_email' is not null and p_data->>'support_email' !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Valid support email required'; end if;
 if p_action='activate' and (p_data->>'fee_centavos' is null or p_data->>'commission_bps' is null) then raise exception 'Explicit fee and commission are required'; end if;
 perform pg_advisory_xact_lock(hashtext('serbisyogo-settings'));
 if p_action='activate' then update public.app_settings set active=false where active; end if;
 insert into public.app_settings(fee_centavos,commission_bps,support_email,active,created_by) values((p_data->>'fee_centavos')::int,(p_data->>'commission_bps')::int,nullif(p_data->>'support_email',''),p_action='activate',uid) returning id into result;
 elsif p_entity='announcement' then
 if p_action='archive' then update public.announcements set status='archived' where id=p_id;
 elsif p_action='save' then
 if p_data->>'status' not in ('draft','published') then raise exception 'Invalid announcement status'; end if;
 if p_data->>'status'='published' and p_data->>'publish_at' is null then raise exception 'Publication time is required'; end if;
 if p_id is null then insert into public.announcements(title,body,audience,status,publish_at,created_by) values(p_data->>'title',p_data->>'body',p_data->>'audience',p_data->>'status',(p_data->>'publish_at')::timestamptz,uid) returning id into result;
 else update public.announcements set title=p_data->>'title',body=p_data->>'body',audience=p_data->>'audience',status=p_data->>'status',publish_at=(p_data->>'publish_at')::timestamptz where id=p_id; end if;
 else raise exception 'Unknown announcement action'; end if;
 elsif p_entity='case' then
 if p_action='note' then insert into public.case_notes(case_id,admin_id,body) values(p_id,uid,p_data->>'body');
 elsif p_action='reply' then perform public.case_reply(p_id,p_data->>'body');
 elsif p_action='update' then
 if p_data->>'status' in ('resolved','closed') and length(coalesce(p_data->>'resolution',''))<10 then raise exception 'A recorded resolution of at least 10 characters is required'; end if;
 update public.support_cases set priority=p_data->>'priority',status=p_data->>'status',resolution=nullif(p_data->>'resolution','') where id=p_id;
 else raise exception 'Unknown case action'; end if;
 elsif p_entity='payout' then
 select status into current_status from public.payout_requests where id=p_id for update;
 if length(reason)<5 then raise exception 'Payout review reason required'; end if;
 if p_action='approve' and current_status='requested' then update public.payout_requests set status='approved',reason=reason,reviewed_by=uid where id=p_id;
 elsif p_action='reject' and current_status in ('requested','approved') then update public.payout_requests set status='rejected',reason=reason,reviewed_by=uid where id=p_id;
 elsif p_action='record_transfer' and current_status='approved' and length(p_data->>'transfer_reference')>=5 then update public.payout_requests set status='transfer_recorded',reason=reason,transfer_reference=p_data->>'transfer_reference',reviewed_by=uid where id=p_id;
 else raise exception 'Invalid payout transition. Approval does not transfer funds.'; end if;
 elsif p_entity='refund' then
 if p_action not in ('reviewing','rejected') or length(reason)<5 then raise exception 'A valid review and reason are required. Record actual refunds through payment settlement.'; end if;
 update public.refund_requests set status=p_action,resolution=reason where id=p_id and status in ('requested','reviewing');
 elsif p_entity='booking' then perform public.transition_booking(p_id,p_action,reason);
 else raise exception 'Unknown administrative operation'; end if;
 insert into public.audit_logs(actor_id,action,entity,entity_id,details) values(uid,p_action,p_entity,result::text,jsonb_strip_nulls(jsonb_build_object('reason',nullif(reason,''))));
 return result;
end $$;

create function public.settle_payment(p_payment uuid,p_event uuid,p_status text,p_method text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid=public.require_admin(); p public.payments; b public.bookings; begin
 if exists(select 1 from public.payment_events where event_key=p_event) then
 if exists(select 1 from public.payment_events where event_key=p_event and payment_id=p_payment and status=p_status) then return; else raise exception 'Event key reused for another event'; end if; end if;
 if length(trim(p_reason))<10 then raise exception 'A verifiable settlement reference and explanation are required'; end if;
 select * into p from public.payments where id=p_payment for update;
 if exists(select 1 from public.payment_events where event_key=p_event and payment_id=p_payment and status=p_status) then return; end if;
 select * into b from public.bookings where id=p.booking_id for update;
 if p.id is null or p_method not in ('cash','manual_platform') then raise exception 'Invalid payment or method'; end if;
 if p_status='paid' and p.status='pending' and b.status='completed' then
 update public.payments set status='paid',method=p_method,settled_by=uid,settled_at=now() where id=p.id;
 insert into public.commission_ledger(booking_id,provider_id,labor_centavos,commission_centavos,platform_fee_centavos,held_net_centavos,cash_commission_due_centavos)
 values(b.id,b.provider_id,b.labor_centavos,b.commission_centavos,b.fee_centavos,case when p_method='manual_platform' then b.labor_centavos-b.commission_centavos else 0 end,case when p_method='cash' then b.commission_centavos+b.fee_centavos else 0 end);
 elsif p_status='refunded' and p.status='paid' then
 if exists(select 1 from public.payout_items i join public.commission_ledger l on l.id=i.ledger_id join public.payout_requests pr on pr.id=i.payout_id where l.booking_id=b.id and pr.status<>'rejected') then raise exception 'Resolve the allocated payout before recording this refund'; end if;
 if not exists(select 1 from public.refund_requests where booking_id=b.id and status in ('requested','reviewing')) then raise exception 'A reviewed refund request is required'; end if;
 update public.payments set status='refunded',settled_by=uid where id=p.id;
 update public.refund_requests set status='refund_recorded',resolution=p_reason where booking_id=b.id and status in ('requested','reviewing');
 update public.commission_ledger set reversed_at=now() where booking_id=b.id and reversed_at is null;
 else raise exception 'Invalid settlement transition. Only completed jobs can be manually settled.'; end if;
 insert into public.payment_events(payment_id,event_key,status,source,actor_id,reason) values(p.id,p_event,p_status,'authorized_manual',uid,p_reason);
end $$;

create function public.create_release_draft(p_version_name text,p_version_code integer,p_min_android text,p_notes text) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid=public.require_admin(); r public.app_releases; rid uuid=gen_random_uuid(); begin
 insert into public.app_releases(id,version_name,version_code,artifact_path,min_android,release_notes,created_by)
 values(rid,p_version_name,p_version_code,p_version_code||'/'||rid||'/serbisyogo.apk',p_min_android,p_notes,uid) returning * into r; return to_jsonb(r);
end $$;
create function public.publish_release(p_release uuid,p_archive boolean default false) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid=public.require_admin(); r public.app_releases; begin
 perform pg_advisory_xact_lock(hashtext('serbisyogo-release'));
 select * into r from public.app_releases where id=p_release for update;
 if r.id is null then raise exception 'Release not found'; end if;
 if p_archive then update public.app_releases set status='archived' where id=r.id; return; end if;
 if r.status<>'draft' or r.verified_at is null or r.sha256 is null or r.byte_size is null then raise exception 'A verified draft artifact is required'; end if;
 if not exists(select 1 from storage.objects where bucket_id='android-releases' and name=r.artifact_path and (metadata->>'size')::bigint=r.byte_size) then raise exception 'Artifact missing or size mismatch'; end if;
 if exists(select 1 from public.app_releases where status='published' and version_code>=r.version_code) then raise exception 'The version code must exceed all published releases'; end if;
 update public.app_releases set status='published',published_at=now() where id=r.id;
end $$;

create function public.admin_report(p_from timestamptz,p_to timestamptz) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin perform public.require_admin(); if p_from>=p_to or p_to-p_from>interval '731 days' then raise exception 'Choose a valid date range of at most two years'; end if;
 return jsonb_build_object(
 'customers',(select count(*) from public.profiles p join public.role_assignments r on r.user_id=p.id where r.role='customer' and p.status='active' and p.created_at>=p_from and p.created_at<p_to),
 'providers',(select count(*) from public.provider_profiles where public.approved_provider(id)),
 'bookings',(select count(*) from public.bookings where created_at>=p_from and created_at<p_to),
 'platform_fees_centavos',(select coalesce(sum(l.commission_centavos+l.platform_fee_centavos),0) from public.commission_ledger l where l.reversed_at is null and l.created_at>=p_from and l.created_at<p_to),
 'paid_volume_centavos',(select coalesce(sum(amount_centavos),0) from public.payments where status='paid' and settled_at>=p_from and settled_at<p_to),
 'pending_providers',(select count(*) from public.provider_applications where status='pending'),
 'open_cases',(select count(*) from public.support_cases where status in ('open','reviewing')),
 'requested_payouts',(select count(*) from public.payout_requests where status='requested'),
 'daily',(select coalesce(jsonb_agg(v order by v.day),'[]') from (select (created_at at time zone 'Asia/Manila')::date as day,count(*) as bookings,count(*) filter(where status='completed') as completed from public.bookings where created_at>=p_from and created_at<p_to group by 1) v),
 'status',(select coalesce(jsonb_agg(v),'[]') from (select status,count(*) as count from public.bookings where created_at>=p_from and created_at<p_to group by status) v)
 ); end $$;

-- Explicit RPC allowlist. Internal helper/trigger functions are not callable through the API.
revoke execute on all functions in schema public from public,anon,authenticated;
grant execute on function public.active_user(),public.is_admin(),public.approved_provider(uuid),public.booking_member(uuid),public.conversation_member(uuid),public.case_owner(uuid),public.file_allowed(uuid) to authenticated;
grant execute on function public.active_user(),public.approved_provider(uuid),public.available_slots(uuid,date) to anon,authenticated;
grant execute on function public.user_context(),public.save_profile(text,text,jsonb),public.save_booking_draft(uuid,uuid,text,jsonb,timestamptz),public.draft_price(uuid),public.confirm_booking(uuid,integer),public.transition_booking(uuid,text,text),public.booking_quote(uuid,integer,boolean),public.update_location(uuid,double precision,double precision),public.send_message(uuid,text,uuid),public.mark_read(uuid),public.submit_review(uuid,integer,text),public.open_case(uuid,text,text),public.case_reply(uuid,text),public.request_refund(uuid,text),public.submit_provider(jsonb),public.save_provider_service(uuid,uuid,text,integer,integer,text,boolean),public.save_availability(jsonb),public.set_unavailable(uuid,timestamptz,timestamptz,text),public.request_payout(),public.admin_action(text,uuid,text,jsonb),public.settle_payment(uuid,uuid,text,text,text),public.create_release_draft(text,integer,text,text),public.publish_release(uuid,boolean),public.admin_report(timestamptz,timestamptz) to authenticated;
-- Security definer internals call each other as the function owner, never with client-granted execution.


