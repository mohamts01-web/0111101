create extension if not exists pg_net;
create extension if not exists pg_cron;

alter table public.account_deletion_requests
  add column if not exists attempt_count integer not null default 0,
  add column if not exists last_error text;

select cron.schedule(
  'process-account-deletions',
  '17 * * * *',
  $cron$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'account_deletion_project_url' limit 1)
      || '/functions/v1/process-account-deletions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'account_deletion_publishable_key' limit 1),
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'account_deletion_publishable_key' limit 1)
    ),
    body := jsonb_build_object('source', 'pg_cron', 'invoked_at', now()),
    timeout_milliseconds := 15000
  );
  $cron$
);
