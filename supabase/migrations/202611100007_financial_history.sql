alter table public.commission_ledger add column reversed_at timestamptz;
drop trigger ledger_no_update on public.commission_ledger;
-- Original amounts are immutable; trusted refund processing may only mark a reversal.
create function public.protect_ledger() returns trigger language plpgsql set search_path='' as $$
begin if TG_OP='DELETE' then raise exception 'Financial ledger records are retained';end if;
if (to_jsonb(new)-'reversed_at')<>(to_jsonb(old)-'reversed_at') or old.reversed_at is not null then raise exception 'Only the first reversal marker can be recorded';end if;return new;end $$;
create trigger ledger_immutable before update or delete on public.commission_ledger for each row execute function public.protect_ledger();
revoke execute on function public.protect_ledger() from public,anon,authenticated;
create or replace function public.request_payout() returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid=public.require_user(); amount integer; rid uuid; begin
perform 1 from public.provider_profiles where id=uid and status='approved' for update;if not found then raise exception 'Approved provider required';end if;
select coalesce(sum(held_net_centavos),0) into amount from public.commission_ledger l where provider_id=uid and reversed_at is null and held_net_centavos>0 and not exists(select 1 from public.payout_items i join public.payout_requests p on p.id=i.payout_id where i.ledger_id=l.id and p.status<>'rejected');
if amount<=0 then raise exception 'No platform-held balance is available for payout. Cash jobs are collected directly.';end if;
insert into public.payout_requests(provider_id,amount_centavos) values(uid,amount) returning id into rid;
delete from public.payout_items i using public.payout_requests p where i.payout_id=p.id and p.provider_id=uid and p.status='rejected';
insert into public.payout_items(payout_id,ledger_id) select rid,l.id from public.commission_ledger l where provider_id=uid and reversed_at is null and held_net_centavos>0 and not exists(select 1 from public.payout_items i where i.ledger_id=l.id);
return rid;end $$;
