create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  account_status text not null default 'active'
    check (account_status in ('active', 'pending_deletion', 'disabled', 'deleted')),
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  contact_email text not null,
  category text not null check (category in ('complaint', 'suggestion', 'support')),
  subject text not null check (char_length(subject) between 3 and 160),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  author_type text not null check (author_type in ('user', 'admin')),
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null,
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.admin_plan_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  plan text not null check (plan in ('basic', 'standard', 'advanced')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  credits_granted integer not null check (credits_granted > 0),
  credits_remaining integer not null check (credits_remaining >= 0),
  status text not null default 'active' check (status in ('active', 'revoked', 'expired')),
  reason text not null,
  created_by_email text not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (credits_remaining <= credits_granted)
);

create unique index admin_plan_grants_one_active_user_idx
  on public.admin_plan_grants (user_id)
  where status = 'active' and user_id is not null;

create table public.admin_audit_logs (
  id bigint generated always as identity primary key,
  actor_email text not null,
  action text not null,
  target_user_id uuid references auth.users(id) on delete set null,
  reason text not null,
  before_state jsonb not null default '{}'::jsonb,
  after_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  email text not null,
  status text not null default 'pending' check (status in ('pending', 'canceled', 'completed')),
  requested_by text not null check (requested_by in ('user', 'admin')),
  requested_at timestamptz not null default now(),
  execute_after timestamptz not null default (now() + interval '7 days'),
  canceled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_status_idx on public.profiles (account_status);
create index support_tickets_user_updated_idx on public.support_tickets (user_id, updated_at desc);
create index support_tickets_status_updated_idx on public.support_tickets (status, updated_at desc);
create index support_messages_ticket_created_idx on public.support_messages (ticket_id, created_at);
create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index notifications_user_unread_idx on public.notifications (user_id, created_at desc) where read_at is null;
create index admin_plan_grants_user_dates_idx on public.admin_plan_grants (user_id, starts_at, ends_at);
create index admin_audit_target_created_idx on public.admin_audit_logs (target_user_id, created_at desc);
create index account_deletion_due_idx on public.account_deletion_requests (execute_after) where status = 'pending';

alter table public.profiles enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
alter table public.notifications enable row level security;
alter table public.admin_plan_grants enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.account_deletion_requests enable row level security;

create policy "Users read own profile" on public.profiles
for select to authenticated using ((select auth.uid()) = user_id);

create policy "Users read own tickets" on public.support_tickets
for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users create own tickets" on public.support_tickets
for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "Users read messages in own tickets" on public.support_messages
for select to authenticated using (
  exists (
    select 1 from public.support_tickets
    where support_tickets.id = support_messages.ticket_id
      and support_tickets.user_id = (select auth.uid())
  )
);
create policy "Users reply to own tickets" on public.support_messages
for insert to authenticated with check (
  author_type = 'user'
  and author_user_id = (select auth.uid())
  and exists (
    select 1 from public.support_tickets
    where support_tickets.id = support_messages.ticket_id
      and support_tickets.user_id = (select auth.uid())
  )
);

create policy "Users read own notifications" on public.notifications
for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users mark own notifications read" on public.notifications
for update to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users read own admin grants" on public.admin_plan_grants
for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users read own deletion request" on public.account_deletion_requests
for select to authenticated using ((select auth.uid()) = user_id);

grant select on public.profiles, public.support_tickets, public.support_messages,
  public.notifications, public.admin_plan_grants, public.account_deletion_requests to authenticated;
grant insert on public.support_tickets, public.support_messages to authenticated;
grant update (read_at) on public.notifications to authenticated;

create or replace function private.create_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists create_user_profile_after_signup on auth.users;
create trigger create_user_profile_after_signup
after insert on auth.users
for each row execute function private.create_user_profile();

insert into public.profiles (user_id, full_name, phone)
select
  id,
  coalesce(raw_user_meta_data ->> 'full_name', ''),
  nullif(raw_user_meta_data ->> 'phone', '')
from auth.users
on conflict (user_id) do nothing;

alter table public.credit_transactions
  alter column user_id drop not null;
alter table public.credit_transactions
  drop constraint credit_transactions_user_id_fkey;
alter table public.credit_transactions
  add constraint credit_transactions_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

update public.user_entitlements
set plan = 'free', monthly_credits = 0, monthly_credits_expire_at = null, updated_at = now()
where monthly_credits_expire_at is not null
  and monthly_credits_expire_at <= now();

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
  v_grant public.admin_plan_grants%rowtype;
  v_remaining integer;
  v_monthly_used integer := 0;
  v_grant_used integer := 0;
  v_promotional_used integer := 0;
  v_purchased_used integer := 0;
  v_existing public.credit_transactions%rowtype;
begin
  select * into v_existing from public.credit_transactions
  where user_id = p_user_id and idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object('charged', false, 'duplicate', true, 'cost', abs(v_existing.amount));
  end if;

  select credit_cost into v_cost from public.service_catalog
  where operation_key = p_operation_key and is_active;
  if v_cost is null then
    raise exception 'Unknown or inactive AI operation';
  end if;

  select * into v_wallet from public.user_entitlements where user_id = p_user_id for update;
  if not found then
    raise exception 'Credit wallet not found';
  end if;

  if v_wallet.monthly_credits_expire_at is not null and v_wallet.monthly_credits_expire_at <= now() then
    update public.user_entitlements set
      plan = 'free', monthly_credits = 0, monthly_credits_expire_at = null, updated_at = now()
    where user_id = p_user_id;
    v_wallet.plan := 'free';
    v_wallet.monthly_credits := 0;
    v_wallet.monthly_credits_expire_at := null;
  end if;

  update public.admin_plan_grants set status = 'expired', credits_remaining = 0, updated_at = now()
  where user_id = p_user_id and status = 'active' and ends_at <= now();

  select * into v_grant from public.admin_plan_grants
  where user_id = p_user_id and status = 'active'
    and starts_at <= now() and ends_at > now()
  for update;

  if coalesce(v_wallet.monthly_credits, 0)
     + coalesce(v_grant.credits_remaining, 0)
     + coalesce(v_wallet.promotional_credits, 0)
     + coalesce(v_wallet.purchased_credits, 0) < v_cost then
    raise exception 'Insufficient credits' using errcode = 'P0001';
  end if;

  v_remaining := v_cost;
  v_monthly_used := least(v_wallet.monthly_credits, v_remaining);
  v_remaining := v_remaining - v_monthly_used;
  v_grant_used := least(coalesce(v_grant.credits_remaining, 0), v_remaining);
  v_remaining := v_remaining - v_grant_used;
  v_promotional_used := least(v_wallet.promotional_credits, v_remaining);
  v_remaining := v_remaining - v_promotional_used;
  v_purchased_used := least(v_wallet.purchased_credits, v_remaining);

  update public.user_entitlements set
    monthly_credits = monthly_credits - v_monthly_used,
    promotional_credits = promotional_credits - v_promotional_used,
    purchased_credits = purchased_credits - v_purchased_used,
    updated_at = now()
  where user_id = p_user_id;

  if v_grant_used > 0 then
    update public.admin_plan_grants set
      credits_remaining = credits_remaining - v_grant_used,
      updated_at = now()
    where id = v_grant.id;
  end if;

  insert into public.credit_transactions
    (user_id, amount, transaction_type, operation_key, idempotency_key, metadata)
  values (
    p_user_id, -v_cost, 'usage', p_operation_key, p_idempotency_key,
    jsonb_build_object(
      'monthly', v_monthly_used,
      'admin_grant', v_grant_used,
      'admin_grant_id', v_grant.id,
      'promotional', v_promotional_used,
      'purchased', v_purchased_used
    )
  );

  return jsonb_build_object(
    'charged', true,
    'duplicate', false,
    'cost', v_cost,
    'remaining', (
      v_wallet.monthly_credits + coalesce(v_grant.credits_remaining, 0)
      + v_wallet.promotional_credits + v_wallet.purchased_credits - v_cost
    )
  );
end;
$$;

revoke all on function public.consume_ai_credits(uuid, text, text) from public, anon, authenticated;
grant execute on function public.consume_ai_credits(uuid, text, text) to service_role;

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
  v_grant_refund integer := 0;
  v_grant_id uuid;
begin
  if exists (
    select 1 from public.credit_transactions
    where user_id = p_user_id and idempotency_key = v_refund_key
  ) then
    return false;
  end if;

  select * into v_usage from public.credit_transactions
  where user_id = p_user_id and idempotency_key = p_idempotency_key and transaction_type = 'usage'
  for update;
  if not found then
    return false;
  end if;

  v_grant_refund := coalesce((v_usage.metadata ->> 'admin_grant')::integer, 0);
  v_grant_id := nullif(v_usage.metadata ->> 'admin_grant_id', '')::uuid;

  update public.user_entitlements set
    monthly_credits = monthly_credits + coalesce((v_usage.metadata ->> 'monthly')::integer, 0),
    promotional_credits = promotional_credits
      + coalesce((v_usage.metadata ->> 'promotional')::integer, 0)
      + case when v_grant_refund > 0 and not exists (
          select 1 from public.admin_plan_grants
          where id = v_grant_id and status = 'active' and ends_at > now()
        ) then v_grant_refund else 0 end,
    purchased_credits = purchased_credits + coalesce((v_usage.metadata ->> 'purchased')::integer, 0),
    updated_at = now()
  where user_id = p_user_id;

  if v_grant_refund > 0 then
    update public.admin_plan_grants set
      credits_remaining = least(credits_granted, credits_remaining + v_grant_refund),
      updated_at = now()
    where id = v_grant_id and status = 'active' and ends_at > now();
  end if;

  insert into public.credit_transactions
    (user_id, amount, transaction_type, operation_key, idempotency_key, metadata)
  values (
    p_user_id, abs(v_usage.amount), 'refund', v_usage.operation_key, v_refund_key,
    jsonb_build_object('usage_transaction_id', v_usage.id)
  );
  return true;
end;
$$;

revoke all on function public.refund_ai_credits(uuid, text) from public, anon, authenticated;
grant execute on function public.refund_ai_credits(uuid, text) to service_role;

create or replace function public.admin_adjust_user_credits(
  p_user_id uuid,
  p_amount integer,
  p_actor_email text,
  p_reason text,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.user_entitlements%rowtype;
  v_grant public.admin_plan_grants%rowtype;
  v_to_remove integer;
  v_monthly_removed integer := 0;
  v_grant_removed integer := 0;
  v_promotional_removed integer := 0;
  v_purchased_removed integer := 0;
begin
  if p_amount = 0 or char_length(trim(p_reason)) < 3 then
    raise exception 'Invalid credit adjustment';
  end if;
  if exists (
    select 1 from public.credit_transactions
    where user_id = p_user_id and idempotency_key = p_idempotency_key
  ) then
    return jsonb_build_object('duplicate', true);
  end if;

  select * into v_wallet from public.user_entitlements where user_id = p_user_id for update;
  if not found then raise exception 'Credit wallet not found'; end if;

  select * into v_grant from public.admin_plan_grants
  where user_id = p_user_id and status = 'active' and starts_at <= now() and ends_at > now()
  for update;

  if p_amount > 0 then
    update public.user_entitlements
    set promotional_credits = promotional_credits + p_amount, updated_at = now()
    where user_id = p_user_id;
  else
    v_to_remove := abs(p_amount);
    if v_wallet.monthly_credits + coalesce(v_grant.credits_remaining, 0)
       + v_wallet.promotional_credits + v_wallet.purchased_credits < v_to_remove then
      raise exception 'Insufficient credits' using errcode = 'P0001';
    end if;
    v_monthly_removed := least(v_wallet.monthly_credits, v_to_remove);
    v_to_remove := v_to_remove - v_monthly_removed;
    v_grant_removed := least(coalesce(v_grant.credits_remaining, 0), v_to_remove);
    v_to_remove := v_to_remove - v_grant_removed;
    v_promotional_removed := least(v_wallet.promotional_credits, v_to_remove);
    v_to_remove := v_to_remove - v_promotional_removed;
    v_purchased_removed := least(v_wallet.purchased_credits, v_to_remove);

    update public.user_entitlements set
      monthly_credits = monthly_credits - v_monthly_removed,
      promotional_credits = promotional_credits - v_promotional_removed,
      purchased_credits = purchased_credits - v_purchased_removed,
      updated_at = now()
    where user_id = p_user_id;
    if v_grant_removed > 0 then
      update public.admin_plan_grants set
        credits_remaining = credits_remaining - v_grant_removed,
        updated_at = now()
      where id = v_grant.id;
    end if;
  end if;

  insert into public.credit_transactions
    (user_id, amount, transaction_type, idempotency_key, metadata)
  values (
    p_user_id, p_amount, 'adjustment', p_idempotency_key,
    jsonb_build_object(
      'actor_email', p_actor_email,
      'reason', p_reason,
      'monthly', v_monthly_removed,
      'admin_grant', v_grant_removed,
      'promotional', v_promotional_removed,
      'purchased', v_purchased_removed
    )
  );
  insert into public.admin_audit_logs
    (actor_email, action, target_user_id, reason, after_state)
  values (
    p_actor_email, 'credit_adjustment', p_user_id, p_reason,
    jsonb_build_object('amount', p_amount)
  );
  return jsonb_build_object('duplicate', false, 'amount', p_amount);
end;
$$;

revoke all on function public.admin_adjust_user_credits(uuid, integer, text, text, text)
from public, anon, authenticated;
grant execute on function public.admin_adjust_user_credits(uuid, integer, text, text, text) to service_role;

create or replace function public.admin_create_plan_grant(
  p_user_id uuid,
  p_plan text,
  p_ends_at timestamptz,
  p_actor_email text,
  p_reason text
) returns public.admin_plan_grants
language plpgsql
security definer
set search_path = public
as $$
declare
  v_credits integer;
  v_grant public.admin_plan_grants;
begin
  if p_plan not in ('basic', 'standard', 'advanced') or p_ends_at <= now() then
    raise exception 'Invalid plan grant';
  end if;
  if char_length(trim(p_reason)) < 3 then raise exception 'Reason is required'; end if;
  if exists (
    select 1 from public.admin_plan_grants where user_id = p_user_id and status = 'active'
  ) then
    raise exception 'User already has an active admin grant';
  end if;
  v_credits := case p_plan when 'basic' then 200 when 'standard' then 700 else 1400 end;
  insert into public.admin_plan_grants
    (user_id, plan, ends_at, credits_granted, credits_remaining, reason, created_by_email)
  values (p_user_id, p_plan, p_ends_at, v_credits, v_credits, p_reason, p_actor_email)
  returning * into v_grant;
  insert into public.admin_audit_logs
    (actor_email, action, target_user_id, reason, after_state)
  values (
    p_actor_email, 'plan_grant_created', p_user_id, p_reason,
    jsonb_build_object('grant_id', v_grant.id, 'plan', p_plan, 'ends_at', p_ends_at, 'credits', v_credits)
  );
  return v_grant;
end;
$$;

revoke all on function public.admin_create_plan_grant(uuid, text, timestamptz, text, text)
from public, anon, authenticated;
grant execute on function public.admin_create_plan_grant(uuid, text, timestamptz, text, text) to service_role;

create or replace function public.admin_revoke_plan_grant(
  p_grant_id uuid,
  p_actor_email text,
  p_reason text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grant public.admin_plan_grants;
begin
  select * into v_grant from public.admin_plan_grants where id = p_grant_id for update;
  if not found or v_grant.status <> 'active' then return false; end if;
  update public.admin_plan_grants set
    status = 'revoked', credits_remaining = 0, revoked_at = now(), updated_at = now()
  where id = p_grant_id;
  insert into public.admin_audit_logs
    (actor_email, action, target_user_id, reason, before_state, after_state)
  values (
    p_actor_email, 'plan_grant_revoked', v_grant.user_id, p_reason,
    to_jsonb(v_grant), jsonb_build_object('status', 'revoked', 'credits_remaining', 0)
  );
  return true;
end;
$$;

revoke all on function public.admin_revoke_plan_grant(uuid, text, text)
from public, anon, authenticated;
grant execute on function public.admin_revoke_plan_grant(uuid, text, text) to service_role;

