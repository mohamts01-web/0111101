create or replace function public.consume_effective_ai_credits(
  p_user_id uuid,
  p_operation_key text,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.customers c
    join public.subscriptions s on s.customer_id = c.customer_id
    where c.user_id = p_user_id
      and s.subscription_status in ('active', 'trialing')
  ) then
    update public.user_entitlements
    set plan = 'free', monthly_credits = 0, monthly_credits_expire_at = null, updated_at = now()
    where user_id = p_user_id
      and (plan <> 'free' or monthly_credits <> 0 or monthly_credits_expire_at is not null);
  end if;

  return public.consume_ai_credits(p_user_id, p_operation_key, p_idempotency_key);
end;
$$;

revoke all on function public.consume_effective_ai_credits(uuid, text, text) from public, anon, authenticated;
grant execute on function public.consume_effective_ai_credits(uuid, text, text) to service_role;
