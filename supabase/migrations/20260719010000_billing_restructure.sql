create table if not exists public.plan_access_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  source text not null check (source in ('paddle_transaction', 'bank_transfer')),
  source_id text not null unique,
  plan text not null check (plan in ('trial_basic', 'basic', 'advanced')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  credits_granted integer not null check (credits_granted >= 0),
  credits_remaining integer not null check (credits_remaining >= 0),
  status text not null default 'active' check (status in ('active', 'expired', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists plan_access_grants_user_active_idx
  on public.plan_access_grants (user_id, ends_at desc)
  where status = 'active';

create table if not exists public.bank_transfer_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  contact_email text not null,
  request_kind text not null check (request_kind in ('subscription', 'credits')),
  plan text check (plan in ('trial_basic', 'basic', 'advanced')),
  face_value_sar numeric(10,2),
  payable_amount_sar numeric(10,2) not null check (payable_amount_sar > 0 and payable_amount_sar <= 1000),
  base_credits integer not null default 0 check (base_credits >= 0),
  bonus_credits integer not null default 0 check (bonus_credits >= 0),
  receipt_path text not null,
  sender_name text,
  transfer_reference text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'canceled')),
  admin_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (request_kind = 'subscription' and plan is not null and base_credits = 0 and bonus_credits = 0)
    or (request_kind = 'credits' and plan is null and face_value_sar is not null and base_credits > 0)
  )
);

create index if not exists bank_transfer_requests_user_created_idx
  on public.bank_transfer_requests (user_id, created_at desc);
create index if not exists bank_transfer_requests_pending_idx
  on public.bank_transfer_requests (created_at)
  where status = 'pending';

create table if not exists public.paddle_credit_orders (
  transaction_id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  face_value_sar numeric(10,2) not null,
  payable_amount_sar numeric(10,2) not null,
  credits integer not null check (credits > 0),
  status text not null default 'pending' check (status in ('pending', 'completed')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.plan_access_grants enable row level security;
alter table public.bank_transfer_requests enable row level security;
alter table public.paddle_credit_orders enable row level security;

drop policy if exists "Users can read own access grants" on public.plan_access_grants;
create policy "Users can read own access grants"
  on public.plan_access_grants for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own bank transfers" on public.bank_transfer_requests;
create policy "Users can read own bank transfers"
  on public.bank_transfer_requests for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own Paddle credit orders" on public.paddle_credit_orders;
create policy "Users can read own Paddle credit orders"
  on public.paddle_credit_orders for select to authenticated
  using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bank-transfer-receipts',
  'bank-transfer-receipts',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can upload own bank receipts" on storage.objects;
create policy "Users can upload own bank receipts"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'bank-transfer-receipts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can read own bank receipts" on storage.objects;
create policy "Users can read own bank receipts"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'bank-transfer-receipts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

alter table public.credit_products
  add column if not exists face_value_sar numeric(10,2),
  add column if not exists payable_amount_sar numeric(10,2),
  add column if not exists base_credits integer;

update public.credit_products
set
  face_value_sar = price_sar,
  payable_amount_sar = round(price_sar * (1 - discount_percent / 100), 2),
  base_credits = round(price_sar * 10)::integer,
  credits = round(price_sar * 10)::integer,
  price_sar = round(price_sar * (1 - discount_percent / 100), 2),
  paddle_price_id = null;

alter table public.credit_products
  alter column face_value_sar set not null,
  alter column payable_amount_sar set not null,
  alter column base_credits set not null;

create or replace function public.grant_plan_access(
  p_user_id uuid,
  p_source text,
  p_source_id text,
  p_plan text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_credits integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_source not in ('paddle_transaction', 'bank_transfer')
     or p_plan not in ('trial_basic', 'basic', 'advanced')
     or p_ends_at <= p_starts_at
     or p_credits < 0 then
    raise exception 'Invalid access grant';
  end if;

  insert into public.plan_access_grants
    (user_id, source, source_id, plan, starts_at, ends_at, credits_granted, credits_remaining)
  values
    (p_user_id, p_source, p_source_id, p_plan, p_starts_at, p_ends_at, p_credits, p_credits)
  on conflict (source_id) do nothing;

  if not found then return false; end if;

  insert into public.credit_transactions
    (user_id, amount, transaction_type, idempotency_key, metadata)
  values (
    p_user_id,
    p_credits,
    'plan_grant',
    'plan-grant:' || p_source_id,
    jsonb_build_object('source', p_source, 'source_id', p_source_id, 'plan', p_plan, 'ends_at', p_ends_at)
  );
  return true;
end;
$$;

create or replace function public.complete_paddle_credit_order(
  p_transaction_id text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.paddle_credit_orders%rowtype;
begin
  select * into v_order from public.paddle_credit_orders
  where transaction_id = p_transaction_id for update;
  if not found then raise exception 'Unknown Paddle credit order'; end if;
  if v_order.status = 'completed' then
    return jsonb_build_object('duplicate', true, 'user_id', v_order.user_id, 'credits', v_order.credits);
  end if;

  insert into public.user_entitlements (user_id)
  values (v_order.user_id)
  on conflict (user_id) do nothing;

  update public.user_entitlements
  set purchased_credits = purchased_credits + v_order.credits, updated_at = now()
  where user_id = v_order.user_id;

  update public.paddle_credit_orders
  set status = 'completed', completed_at = now(), updated_at = now()
  where transaction_id = p_transaction_id;

  insert into public.credit_transactions
    (user_id, amount, transaction_type, idempotency_key, metadata)
  values (
    v_order.user_id,
    v_order.credits,
    'purchase',
    'paddle-credit:' || p_transaction_id,
    jsonb_build_object(
      'transaction_id', p_transaction_id,
      'face_value_sar', v_order.face_value_sar,
      'payable_amount_sar', v_order.payable_amount_sar
    )
  );

  return jsonb_build_object('duplicate', false, 'user_id', v_order.user_id, 'credits', v_order.credits);
end;
$$;

create or replace function public.review_bank_transfer(
  p_request_id uuid,
  p_admin_id uuid,
  p_admin_email text,
  p_decision text,
  p_note text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.bank_transfer_requests%rowtype;
  v_starts_at timestamptz := now();
  v_ends_at timestamptz;
begin
  if p_decision not in ('approved', 'rejected') or char_length(trim(p_note)) < 3 then
    raise exception 'Invalid review decision';
  end if;

  select * into v_request from public.bank_transfer_requests
  where id = p_request_id for update;
  if not found then raise exception 'Bank transfer request not found'; end if;
  if v_request.status <> 'pending' then
    return jsonb_build_object('duplicate', true, 'status', v_request.status, 'user_id', v_request.user_id);
  end if;

  update public.bank_transfer_requests set
    status = p_decision,
    admin_note = trim(p_note),
    reviewed_by = p_admin_id,
    reviewed_at = now(),
    updated_at = now()
  where id = p_request_id;

  if p_decision = 'approved' then
    insert into public.user_entitlements (user_id)
    values (v_request.user_id)
    on conflict (user_id) do nothing;

    if v_request.request_kind = 'credits' then
      update public.user_entitlements set
        purchased_credits = purchased_credits + v_request.base_credits,
        promotional_credits = promotional_credits + v_request.bonus_credits,
        updated_at = now()
      where user_id = v_request.user_id;

      insert into public.credit_transactions
        (user_id, amount, transaction_type, idempotency_key, metadata)
      values
        (v_request.user_id, v_request.base_credits, 'bank_purchase', 'bank-base:' || v_request.id,
         jsonb_build_object('request_id', v_request.id, 'payable_amount_sar', v_request.payable_amount_sar)),
        (v_request.user_id, v_request.bonus_credits, 'bank_bonus', 'bank-bonus:' || v_request.id,
         jsonb_build_object('request_id', v_request.id, 'bonus_percent', 5));
    else
      v_ends_at := case v_request.plan
        when 'trial_basic' then v_starts_at + interval '7 days'
        when 'basic' then v_starts_at + interval '1 month'
        when 'advanced' then v_starts_at + interval '3 months'
      end;
      perform public.grant_plan_access(
        v_request.user_id,
        'bank_transfer',
        'bank:' || v_request.id,
        v_request.plan,
        v_starts_at,
        v_ends_at,
        case v_request.plan when 'trial_basic' then 50 when 'basic' then 300 when 'advanced' then 2400 end
      );
    end if;
  end if;

  insert into public.admin_audit_logs
    (actor_email, action, target_user_id, reason, before_state, after_state)
  values (
    p_admin_email,
    'bank_transfer_' || p_decision,
    v_request.user_id,
    trim(p_note),
    jsonb_build_object('status', v_request.status),
    jsonb_build_object('request_id', v_request.id, 'status', p_decision, 'kind', v_request.request_kind)
  );

  return jsonb_build_object(
    'duplicate', false,
    'status', p_decision,
    'user_id', v_request.user_id,
    'contact_email', v_request.contact_email,
    'kind', v_request.request_kind,
    'plan', v_request.plan,
    'base_credits', v_request.base_credits,
    'bonus_credits', v_request.bonus_credits
  );
end;
$$;

create or replace function public.consume_ai_credits(
  p_user_id uuid,
  p_operation_key text,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cost integer;
  v_wallet public.user_entitlements%rowtype;
  v_access public.plan_access_grants%rowtype;
  v_admin public.admin_plan_grants%rowtype;
  v_remaining integer;
  v_monthly_used integer := 0;
  v_access_used integer := 0;
  v_admin_used integer := 0;
  v_promotional_used integer := 0;
  v_purchased_used integer := 0;
  v_existing public.credit_transactions%rowtype;
begin
  select * into v_existing from public.credit_transactions
  where user_id = p_user_id and idempotency_key = p_idempotency_key;
  if found then return jsonb_build_object('charged', false, 'duplicate', true, 'cost', abs(v_existing.amount)); end if;

  select credit_cost into v_cost from public.service_catalog
  where operation_key = p_operation_key and is_active;
  if v_cost is null then raise exception 'Unknown or inactive AI operation'; end if;

  select * into v_wallet from public.user_entitlements where user_id = p_user_id for update;
  if not found then raise exception 'Credit wallet not found'; end if;

  if v_wallet.monthly_credits_expire_at is not null and v_wallet.monthly_credits_expire_at <= now() then
    update public.user_entitlements set plan = 'free', monthly_credits = 0, monthly_credits_expire_at = null, updated_at = now()
    where user_id = p_user_id;
    v_wallet.monthly_credits := 0;
  end if;

  update public.plan_access_grants set status = 'expired', credits_remaining = 0, updated_at = now()
  where user_id = p_user_id and status = 'active' and ends_at <= now();
  update public.admin_plan_grants set status = 'expired', credits_remaining = 0, updated_at = now()
  where user_id = p_user_id and status = 'active' and ends_at <= now();

  select * into v_access from public.plan_access_grants
  where user_id = p_user_id and status = 'active' and starts_at <= now() and ends_at > now()
  order by ends_at asc limit 1 for update;
  select * into v_admin from public.admin_plan_grants
  where user_id = p_user_id and status = 'active' and starts_at <= now() and ends_at > now()
  order by ends_at asc limit 1 for update;

  if coalesce(v_wallet.monthly_credits, 0) + coalesce(v_access.credits_remaining, 0)
     + coalesce(v_admin.credits_remaining, 0) + coalesce(v_wallet.promotional_credits, 0)
     + coalesce(v_wallet.purchased_credits, 0) < v_cost then
    raise exception 'Insufficient credits' using errcode = 'P0001';
  end if;

  v_remaining := v_cost;
  v_monthly_used := least(v_wallet.monthly_credits, v_remaining); v_remaining := v_remaining - v_monthly_used;
  v_access_used := least(coalesce(v_access.credits_remaining, 0), v_remaining); v_remaining := v_remaining - v_access_used;
  v_admin_used := least(coalesce(v_admin.credits_remaining, 0), v_remaining); v_remaining := v_remaining - v_admin_used;
  v_promotional_used := least(v_wallet.promotional_credits, v_remaining); v_remaining := v_remaining - v_promotional_used;
  v_purchased_used := least(v_wallet.purchased_credits, v_remaining);

  update public.user_entitlements set
    monthly_credits = monthly_credits - v_monthly_used,
    promotional_credits = promotional_credits - v_promotional_used,
    purchased_credits = purchased_credits - v_purchased_used,
    updated_at = now()
  where user_id = p_user_id;
  if v_access_used > 0 then update public.plan_access_grants set credits_remaining = credits_remaining - v_access_used, updated_at = now() where id = v_access.id; end if;
  if v_admin_used > 0 then update public.admin_plan_grants set credits_remaining = credits_remaining - v_admin_used, updated_at = now() where id = v_admin.id; end if;

  insert into public.credit_transactions (user_id, amount, transaction_type, operation_key, idempotency_key, metadata)
  values (p_user_id, -v_cost, 'usage', p_operation_key, p_idempotency_key,
    jsonb_build_object('monthly', v_monthly_used, 'access_grant', v_access_used, 'access_grant_id', v_access.id,
      'admin_grant', v_admin_used, 'admin_grant_id', v_admin.id, 'promotional', v_promotional_used, 'purchased', v_purchased_used));

  return jsonb_build_object('charged', true, 'duplicate', false, 'cost', v_cost,
    'remaining', v_wallet.monthly_credits + coalesce(v_access.credits_remaining, 0)
      + coalesce(v_admin.credits_remaining, 0) + v_wallet.promotional_credits + v_wallet.purchased_credits - v_cost);
end;
$$;

revoke all on function public.grant_plan_access(uuid, text, text, text, timestamptz, timestamptz, integer) from public, anon, authenticated;
revoke all on function public.complete_paddle_credit_order(text) from public, anon, authenticated;
revoke all on function public.review_bank_transfer(uuid, uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.consume_ai_credits(uuid, text, text) from public, anon, authenticated;
grant execute on function public.grant_plan_access(uuid, text, text, text, timestamptz, timestamptz, integer) to service_role;
grant execute on function public.complete_paddle_credit_order(text) to service_role;
grant execute on function public.review_bank_transfer(uuid, uuid, text, text, text) to service_role;
grant execute on function public.consume_ai_credits(uuid, text, text) to service_role;
