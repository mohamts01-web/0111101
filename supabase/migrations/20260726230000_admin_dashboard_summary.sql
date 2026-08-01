create or replace function public.admin_dashboard_summary()
returns table (
  total_users bigint,
  paid_access_users bigint,
  credits_in_circulation bigint,
  pending_transfers bigint,
  open_tickets bigint
)
language sql
security definer
set search_path = ''
as $$
  select
    (select count(*) from auth.users),
    (
      select count(distinct active_users.user_id)
      from (
        select customers.user_id
        from public.subscriptions
        join public.customers on customers.customer_id = subscriptions.customer_id
        where subscriptions.subscription_status in ('active', 'trialing')
        union
        select user_id
        from public.admin_plan_grants
        where status = 'active' and starts_at <= now() and ends_at > now()
        union
        select user_id
        from public.plan_access_grants
        where status = 'active' and starts_at <= now() and ends_at > now()
      ) as active_users
      where active_users.user_id is not null
    ),
    (
      coalesce((
        select sum(
          case when monthly_credits_expire_at is null or monthly_credits_expire_at > now() then monthly_credits else 0 end
          + purchased_credits + promotional_credits
        )
        from public.user_entitlements
      ), 0)
      + coalesce((
        select sum(credits_remaining)
        from public.admin_plan_grants
        where status = 'active' and starts_at <= now() and ends_at > now()
      ), 0)
      + coalesce((
        select sum(credits_remaining)
        from public.plan_access_grants
        where status = 'active' and starts_at <= now() and ends_at > now()
      ), 0)
    ),
    (select count(*) from public.bank_transfer_requests where status = 'pending'),
    (select count(*) from public.support_tickets where status <> 'resolved');
$$;

revoke all on function public.admin_dashboard_summary() from public, anon, authenticated;
grant execute on function public.admin_dashboard_summary() to service_role;
