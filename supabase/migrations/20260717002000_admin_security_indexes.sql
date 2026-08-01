create policy "No direct audit log access"
on public.admin_audit_logs
for all
to authenticated
using (false)
with check (false);

create index if not exists support_messages_author_user_idx
  on public.support_messages (author_user_id)
  where author_user_id is not null;
