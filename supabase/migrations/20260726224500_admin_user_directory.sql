create or replace function public.admin_user_directory(
  p_search text default null,
  p_page integer default 1,
  p_page_size integer default 50
)
returns table (
  user_id uuid,
  email text,
  full_name text,
  phone text,
  account_status text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  total_count bigint
)
language sql
security definer
set search_path = ''
as $$
  with filtered as (
    select
      users.id as user_id,
      users.email,
      coalesce(profiles.full_name, '') as full_name,
      profiles.phone,
      coalesce(profiles.account_status, 'active') as account_status,
      users.created_at,
      coalesce(users.last_sign_in_at, profiles.last_seen_at) as last_sign_in_at,
      count(*) over () as total_count
    from auth.users
    left join public.profiles on profiles.user_id = users.id
    where nullif(trim(p_search), '') is null
      or users.email ilike '%' || trim(p_search) || '%'
      or profiles.full_name ilike '%' || trim(p_search) || '%'
      or profiles.phone ilike '%' || trim(p_search) || '%'
  )
  select *
  from filtered
  order by created_at desc
  limit least(greatest(p_page_size, 1), 100)
  offset (greatest(p_page, 1) - 1) * least(greatest(p_page_size, 1), 100);
$$;

revoke all on function public.admin_user_directory(text, integer, integer) from public, anon, authenticated;
grant execute on function public.admin_user_directory(text, integer, integer) to service_role;
