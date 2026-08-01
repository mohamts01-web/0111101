create index if not exists bank_transfer_requests_reviewed_by_idx
  on public.bank_transfer_requests (reviewed_by)
  where reviewed_by is not null;

create index if not exists paddle_credit_orders_user_id_idx
  on public.paddle_credit_orders (user_id, created_at desc)
  where user_id is not null;
