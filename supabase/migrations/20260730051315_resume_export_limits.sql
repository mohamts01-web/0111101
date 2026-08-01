create table public.resume_export_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resume_id uuid not null references public.resumes(id) on delete cascade,
  operation text not null check (operation in ('download', 'email')),
  entitlement_plan text not null check (entitlement_plan in ('free', 'trial_basic', 'basic', 'standard', 'advanced')),
  period_key text not null,
  status text not null default 'authorized' check (status in ('authorized', 'completed', 'cancelled')),
  uses_free_quota boolean not null default false,
  credits_charged integer not null default 0 check (credits_charged in (0, 10)),
  idempotency_key text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  cancelled_at timestamptz,
  unique (user_id, idempotency_key)
);

create index resume_export_events_user_period_status_idx
  on public.resume_export_events (user_id, period_key, status, created_at desc);

create index resume_export_events_resume_created_idx
  on public.resume_export_events (resume_id, created_at desc);

alter table public.resume_export_events enable row level security;

create policy "Users read own resume export events"
  on public.resume_export_events for select to authenticated
  using ((select auth.uid()) = user_id);

grant select on public.resume_export_events to authenticated;

drop policy if exists "Users manage own resumes" on public.resumes;
create policy "Users read own resumes"
  on public.resumes for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users delete own resumes"
  on public.resumes for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke insert, update on public.resumes from authenticated;

insert into public.service_catalog (operation_key, name_ar, name_en, credit_cost, model_policy)
values
  ('resume_download', 'تنزيل السيرة الذاتية', 'Resume download', 10, 'primary'),
  ('resume_email', 'إرسال السيرة بالبريد', 'Resume email delivery', 10, 'primary')
on conflict (operation_key) do update set
  name_ar = excluded.name_ar,
  name_en = excluded.name_en,
  credit_cost = excluded.credit_cost,
  model_policy = excluded.model_policy,
  is_active = true,
  updated_at = now();

create or replace function public.authorize_resume_export(
  p_user_id uuid,
  p_resume_id uuid,
  p_operation text,
  p_entitlement_plan text,
  p_period_key text,
  p_free_quota integer,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.resume_export_events%rowtype;
  v_free_usage integer;
  v_charge jsonb;
  v_credits_charged integer := 0;
  v_uses_free_quota boolean := false;
  v_event public.resume_export_events%rowtype;
begin
  if p_operation not in ('download', 'email')
     or p_entitlement_plan not in ('free', 'trial_basic', 'basic', 'standard', 'advanced')
     or char_length(trim(p_period_key)) = 0
     or p_free_quota < 0
     or char_length(trim(p_idempotency_key)) = 0 then
    raise exception 'Invalid resume export authorization';
  end if;

  select * into v_existing
  from public.resume_export_events
  where user_id = p_user_id and idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object(
      'authorization_id', v_existing.id,
      'status', v_existing.status,
      'credits_charged', v_existing.credits_charged,
      'uses_free_quota', v_existing.uses_free_quota,
      'duplicate', true
    );
  end if;

  if not exists (
    select 1 from public.resumes
    where id = p_resume_id and user_id = p_user_id
  ) then
    raise exception 'Resume not found';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_period_key, 0));

  if p_entitlement_plan = 'advanced' then
    v_uses_free_quota := true;
  else
    select count(*) into v_free_usage
    from public.resume_export_events
    where user_id = p_user_id
      and period_key = p_period_key
      and uses_free_quota
      and (
        status = 'completed'
        or (status = 'authorized' and expires_at > now())
      );
    v_uses_free_quota := v_free_usage < p_free_quota;
  end if;

  if not v_uses_free_quota then
    select public.consume_effective_ai_credits(
      p_user_id,
      case when p_operation = 'download' then 'resume_download' else 'resume_email' end,
      p_idempotency_key
    ) into v_charge;
    v_credits_charged := coalesce((v_charge ->> 'cost')::integer, 10);
  end if;

  insert into public.resume_export_events (
    user_id,
    resume_id,
    operation,
    entitlement_plan,
    period_key,
    status,
    uses_free_quota,
    credits_charged,
    idempotency_key,
    expires_at,
    completed_at
  ) values (
    p_user_id,
    p_resume_id,
    p_operation,
    p_entitlement_plan,
    p_period_key,
    case when p_operation = 'download' then 'completed' else 'authorized' end,
    v_uses_free_quota,
    v_credits_charged,
    p_idempotency_key,
    case when p_operation = 'email' then now() + interval '15 minutes' else null end,
    case when p_operation = 'download' then now() else null end
  ) returning * into v_event;

  return jsonb_build_object(
    'authorization_id', v_event.id,
    'status', v_event.status,
    'credits_charged', v_event.credits_charged,
    'uses_free_quota', v_event.uses_free_quota,
    'duplicate', false
  );
end;
$$;

create or replace function public.complete_resume_email_export(
  p_user_id uuid,
  p_authorization_id uuid
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.resume_export_events
  set status = 'completed', completed_at = now(), expires_at = null
  where id = p_authorization_id
    and user_id = p_user_id
    and operation = 'email'
    and status = 'authorized'
    and expires_at > now();

  return found;
end;
$$;

create or replace function public.cancel_resume_email_export(
  p_user_id uuid,
  p_authorization_id uuid
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.resume_export_events%rowtype;
begin
  select * into v_event
  from public.resume_export_events
  where id = p_authorization_id
    and user_id = p_user_id
    and operation = 'email'
  for update;

  if not found or v_event.status <> 'authorized' then return false; end if;

  update public.resume_export_events
  set status = 'cancelled', cancelled_at = now(), expires_at = null
  where id = v_event.id;

  if v_event.credits_charged > 0 then
    perform public.refund_ai_credits(v_event.user_id, v_event.idempotency_key);
  end if;

  return true;
end;
$$;

revoke all on function public.authorize_resume_export(uuid, uuid, text, text, text, integer, text) from public, anon, authenticated;
revoke all on function public.complete_resume_email_export(uuid, uuid) from public, anon, authenticated;
revoke all on function public.cancel_resume_email_export(uuid, uuid) from public, anon, authenticated;
grant execute on function public.authorize_resume_export(uuid, uuid, text, text, text, integer, text) to service_role;
grant execute on function public.complete_resume_email_export(uuid, uuid) to service_role;
grant execute on function public.cancel_resume_email_export(uuid, uuid) to service_role;
