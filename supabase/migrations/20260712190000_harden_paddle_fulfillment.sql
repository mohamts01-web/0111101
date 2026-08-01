alter table public.customers
  add column if not exists paddle_updated_at timestamptz not null default '-infinity'::timestamptz;

alter table public.subscriptions
  add column if not exists scheduled_change_action text,
  add column if not exists scheduled_change_at timestamptz,
  add column if not exists paddle_updated_at timestamptz not null default '-infinity'::timestamptz;

create or replace function public.upsert_paddle_customer(
  p_customer_id text,
  p_email text,
  p_user_id uuid,
  p_event_at timestamptz
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_affected integer := 0;
begin
  insert into public.customers (customer_id, email, user_id, paddle_updated_at, updated_at)
  values (p_customer_id, lower(trim(p_email)), p_user_id, p_event_at, now())
  on conflict (customer_id) do update set
    email = excluded.email,
    user_id = coalesce(excluded.user_id, customers.user_id),
    paddle_updated_at = excluded.paddle_updated_at,
    updated_at = now()
  where excluded.paddle_updated_at >= customers.paddle_updated_at;

  get diagnostics v_affected = row_count;
  return v_affected > 0;
end;
$$;

create or replace function public.upsert_paddle_subscription(
  p_subscription_id text,
  p_customer_id text,
  p_status text,
  p_price_id text,
  p_product_id text,
  p_scheduled_change_action text,
  p_scheduled_change_at timestamptz,
  p_event_at timestamptz
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_affected integer := 0;
begin
  insert into public.subscriptions (
    subscription_id,
    customer_id,
    subscription_status,
    price_id,
    product_id,
    scheduled_change,
    scheduled_change_action,
    scheduled_change_at,
    paddle_updated_at,
    updated_at
  ) values (
    p_subscription_id,
    p_customer_id,
    p_status,
    p_price_id,
    p_product_id,
    p_scheduled_change_at::text,
    p_scheduled_change_action,
    p_scheduled_change_at,
    p_event_at,
    now()
  )
  on conflict (subscription_id) do update set
    customer_id = excluded.customer_id,
    subscription_status = excluded.subscription_status,
    price_id = excluded.price_id,
    product_id = excluded.product_id,
    scheduled_change = excluded.scheduled_change,
    scheduled_change_action = excluded.scheduled_change_action,
    scheduled_change_at = excluded.scheduled_change_at,
    paddle_updated_at = excluded.paddle_updated_at,
    updated_at = now()
  where excluded.paddle_updated_at >= subscriptions.paddle_updated_at;

  get diagnostics v_affected = row_count;
  return v_affected > 0;
end;
$$;

revoke all on function public.upsert_paddle_customer(text, text, uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.upsert_paddle_subscription(text, text, text, text, text, text, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.upsert_paddle_customer(text, text, uuid, timestamptz) to service_role;
grant execute on function public.upsert_paddle_subscription(text, text, text, text, text, text, timestamptz, timestamptz) to service_role;
