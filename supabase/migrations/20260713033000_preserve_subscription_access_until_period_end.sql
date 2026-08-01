alter table public.subscriptions
  add column if not exists current_billing_period_end timestamptz,
  add column if not exists access_until timestamptz;

drop function if exists public.upsert_paddle_subscription(text,text,text,text,text,text,timestamptz,timestamptz);
create function public.upsert_paddle_subscription(
  p_subscription_id text,
  p_customer_id text,
  p_status text,
  p_price_id text,
  p_product_id text,
  p_scheduled_change_action text,
  p_scheduled_change_at timestamptz,
  p_event_at timestamptz,
  p_access_until timestamptz default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_affected integer := 0;
begin
  insert into public.subscriptions (
    subscription_id, customer_id, subscription_status, price_id, product_id,
    scheduled_change, scheduled_change_action, scheduled_change_at,
    current_billing_period_end, access_until, paddle_updated_at, updated_at
  ) values (
    p_subscription_id, p_customer_id, p_status, p_price_id, p_product_id,
    p_scheduled_change_at::text, p_scheduled_change_action, p_scheduled_change_at,
    p_access_until, p_access_until, p_event_at, now()
  )
  on conflict (subscription_id) do update set
    customer_id = excluded.customer_id,
    subscription_status = excluded.subscription_status,
    price_id = excluded.price_id,
    product_id = excluded.product_id,
    scheduled_change = excluded.scheduled_change,
    scheduled_change_action = excluded.scheduled_change_action,
    scheduled_change_at = excluded.scheduled_change_at,
    current_billing_period_end = coalesce(excluded.current_billing_period_end, subscriptions.current_billing_period_end),
    access_until = case
      when excluded.access_until is null then subscriptions.access_until
      when subscriptions.access_until is null then excluded.access_until
      else greatest(subscriptions.access_until, excluded.access_until)
    end,
    paddle_updated_at = excluded.paddle_updated_at,
    updated_at = now()
  where excluded.paddle_updated_at >= subscriptions.paddle_updated_at;

  get diagnostics v_affected = row_count;
  return v_affected > 0;
end;
$$;

revoke all on function public.upsert_paddle_subscription(text,text,text,text,text,text,timestamptz,timestamptz,timestamptz)
  from public, anon, authenticated;
grant execute on function public.upsert_paddle_subscription(text,text,text,text,text,text,timestamptz,timestamptz,timestamptz)
  to service_role;

drop function if exists public.sync_subscription_entitlement(uuid,text,text,text,text,timestamptz);
create function public.sync_subscription_entitlement(
  p_user_id uuid,
  p_subscription_id text,
  p_plan text,
  p_status text,
  p_period_key text,
  p_trial_ends_at timestamptz default null,
  p_access_until timestamptz default null
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
    v_credits := case p_plan when 'basic' then 20 when 'standard' then 700 else 1400 end;
    v_key := 'trial:' || p_subscription_id;
    insert into public.credit_transactions (user_id, amount, transaction_type, idempotency_key, metadata)
    values (p_user_id, 20, 'trial_grant', v_key, jsonb_build_object('subscription_id', p_subscription_id))
    on conflict (user_id, idempotency_key) do nothing;

    if p_plan <> 'basic' then
      insert into public.credit_transactions (user_id, amount, transaction_type, idempotency_key, metadata)
      values (
        p_user_id, v_credits - 20, 'adjustment',
        'trial_plan:' || p_subscription_id || ':' || p_plan,
        jsonb_build_object('subscription_id', p_subscription_id, 'plan', p_plan)
      )
      on conflict (user_id, idempotency_key) do nothing;
    end if;

    update public.user_entitlements set
      plan = case when p_plan = 'basic' then 'trial_basic' else p_plan end,
      trial_starts_at = coalesce(trial_starts_at, now()),
      trial_ends_at = p_trial_ends_at,
      monthly_credits = greatest(monthly_credits, v_credits),
      monthly_credits_expire_at = coalesce(p_access_until, p_trial_ends_at),
      updated_at = now()
    where user_id = p_user_id;

  elsif p_status = 'active' then
    v_credits := case p_plan when 'basic' then 200 when 'standard' then 700 else 1400 end;
    v_key := 'monthly:' || p_subscription_id || ':' || coalesce(nullif(p_period_key, ''), to_char(current_date, 'YYYY-MM'));
    insert into public.credit_transactions (user_id, amount, transaction_type, idempotency_key, metadata)
    values (p_user_id, v_credits, 'monthly_grant', v_key, jsonb_build_object('subscription_id', p_subscription_id, 'plan', p_plan))
    on conflict (user_id, idempotency_key) do nothing;
    get diagnostics v_inserted = row_count;

    update public.user_entitlements set
      plan = p_plan,
      monthly_credits = case when v_inserted = 1 then v_credits else greatest(monthly_credits, v_credits) end,
      monthly_credits_expire_at = coalesce(p_access_until, now() + interval '1 month'),
      updated_at = now()
    where user_id = p_user_id;

  elsif p_status in ('canceled', 'paused') then
    if p_status = 'canceled' and p_access_until is not null and p_access_until > now() then
      update public.user_entitlements set
        plan = case when plan = 'free' then p_plan else plan end,
        monthly_credits_expire_at = p_access_until,
        updated_at = now()
      where user_id = p_user_id;
    else
      update public.user_entitlements set
        plan = 'free',
        monthly_credits = 0,
        monthly_credits_expire_at = null,
        updated_at = now()
      where user_id = p_user_id;
    end if;
  end if;

  return (
    select jsonb_build_object(
      'plan', plan,
      'monthly_credits', monthly_credits,
      'trial_ends_at', trial_ends_at,
      'access_until', p_access_until
    )
    from public.user_entitlements where user_id = p_user_id
  );
end;
$$;

revoke all on function public.sync_subscription_entitlement(uuid,text,text,text,text,timestamptz,timestamptz)
  from public, anon, authenticated;
grant execute on function public.sync_subscription_entitlement(uuid,text,text,text,text,timestamptz,timestamptz)
  to service_role;

update public.subscriptions s
set current_billing_period_end = ue.trial_ends_at,
    access_until = ue.trial_ends_at
from public.customers c
join public.user_entitlements ue on ue.user_id = c.user_id
where c.customer_id = s.customer_id
  and ue.trial_ends_at is not null
  and s.access_until is null;

with latest_plan as (
  select distinct on ((metadata->>'subscription_id'))
    user_id,
    metadata->>'subscription_id' as subscription_id,
    metadata->>'plan' as plan
  from public.credit_transactions
  where metadata ? 'subscription_id'
  order by (metadata->>'subscription_id'), created_at desc
)
update public.user_entitlements ue
set plan = case
      when lp.plan in ('basic','standard','advanced') then lp.plan
      else 'trial_basic'
    end,
    monthly_credits = case
      when lp.plan = 'standard' then greatest(ue.monthly_credits, 700)
      when lp.plan = 'advanced' then greatest(ue.monthly_credits, 1400)
      when lp.plan = 'basic' then greatest(ue.monthly_credits, 200)
      else greatest(ue.monthly_credits, 20)
    end,
    monthly_credits_expire_at = s.access_until,
    updated_at = now()
from public.customers c
join public.subscriptions s on s.customer_id = c.customer_id
left join latest_plan lp on lp.user_id = c.user_id and lp.subscription_id = s.subscription_id
where ue.user_id = c.user_id
  and s.subscription_status = 'canceled'
  and s.access_until > now();
