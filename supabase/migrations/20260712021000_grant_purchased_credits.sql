create or replace function public.grant_purchased_credits(
  p_user_id uuid,
  p_price_id text,
  p_transaction_id text,
  p_quantity integer default 1
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_credits integer;
  v_amount integer;
  v_granted boolean;
begin
  if p_quantity < 1 then raise exception 'Invalid quantity'; end if;
  select credits into v_credits from public.credit_products
  where paddle_price_id = p_price_id and is_active;
  if v_credits is null then raise exception 'Unknown credit price'; end if;
  v_amount := v_credits * p_quantity;

  insert into public.credit_transactions (user_id, amount, transaction_type, idempotency_key, metadata)
  values (p_user_id, v_amount, 'purchase', 'paddle:' || p_transaction_id,
    jsonb_build_object('transaction_id', p_transaction_id, 'price_id', p_price_id, 'quantity', p_quantity))
  on conflict (user_id, idempotency_key) do nothing;
  v_granted := found;

  if v_granted then
    update public.user_entitlements
    set purchased_credits = purchased_credits + v_amount, updated_at = now()
    where user_id = p_user_id;
  end if;

  return (select jsonb_build_object(
    'granted', v_granted,
    'purchased_credits', purchased_credits,
    'total', monthly_credits + promotional_credits + purchased_credits
  ) from public.user_entitlements where user_id = p_user_id);
end;
$$;

revoke all on function public.grant_purchased_credits(uuid, text, text, integer) from public, anon, authenticated;
grant execute on function public.grant_purchased_credits(uuid, text, text, integer) to service_role;
