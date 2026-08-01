alter table public.customers
add column user_id uuid unique references auth.users(id) on delete set null;

create index customers_user_id_idx on public.customers (user_id);

drop policy if exists "Users read their own customer" on public.customers;
create policy "Users read their own customer"
on public.customers for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users read their own subscriptions" on public.subscriptions;
create policy "Users read their own subscriptions"
on public.subscriptions for select to authenticated
using (
  exists (
    select 1 from public.customers
    where customers.customer_id = subscriptions.customer_id
      and customers.user_id = (select auth.uid())
  )
);

create or replace function public.sync_subscription_entitlement(
  p_user_id uuid,
  p_subscription_id text,
  p_plan text,
  p_status text,
  p_period_key text,
  p_trial_ends_at timestamptz default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_credits integer;
  v_inserted integer;
  v_key text;
begin
  if p_plan not in ('basic', 'standard', 'advanced') then
    raise exception 'Unknown subscription plan';
  end if;

  insert into public.user_entitlements (user_id) values (p_user_id)
  on conflict (user_id) do nothing;

  if p_status = 'trialing' then
    v_key := 'trial:' || p_subscription_id;
    insert into public.credit_transactions (user_id, amount, transaction_type, idempotency_key, metadata)
    values (p_user_id, 20, 'trial_grant', v_key, jsonb_build_object('subscription_id', p_subscription_id))
    on conflict (user_id, idempotency_key) do nothing;
    get diagnostics v_inserted = row_count;

    if v_inserted = 1 then
      update public.user_entitlements set
        plan = 'trial_basic',
        trial_starts_at = coalesce(trial_starts_at, now()),
        trial_ends_at = p_trial_ends_at,
        monthly_credits = 20,
        monthly_credits_expire_at = p_trial_ends_at,
        updated_at = now()
      where user_id = p_user_id;
    end if;
  elsif p_status = 'active' then
    v_credits := case p_plan when 'basic' then 200 when 'standard' then 700 else 1400 end;
    v_key := 'monthly:' || p_subscription_id || ':' || coalesce(nullif(p_period_key, ''), to_char(current_date, 'YYYY-MM'));
    insert into public.credit_transactions (user_id, amount, transaction_type, idempotency_key, metadata)
    values (p_user_id, v_credits, 'monthly_grant', v_key, jsonb_build_object('subscription_id', p_subscription_id, 'plan', p_plan))
    on conflict (user_id, idempotency_key) do nothing;
    get diagnostics v_inserted = row_count;

    if v_inserted = 1 then
      update public.user_entitlements set
        plan = p_plan,
        monthly_credits = v_credits,
        monthly_credits_expire_at = now() + interval '1 month',
        updated_at = now()
      where user_id = p_user_id;
    end if;
  elsif p_status in ('canceled', 'paused') then
    update public.user_entitlements set
      plan = 'free',
      monthly_credits = 0,
      monthly_credits_expire_at = null,
      updated_at = now()
    where user_id = p_user_id;
  end if;

  return (
    select jsonb_build_object(
      'plan', plan,
      'monthly_credits', monthly_credits,
      'trial_ends_at', trial_ends_at
    ) from public.user_entitlements where user_id = p_user_id
  );
end;
$$;

revoke all on function public.sync_subscription_entitlement(uuid, text, text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.sync_subscription_entitlement(uuid, text, text, text, text, timestamptz) to service_role;
