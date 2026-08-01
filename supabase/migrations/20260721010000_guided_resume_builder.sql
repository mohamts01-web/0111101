alter table public.profiles
  add column if not exists guided_resume_claimed_at timestamptz,
  add column if not exists guided_resume_used_at timestamptz;

alter table public.ai_requests
  add column if not exists source text not null default 'standard'
    check (source in ('standard', 'guided', 'pdf_import'));

insert into public.service_catalog (operation_key, name_ar, name_en, credit_cost, model_policy)
values ('guided_resume', 'إنشاء سيرة بمساعدة AI', 'AI-guided resume builder', 10, 'primary')
on conflict (operation_key) do update set
  name_ar = excluded.name_ar,
  name_en = excluded.name_en,
  credit_cost = excluded.credit_cost,
  model_policy = excluded.model_policy,
  is_active = true,
  updated_at = now();

create or replace function public.claim_guided_resume(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claimed timestamptz;
  v_used timestamptz;
begin
  insert into public.profiles (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select guided_resume_claimed_at, guided_resume_used_at
    into v_claimed, v_used
  from public.profiles
  where user_id = p_user_id
  for update;

  if v_used is not null then return false; end if;
  if v_claimed is not null and v_claimed > now() - interval '30 minutes' then return false; end if;

  update public.profiles
  set guided_resume_claimed_at = now(), updated_at = now()
  where user_id = p_user_id;
  return true;
end;
$$;

create or replace function public.complete_guided_resume(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set guided_resume_claimed_at = null, guided_resume_used_at = coalesce(guided_resume_used_at, now()), updated_at = now()
  where user_id = p_user_id and guided_resume_used_at is null;
  return found;
end;
$$;

create or replace function public.release_guided_resume(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set guided_resume_claimed_at = null, updated_at = now()
  where user_id = p_user_id and guided_resume_used_at is null;
  return found;
end;
$$;

revoke all on function public.claim_guided_resume(uuid) from public, anon, authenticated;
revoke all on function public.complete_guided_resume(uuid) from public, anon, authenticated;
revoke all on function public.release_guided_resume(uuid) from public, anon, authenticated;
grant execute on function public.claim_guided_resume(uuid) to service_role;
grant execute on function public.complete_guided_resume(uuid) to service_role;
grant execute on function public.release_guided_resume(uuid) to service_role;
