-- A category describes what the applicant submitted, not a finding that the
-- document is authentic. Administrators must still inspect every credential.
alter table public.files add column verification_category text;
alter table public.files add constraint files_verification_category check(
 verification_category is null or (kind='verification' and verification_category in (
 'gov_id','tesda_nc2','tesda_nc1','tesda_coc','prc_license','clearance',
 'training_cert','employment_proof','business_permit','other_proof')));

-- Do not classify historical uploads by their filenames. They stay readable,
-- but applicants must resubmit them with an explicit category before approval.
create function public.enforce_provider_credentials() returns trigger
language plpgsql security definer set search_path='' as $$
declare has_id boolean; has_profession boolean; has_clearance boolean;
begin
 if new.status='approved' then
  select coalesce(bool_or(verification_category='gov_id'),false),
   coalesce(bool_or(verification_category in ('tesda_nc2','tesda_nc1','tesda_coc','prc_license','training_cert','employment_proof','other_proof')),false),
   coalesce(bool_or(verification_category='clearance'),false)
   into has_id,has_profession,has_clearance
  from public.files where owner_id=new.id and kind='verification' and bucket='private-files' and byte_size>0;
  if not (has_id and has_profession and has_clearance) then
   raise exception 'Government ID, proof of profession and clearance are required before provider approval or reactivation';
  end if;
  if not exists(select 1 from public.provider_services where provider_id=new.id and active)
   or not exists(select 1 from public.weekly_availability where provider_id=new.id) then
   raise exception 'Active services and availability are required before provider approval or reactivation';
  end if;
 end if;
 return new;
end $$;
revoke execute on function public.enforce_provider_credentials() from public,anon,authenticated;
-- All browser/provider writes to provider_profiles are already prohibited.
-- The trigger covers admin_action approve AND activate, including assigning
-- approved to an already-approved profile during a subsequent application review.
create trigger provider_credentials_required before update of status on public.provider_profiles
 for each row execute function public.enforce_provider_credentials();

notify pgrst, 'reload schema';
