create index subscriptions_customer_id_idx on public.subscriptions (customer_id);
create index credit_transactions_operation_key_idx on public.credit_transactions (operation_key);
create index resume_versions_user_id_idx on public.resume_versions (user_id);
create index job_analyses_resume_id_idx on public.job_analyses (resume_id);
create index cover_letters_resume_id_idx on public.cover_letters (resume_id);
create index ai_requests_operation_key_idx on public.ai_requests (operation_key);

drop policy if exists "Users read their own customer" on public.customers;
create policy "Users read their own customer"
on public.customers for select to authenticated
using (email = (select auth.jwt()) ->> 'email');

drop policy if exists "Users read their own subscriptions" on public.subscriptions;
create policy "Users read their own subscriptions"
on public.subscriptions for select to authenticated
using (
  exists (
    select 1 from public.customers
    where customers.customer_id = subscriptions.customer_id
      and customers.email = ((select auth.jwt()) ->> 'email')
  )
);
