-- Create customers table to map Paddle customer_id to email
create table
  public.customers (
    customer_id text not null,
    email text not null,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    constraint customers_pkey primary key (customer_id)
  ) tablespace pg_default;

-- Create subscription table to store webhook events sent by Paddle
create table
  public.subscriptions (
    subscription_id text not null,
    subscription_status text not null,
    price_id text null,
    product_id text null,
    scheduled_change text null,
    customer_id text not null,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    constraint subscriptions_pkey primary key (subscription_id),
    constraint public_subscriptions_customer_id_fkey foreign key (customer_id) references customers (customer_id)
  ) tablespace pg_default;

alter table public.customers enable row level security;
alter table public.subscriptions enable row level security;

-- Users may only resolve the Paddle customer associated with their authenticated email.
create policy "Users read their own customer"
on public.customers for select to authenticated
using (email = (select auth.jwt() ->> 'email'));

-- Subscription access follows ownership of the related customer record.
create policy "Users read their own subscriptions"
on public.subscriptions for select to authenticated
using (
  exists (
    select 1 from public.customers
    where customers.customer_id = subscriptions.customer_id
      and customers.email = (select auth.jwt() ->> 'email')
  )
);

grant select on public.customers, public.subscriptions to authenticated;
