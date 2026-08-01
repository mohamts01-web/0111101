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
  if p_plan not in ('basic', 'advanced') or p_ends_at <= now() then raise exception 'Invalid plan grant'; end if;
  if char_length(trim(p_reason)) < 3 then raise exception 'Reason is required'; end if;
  if exists (select 1 from public.admin_plan_grants where user_id = p_user_id and status = 'active') then
    raise exception 'User already has an active admin grant';
  end if;
  v_credits := case p_plan when 'basic' then 300 else 2400 end;
  insert into public.admin_plan_grants
    (user_id, plan, ends_at, credits_granted, credits_remaining, reason, created_by_email)
  values (p_user_id, p_plan, p_ends_at, v_credits, v_credits, p_reason, p_actor_email)
  returning * into v_grant;
  insert into public.admin_audit_logs (actor_email, action, target_user_id, reason, after_state)
  values (p_actor_email, 'plan_grant_created', p_user_id, p_reason,
    jsonb_build_object('grant_id', v_grant.id, 'plan', p_plan, 'ends_at', p_ends_at, 'credits', v_credits));
  return v_grant;
end;
$$;

revoke all on function public.admin_create_plan_grant(uuid, text, timestamptz, text, text) from public, anon, authenticated;
grant execute on function public.admin_create_plan_grant(uuid, text, timestamptz, text, text) to service_role;
