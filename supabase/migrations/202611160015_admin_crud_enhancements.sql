-- Migration: 202611160015_admin_crud_enhancements.sql
-- Description: Enhance admin_action to support full CRUD across categories, services, announcements, providers, and cases.

create or replace function public.admin_action(
  p_entity text,
  p_id uuid,
  p_action text,
  p_data jsonb default '{}'
) returns uuid
language plpgsql security definer set search_path='' as $$
declare
  uid uuid := public.require_admin();
  result uuid := p_id;
  pid uuid;
  proposed jsonb;
  current_status text;
  reason text := trim(coalesce(p_data->>'reason',''));
begin
  if p_entity = 'provider' then
    if length(reason) < 5 then raise exception 'A review reason is required'; end if;
    if p_action in ('approve','request_changes') then
      select provider_id, proposed_profile into pid, proposed from public.provider_applications where id = p_id and status = 'pending' for update;
      if pid is null then raise exception 'Pending application not found'; end if;
      if p_action = 'approve' then
        if not exists(select 1 from public.files where owner_id = pid and kind = 'verification')
           or not exists(select 1 from public.provider_services where provider_id = pid and active)
           or not exists(select 1 from public.weekly_availability where provider_id = pid) then
          raise exception 'Verification documents, services and availability are required before approval';
        end if;
        update public.provider_profiles set
          display_name = proposed->>'display_name',
          headline = proposed->>'headline',
          bio = proposed->>'bio',
          city = proposed->>'city',
          service_areas = array(select jsonb_array_elements_text(proposed->'service_areas')),
          status = 'approved'
        where id = pid;
        update public.role_assignments set role = 'provider', granted_by = uid where user_id = pid and role <> 'admin';
      else
        update public.provider_profiles set status = case when status = 'approved' then 'approved' else 'changes_requested' end where id = pid;
      end if;
      update public.provider_applications set status = case when p_action = 'approve' then 'approved' else 'changes_requested' end, reason = reason, reviewed_by = uid, reviewed_at = now() where id = p_id;
    elsif p_action = 'suspend' then
      update public.provider_profiles set status = 'suspended' where id = p_id;
    elsif p_action = 'activate' then
      update public.provider_profiles set status = 'approved' where id = p_id;
    else
      raise exception 'Unknown provider action';
    end if;

  elsif p_entity = 'customer' then
    if p_id = uid or exists(select 1 from public.role_assignments where user_id = p_id and role = 'admin') then
      raise exception 'Admin accounts require the secure provisioning workflow';
    end if;
    if p_action not in ('restrict','activate','deactivate') or length(reason) < 5 then
      raise exception 'Valid restriction action and reason required';
    end if;
    update public.profiles set status = case p_action when 'restrict' then 'restricted' when 'deactivate' then 'deactivated' else 'active' end where id = p_id;
    insert into public.account_restrictions(user_id, actor_id, status, reason) values(p_id, uid, p_action, reason);

  elsif p_entity = 'category' then
    if p_action = 'archive' then
      update public.categories set active = false where id = p_id;
    elsif p_action = 'delete' then
      if exists(select 1 from public.bookings where category_id = p_id) then
        update public.categories set active = false where id = p_id;
      else
        delete from public.provider_services where category_id = p_id;
        delete from public.categories where id = p_id;
      end if;
    elsif p_action = 'save' then
      if p_id is null then
        insert into public.categories(slug, name, description, icon, active)
        values(
          lower(regexp_replace(coalesce(p_data->>'slug', p_data->>'name'), '[^a-z0-9]+', '-', 'g')),
          p_data->>'name',
          coalesce(p_data->>'description', ''),
          coalesce(p_data->>'icon', 'wrench'),
          coalesce((p_data->>'active')::boolean, true)
        ) returning id into result;
      else
        update public.categories set
          name = p_data->>'name',
          description = coalesce(p_data->>'description', ''),
          icon = coalesce(p_data->>'icon', icon),
          active = coalesce((p_data->>'active')::boolean, true)
        where id = p_id;
      end if;
    else
      raise exception 'Unknown category action';
    end if;

  elsif p_entity = 'service' then
    if p_action = 'archive' then
      update public.provider_services set active = false where id = p_id;
    elsif p_action = 'delete' then
      delete from public.provider_services where id = p_id;
    elsif p_action = 'save' then
      if p_id is null then
        insert into public.provider_services(
          provider_id, category_id, title, rate_centavos, duration_minutes, pricing_mode, active
        ) values (
          (p_data->>'provider_id')::uuid,
          (p_data->>'category_id')::uuid,
          p_data->>'title',
          (p_data->>'rate_centavos')::int,
          coalesce((p_data->>'duration_minutes')::int, 60),
          coalesce(p_data->>'pricing_mode', 'fixed'),
          coalesce((p_data->>'active')::boolean, true)
        ) returning id into result;
      else
        update public.provider_services set
          title = coalesce(p_data->>'title', title),
          rate_centavos = (p_data->>'rate_centavos')::int,
          duration_minutes = coalesce((p_data->>'duration_minutes')::int, duration_minutes),
          pricing_mode = coalesce(p_data->>'pricing_mode', pricing_mode),
          active = coalesce((p_data->>'active')::boolean, true)
        where id = p_id;
      end if;
    else
      raise exception 'Unknown service action';
    end if;

  elsif p_entity = 'settings' then
    if p_action not in ('draft','activate') then raise exception 'Unknown settings action'; end if;
    if p_data->>'support_email' is not null and p_data->>'support_email' !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Valid support email required'; end if;
    if p_action = 'activate' and (p_data->>'fee_centavos' is null or p_data->>'commission_bps' is null) then raise exception 'Explicit fee and commission are required'; end if;
    perform pg_advisory_xact_lock(hashtext('serbisyogo-settings'));
    if p_action = 'activate' then update public.app_settings set active = false where active; end if;
    insert into public.app_settings(fee_centavos, commission_bps, support_email, active, created_by)
    values((p_data->>'fee_centavos')::int, (p_data->>'commission_bps')::int, nullif(p_data->>'support_email', ''), p_action = 'activate', uid)
    returning id into result;

  elsif p_entity = 'announcement' then
    if p_action = 'archive' then
      update public.announcements set status = 'archived' where id = p_id;
    elsif p_action = 'delete' then
      delete from public.announcements where id = p_id;
    elsif p_action = 'save' then
      if p_data->>'status' not in ('draft','published') then raise exception 'Invalid announcement status'; end if;
      if p_data->>'status' = 'published' and p_data->>'publish_at' is null then raise exception 'Publication time is required'; end if;
      if p_id is null then
        insert into public.announcements(title, body, audience, status, publish_at, created_by)
        values(p_data->>'title', p_data->>'body', p_data->>'audience', p_data->>'status', (p_data->>'publish_at')::timestamptz, uid)
        returning id into result;
      else
        update public.announcements set
          title = p_data->>'title',
          body = p_data->>'body',
          audience = p_data->>'audience',
          status = p_data->>'status',
          publish_at = (p_data->>'publish_at')::timestamptz
        where id = p_id;
      end if;
    else
      raise exception 'Unknown announcement action';
    end if;

  elsif p_entity = 'case' then
    if p_action = 'note' then
      insert into public.case_notes(case_id, admin_id, body) values(p_id, uid, p_data->>'body');
    elsif p_action = 'reply' then
      perform public.case_reply(p_id, p_data->>'body');
    elsif p_action = 'update' then
      if p_data->>'status' in ('resolved','closed') and length(coalesce(p_data->>'resolution', '')) < 10 then
        raise exception 'A recorded resolution of at least 10 characters is required';
      end if;
      update public.support_cases set
        priority = p_data->>'priority',
        status = p_data->>'status',
        resolution = nullif(p_data->>'resolution', '')
      where id = p_id;
    else
      raise exception 'Unknown case action';
    end if;

  elsif p_entity = 'payout' then
    select status into current_status from public.payout_requests where id = p_id for update;
    if length(reason) < 5 then raise exception 'Payout review reason required'; end if;
    if p_action = 'approve' and current_status = 'requested' then
      update public.payout_requests set status = 'approved', reason = reason, reviewed_by = uid where id = p_id;
    elsif p_action = 'reject' and current_status in ('requested','approved') then
      update public.payout_requests set status = 'rejected', reason = reason, reviewed_by = uid where id = p_id;
    elsif p_action = 'record_transfer' and current_status = 'approved' and length(p_data->>'transfer_reference') >= 5 then
      update public.payout_requests set status = 'transfer_recorded', reason = reason, transfer_reference = p_data->>'transfer_reference', reviewed_by = uid where id = p_id;
    else
      raise exception 'Invalid payout transition. Approval does not transfer funds.';
    end if;
  else
    raise exception 'Unknown admin entity %', p_entity;
  end if;

  return result;
end $$;

notify pgrst, 'reload schema';
