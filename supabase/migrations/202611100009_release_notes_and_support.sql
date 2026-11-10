create function public.update_release_notes(p_release uuid,p_notes text) returns void language plpgsql security definer set search_path='' as $$
begin perform public.require_admin();if length(p_notes) not between 10 and 10000 then raise exception 'Release notes must contain 10 to 10000 characters';end if;
update public.app_releases set release_notes=p_notes where id=p_release and status='draft';if not found then raise exception 'Only draft release notes can be edited';end if;end $$;
revoke execute on function public.update_release_notes(uuid,text) from public,anon;
grant execute on function public.update_release_notes(uuid,text) to authenticated;
create function public.public_settings() returns jsonb language sql stable security definer set search_path='' as $$ select jsonb_build_object('support_email',support_email) from public.app_settings where active $$;
revoke execute on function public.public_settings() from public;
grant execute on function public.public_settings() to anon,authenticated;
alter table public.categories add constraint category_description_length check(length(description)<=1000);
alter table public.support_cases add constraint resolution_length check(length(resolution)<=5000);
