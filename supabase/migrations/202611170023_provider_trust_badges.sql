-- Public badges describe explicit administrator reviews, never just uploads.
create table public.provider_credential_reviews (
 provider_id uuid not null references public.provider_profiles(id) on delete cascade,
 kind text not null check(kind in ('identity','skills')),
 file_id uuid not null references public.files(id) on delete cascade,
 reviewed_by uuid references public.profiles(id) on delete set null,
 reviewed_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 reason text not null check(length(reason) between 5 and 1000),
 primary key(provider_id,kind)
);
alter table public.provider_credential_reviews enable row level security;
revoke all on public.provider_credential_reviews from public,anon,authenticated,service_role;
grant select on public.provider_credential_reviews to authenticated,service_role;
create policy credential_review_read on public.provider_credential_reviews for select to authenticated
 using(public.is_admin() or (public.active_user() and provider_id=auth.uid()));

create function public.review_provider_credential(p_provider uuid,p_file uuid,p_kind text,p_verified boolean,p_reason text)
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=public.require_admin(); doc public.files;
begin
 if p_kind is null or p_kind not in ('identity','skills') or p_verified is null
  or p_reason is null or length(btrim(p_reason)) not between 5 and 1000 then
  raise exception 'Choose a badge, decision and review reason';
 end if;
 perform 1 from public.provider_profiles where id=p_provider for update;
 if not found then raise exception 'Provider not found'; end if;
 if p_verified then
  select * into doc from public.files where id=p_file and owner_id=p_provider
   and kind='verification' and bucket='private-files' and byte_size>0 for update;
  if not found then raise exception 'Choose this provider''s private verification document'; end if;
  if p_kind='identity' and doc.verification_category is distinct from 'gov_id' then
   raise exception 'Identity review requires a government ID';
  end if;
  if p_kind='skills' and (doc.verification_category is null or doc.verification_category not in
   ('tesda_nc1','tesda_nc2','tesda_coc','prc_license','training_cert','employment_proof')) then
   raise exception 'Skills review requires a trade or professional credential';
  end if;
  insert into public.provider_credential_reviews(provider_id,kind,file_id,reviewed_by,reason)
   values(p_provider,p_kind,p_file,actor,btrim(p_reason))
   on conflict(provider_id,kind) do update set file_id=excluded.file_id,reviewed_by=actor,
    reason=excluded.reason,reviewed_at=now();
 else
  delete from public.provider_credential_reviews where provider_id=p_provider and kind=p_kind;
 end if;
 insert into public.audit_logs(actor_id,action,entity,entity_id,details)
 values(actor,case when p_verified then 'credential_badge_granted' else 'credential_badge_revoked' end,
 'provider',p_provider::text,jsonb_build_object('kind',p_kind,'file_id',p_file,'reason',btrim(p_reason)));
end $$;
revoke all on function public.review_provider_credential(uuid,uuid,text,boolean,text) from public,anon;
grant execute on function public.review_provider_credential(uuid,uuid,text,boolean,text) to authenticated;

create function public.invalidate_credential_review() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if (new.owner_id,new.kind,new.bucket,new.path,new.verification_category,new.byte_size,new.mime_type)
  is distinct from (old.owner_id,old.kind,old.bucket,old.path,old.verification_category,old.byte_size,old.mime_type) then
  delete from public.provider_credential_reviews where file_id=old.id;
 end if;
 return new;
end $$;
revoke all on function public.invalidate_credential_review() from public,anon,authenticated;
create trigger credential_review_invalidation after update on public.files
 for each row execute function public.invalidate_credential_review();

create function public.provider_trust_badges(p_provider uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
 'identity_reviewed',public.approved_provider(p_provider) and exists(
  select 1 from public.provider_credential_reviews r join public.files f on f.id=r.file_id
  where r.provider_id=p_provider and r.kind='identity' and f.owner_id=p_provider and f.verification_category='gov_id'),
 'skills_reviewed',public.approved_provider(p_provider) and exists(
  select 1 from public.provider_credential_reviews r where r.provider_id=p_provider and r.kind='skills'),
 'skills_label',case when public.approved_provider(p_provider) then (
  select case f.verification_category
   when 'tesda_nc1' then 'TESDA NC I reviewed' when 'tesda_nc2' then 'TESDA NC II reviewed'
   when 'tesda_coc' then 'TESDA COC reviewed' when 'prc_license' then 'PRC credential reviewed'
   when 'training_cert' then 'Training credential reviewed' when 'employment_proof' then 'Employment proof reviewed' end
  from public.provider_credential_reviews r join public.files f on f.id=r.file_id
  where r.provider_id=p_provider and r.kind='skills') else null end)
$$;
revoke all on function public.provider_trust_badges(uuid) from public;
grant execute on function public.provider_trust_badges(uuid) to anon,authenticated,service_role;

create or replace view public.public_providers with(security_invoker=true) as
 select p.*,coalesce((select round(avg(r.rating),1) from public.reviews r where r.provider_id=p.id and r.visible),0) as rating,
 (select count(*)::int from public.reviews r where r.provider_id=p.id and r.visible) as review_count,
 coalesce((select min(s.rate_centavos) from public.provider_services s where s.provider_id=p.id and s.active),0) as min_rate,
 public.provider_trust_badges(p.id) as trust_badges
 from public.provider_profiles p where public.approved_provider(p.id);
notify pgrst,'reload schema';
