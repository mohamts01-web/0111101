alter table public.support_tickets
  add column if not exists priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  add column if not exists assigned_admin_email text;

create index if not exists support_tickets_queue_idx
  on public.support_tickets (status, priority desc, updated_at desc);

create index if not exists support_tickets_assignee_idx
  on public.support_tickets (assigned_admin_email, status, updated_at desc)
  where assigned_admin_email is not null;
