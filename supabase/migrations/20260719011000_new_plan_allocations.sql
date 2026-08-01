create or replace function public.sync_subscription_entitlement(
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
  if p_plan not in ('basic', 'standard', 'advanced') then raise exception 'Unknown subscription plan'; end if;
  insert into public.user_entitlements (user_id) values (p_user_id) on conflict (user_id) do nothing;

  if p_status in ('active', 'trialing') then
    v_credits := case p_plan when 'basic' then 300 when 'standard' then 700 else 2400 end;
    v_key := 'period:' || p_subscription_id || ':' || coalesce(nullif(p_period_key, ''), to_char(current_date, 'YYYY-MM-DD'));
    insert into public.credit_transactions (user_id, amount, transaction_type, idempotency_key, metadata)
    values (p_user_id, v_credits, 'plan_period_grant', v_key, jsonb_build_object('subscription_id', p_subscription_id, 'plan', p_plan))
    on conflict (user_id, idempotency_key) do nothing;
    get diagnostics v_inserted = row_count;

    update public.user_entitlements set
      plan = p_plan,
      trial_starts_at = case when p_status = 'trialing' then coalesce(trial_starts_at, now()) else trial_starts_at end,
      trial_ends_at = case when p_status = 'trialing' then p_trial_ends_at else null end,
      monthly_credits = case when v_inserted = 1 then v_credits else greatest(monthly_credits, v_credits) end,
      monthly_credits_expire_at = coalesce(p_access_until, case when p_plan = 'advanced' then now() + interval '3 months' else now() + interval '1 month' end),
      updated_at = now()
    where user_id = p_user_id;
  elsif p_status in ('canceled', 'paused') then
    update public.user_entitlements set plan = 'free', monthly_credits = 0, monthly_credits_expire_at = null, updated_at = now()
    where user_id = p_user_id;
  end if;

  return (select jsonb_build_object('plan', plan, 'monthly_credits', monthly_credits, 'access_until', p_access_until)
    from public.user_entitlements where user_id = p_user_id);
end;
$$;

create or replace function public.refund_ai_credits(
  p_user_id uuid,
  p_idempotency_key text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usage public.credit_transactions%rowtype;
  v_refund_key text := p_idempotency_key || ':refund';
  v_access_refund integer := 0;
  v_admin_refund integer := 0;
  v_access_id uuid;
  v_admin_id uuid;
begin
  if exists (select 1 from public.credit_transactions where user_id = p_user_id and idempotency_key = v_refund_key) then return false; end if;
  select * into v_usage from public.credit_transactions
  where user_id = p_user_id and idempotency_key = p_idempotency_key and transaction_type = 'usage' for update;
  if not found then return false; end if;

  v_access_refund := coalesce((v_usage.metadata ->> 'access_grant')::integer, 0);
  v_admin_refund := coalesce((v_usage.metadata ->> 'admin_grant')::integer, 0);
  v_access_id := nullif(v_usage.metadata ->> 'access_grant_id', '')::uuid;
  v_admin_id := nullif(v_usage.metadata ->> 'admin_grant_id', '')::uuid;

  update public.user_entitlements set
    monthly_credits = monthly_credits + coalesce((v_usage.metadata ->> 'monthly')::integer, 0),
    promotional_credits = promotional_credits + coalesce((v_usage.metadata ->> 'promotional')::integer, 0)
      + case when v_access_refund > 0 and not exists (select 1 from public.plan_access_grants where id = v_access_id and status = 'active' and ends_at > now()) then v_access_refund else 0 end
      + case when v_admin_refund > 0 and not exists (select 1 from public.admin_plan_grants where id = v_admin_id and status = 'active' and ends_at > now()) then v_admin_refund else 0 end,
    purchased_credits = purchased_credits + coalesce((v_usage.metadata ->> 'purchased')::integer, 0),
    updated_at = now()
  where user_id = p_user_id;

  update public.plan_access_grants set credits_remaining = least(credits_granted, credits_remaining + v_access_refund), updated_at = now()
  where id = v_access_id and status = 'active' and ends_at > now();
  update public.admin_plan_grants set credits_remaining = least(credits_granted, credits_remaining + v_admin_refund), updated_at = now()
  where id = v_admin_id and status = 'active' and ends_at > now();

  insert into public.credit_transactions (user_id, amount, transaction_type, operation_key, idempotency_key, metadata)
  values (p_user_id, abs(v_usage.amount), 'refund', v_usage.operation_key, v_refund_key, jsonb_build_object('usage_transaction_id', v_usage.id));
  return true;
end;
$$;

revoke all on function public.sync_subscription_entitlement(uuid,text,text,text,text,timestamptz,timestamptz) from public, anon, authenticated;
revoke all on function public.refund_ai_credits(uuid,text) from public, anon, authenticated;
grant execute on function public.sync_subscription_entitlement(uuid,text,text,text,text,timestamptz,timestamptz) to service_role;
grant execute on function public.refund_ai_credits(uuid,text) to service_role;
