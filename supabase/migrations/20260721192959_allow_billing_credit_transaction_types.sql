alter table public.credit_transactions
  drop constraint if exists credit_transactions_transaction_type_check;

alter table public.credit_transactions
  add constraint credit_transactions_transaction_type_check
  check (
    transaction_type in (
      'trial_grant',
      'monthly_grant',
      'plan_grant',
      'plan_period_grant',
      'purchase',
      'bank_purchase',
      'bank_bonus',
      'usage',
      'refund',
      'adjustment',
      'expiry'
    )
  );
