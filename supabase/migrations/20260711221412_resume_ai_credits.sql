create table public.user_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'trial_basic', 'basic', 'standard', 'advanced')),
  trial_starts_at timestamptz,
  trial_ends_at timestamptz,
  monthly_credits integer not null default 0 check (monthly_credits >= 0),
  purchased_credits integer not null default 0 check (purchased_credits >= 0),
  promotional_credits integer not null default 0 check (promotional_credits >= 0),
  monthly_credits_expire_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.service_catalog (
  operation_key text primary key,
  name_ar text not null,
  name_en text not null,
  credit_cost integer not null check (credit_cost > 0),
  model_policy text not null default 'primary' check (model_policy in ('primary', 'translation', 'dual_review')),
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.service_catalog (operation_key, name_ar, name_en, credit_cost, model_policy) values
  ('assistant_message', 'رسالة للمساعد', 'Assistant message', 1, 'primary'),
  ('improve_section', 'تحسين قسم', 'Improve section', 3, 'primary'),
  ('translate_section', 'ترجمة قسم', 'Translate section', 4, 'translation'),
  ('translate_resume', 'ترجمة السيرة كاملة', 'Translate full resume', 12, 'translation'),
  ('resume_review', 'تقييم شامل للسيرة', 'Comprehensive resume review', 10, 'primary'),
  ('cover_letter', 'إنشاء خطاب تغطية', 'Create cover letter', 10, 'primary'),
  ('ats_analysis', 'تحليل توافق ATS', 'ATS compatibility analysis', 12, 'primary'),
  ('tailor_resume', 'تحسين السيرة للوظيفة', 'Tailor resume to a job', 20, 'primary'),
  ('dual_review', 'تحليل متقدم بنموذجين', 'Dual-model advanced review', 25, 'dual_review');

create table public.credit_products (
  id text primary key,
  price_sar numeric(10,2) not null check (price_sar > 0),
  discount_percent numeric(5,2) not null check (discount_percent between 0 and 100),
  credits integer not null check (credits > 0),
  paddle_price_id text unique,
  is_active boolean not null default true
);

insert into public.credit_products (id, price_sar, discount_percent, credits) values
  ('credits_10', 10, 1, 101),
  ('credits_20', 20, 2, 204),
  ('credits_30', 30, 3, 309),
  ('credits_50', 50, 4, 521),
  ('credits_75', 75, 5, 790),
  ('credits_100', 100, 6, 1064),
  ('credits_150', 150, 7, 1613),
  ('credits_200', 200, 8, 2174),
  ('credits_300', 300, 9, 3297),
  ('credits_500', 500, 10, 5556);

create table public.credit_transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null,
  transaction_type text not null check (transaction_type in ('trial_grant', 'monthly_grant', 'purchase', 'usage', 'refund', 'adjustment', 'expiry')),
  operation_key text references public.service_catalog(operation_key),
  idempotency_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create index credit_transactions_user_created_idx on public.credit_transactions (user_id, created_at desc);

create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'سيرة ذاتية بدون عنوان',
  language text not null default 'ar' check (language in ('ar', 'en')),
  template text not null default 'compact' check (template in ('compact', 'centered', 'minimal', 'executive')),
  page_mode text not null default 'one' check (page_mode in ('one', 'two')),
  content jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index resumes_user_updated_idx on public.resumes (user_id, updated_at desc);

create table public.resume_versions (
  id bigint generated always as identity primary key,
  resume_id uuid not null references public.resumes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null default 'manual' check (source in ('manual', 'ai', 'translation', 'ats_tailor')),
  content jsonb not null,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index resume_versions_resume_created_idx on public.resume_versions (resume_id, created_at desc);

create table public.job_analyses (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid references public.resumes(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  job_title text,
  job_description text not null,
  score integer not null check (score between 0 and 100),
  result jsonb not null,
  model text not null,
  created_at timestamptz not null default now()
);

create index job_analyses_user_created_idx on public.job_analyses (user_id, created_at desc);

create table public.cover_letters (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid references public.resumes(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'خطاب تغطية',
  language text not null default 'ar' check (language in ('ar', 'en')),
  job_description text,
  content text not null,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cover_letters_user_updated_idx on public.cover_letters (user_id, updated_at desc);

create table public.ai_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  operation_key text not null references public.service_catalog(operation_key),
  model text not null,
  status text not null check (status in ('started', 'succeeded', 'failed')),
  input_tokens integer,
  output_tokens integer,
  credits_charged integer not null default 0,
  error_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index ai_requests_user_created_idx on public.ai_requests (user_id, created_at desc);

create schema if not exists private;

create or replace function private.create_user_entitlement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_entitlements (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists create_user_entitlement_after_signup on auth.users;
create trigger create_user_entitlement_after_signup
after insert on auth.users
for each row execute function private.create_user_entitlement();

insert into public.user_entitlements (user_id)
select id from auth.users
on conflict (user_id) do nothing;

alter table public.user_entitlements enable row level security;
alter table public.service_catalog enable row level security;
alter table public.credit_products enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.resumes enable row level security;
alter table public.resume_versions enable row level security;
alter table public.job_analyses enable row level security;
alter table public.cover_letters enable row level security;
alter table public.ai_requests enable row level security;

create policy "Users read own entitlement" on public.user_entitlements for select to authenticated using ((select auth.uid()) = user_id);
create policy "Anyone reads active service catalog" on public.service_catalog for select to anon, authenticated using (is_active);
create policy "Anyone reads active credit products" on public.credit_products for select to anon, authenticated using (is_active);
create policy "Users read own credit transactions" on public.credit_transactions for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users manage own resumes" on public.resumes for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users read own resume versions" on public.resume_versions for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users read own analyses" on public.job_analyses for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users manage own cover letters" on public.cover_letters for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users read own AI requests" on public.ai_requests for select to authenticated using ((select auth.uid()) = user_id);

grant select on public.service_catalog, public.credit_products to anon, authenticated;
grant select on public.user_entitlements, public.credit_transactions, public.resume_versions, public.job_analyses, public.ai_requests to authenticated;
grant select, insert, update, delete on public.resumes, public.cover_letters to authenticated;
grant usage, select on sequence public.credit_transactions_id_seq, public.resume_versions_id_seq to authenticated;

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
  v_remaining integer;
  v_trial_used integer := 0;
  v_monthly_used integer := 0;
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

  if v_wallet.plan = 'trial_basic' and v_wallet.trial_ends_at <= now() then
    update public.user_entitlements set plan = 'free', monthly_credits = 0, updated_at = now()
    where user_id = p_user_id;
    v_wallet.plan := 'free';
    v_wallet.monthly_credits := 0;
  end if;

  if coalesce(v_wallet.monthly_credits, 0) + coalesce(v_wallet.promotional_credits, 0) + coalesce(v_wallet.purchased_credits, 0) < v_cost then
    raise exception 'Insufficient credits' using errcode = 'P0001';
  end if;

  v_remaining := v_cost;
  v_monthly_used := least(v_wallet.monthly_credits, v_remaining);
  v_remaining := v_remaining - v_monthly_used;
  v_promotional_used := least(v_wallet.promotional_credits, v_remaining);
  v_remaining := v_remaining - v_promotional_used;
  v_purchased_used := least(v_wallet.purchased_credits, v_remaining);

  update public.user_entitlements set
    monthly_credits = monthly_credits - v_monthly_used,
    promotional_credits = promotional_credits - v_promotional_used,
    purchased_credits = purchased_credits - v_purchased_used,
    updated_at = now()
  where user_id = p_user_id;

  insert into public.credit_transactions (user_id, amount, transaction_type, operation_key, idempotency_key, metadata)
  values (p_user_id, -v_cost, 'usage', p_operation_key, p_idempotency_key,
    jsonb_build_object('monthly', v_monthly_used, 'promotional', v_promotional_used, 'purchased', v_purchased_used));

  return jsonb_build_object(
    'charged', true,
    'duplicate', false,
    'cost', v_cost,
    'remaining', (v_wallet.monthly_credits + v_wallet.promotional_credits + v_wallet.purchased_credits - v_cost)
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
begin
  if exists (select 1 from public.credit_transactions where user_id = p_user_id and idempotency_key = v_refund_key) then
    return false;
  end if;

  select * into v_usage from public.credit_transactions
  where user_id = p_user_id and idempotency_key = p_idempotency_key and transaction_type = 'usage'
  for update;
  if not found then
    return false;
  end if;

  update public.user_entitlements set
    monthly_credits = monthly_credits + coalesce((v_usage.metadata->>'monthly')::integer, 0),
    promotional_credits = promotional_credits + coalesce((v_usage.metadata->>'promotional')::integer, 0),
    purchased_credits = purchased_credits + coalesce((v_usage.metadata->>'purchased')::integer, 0),
    updated_at = now()
  where user_id = p_user_id;

  insert into public.credit_transactions (user_id, amount, transaction_type, operation_key, idempotency_key, metadata)
  values (p_user_id, abs(v_usage.amount), 'refund', v_usage.operation_key, v_refund_key, jsonb_build_object('usage_transaction_id', v_usage.id));
  return true;
end;
$$;

revoke all on function public.refund_ai_credits(uuid, text) from public, anon, authenticated;
grant execute on function public.refund_ai_credits(uuid, text) to service_role;
