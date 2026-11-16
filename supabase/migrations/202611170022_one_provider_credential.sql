-- One accepted ID or credential is sufficient for administrative review.
-- Portfolio photos are optional supporting material, not an identity document.
create or replace function public.enforce_provider_credentials() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.status='approved' then
  if not exists(select 1 from public.files where owner_id=new.id
   and kind='verification' and bucket='private-files' and byte_size>0
   and verification_category in ('gov_id','tesda_nc2','tesda_nc1','tesda_coc',
    'prc_license','clearance','training_cert','employment_proof','business_permit')) then
   raise exception 'At least one accepted ID or credential is required before provider approval or reactivation';
  end if;
  if not exists(select 1 from public.provider_services where provider_id=new.id and active)
   or not exists(select 1 from public.weekly_availability where provider_id=new.id) then
   raise exception 'Active services and availability are required before provider approval or reactivation';
  end if;
 end if;
 return new;
end $$;
notify pgrst, 'reload schema';
