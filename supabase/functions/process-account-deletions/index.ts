import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

type DeletionRequest = { id: string; user_id: string; email: string; attempt_count: number };

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRoleKey) return json({ error: 'Supabase service credentials are missing' }, 500);
  const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: due, error } = await supabase
    .from('account_deletion_requests')
    .select('id,user_id,email,attempt_count')
    .eq('status', 'pending')
    .not('user_id', 'is', null)
    .lte('execute_after', new Date().toISOString())
    .order('execute_after')
    .limit(25);
  if (error) return json({ error: error.message }, 500);

  const completed: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];
  for (const item of (due ?? []) as DeletionRequest[]) {
    try {
      await executeDeletion(supabase, item);
      completed.push(item.id);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      failed.push({ id: item.id, error: message });
      await supabase
        .from('account_deletion_requests')
        .update({
          attempt_count: item.attempt_count + 1,
          last_error: message.slice(0, 2000),
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);
    }
  }
  return json({ completed, failed }, failed.length ? 207 : 200);
});

async function executeDeletion(supabase: ReturnType<typeof createClient>, item: DeletionRequest) {
  const userId = item.user_id;
  for (const table of [
    'job_analyses',
    'cover_letters',
    'resume_versions',
    'resumes',
    'ai_requests',
    'notifications',
    'support_tickets',
  ]) {
    const { error } = await supabase.from(table).delete().eq('user_id', userId);
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  const now = new Date().toISOString();
  const operations = [
    supabase.from('customers').update({ user_id: null, updated_at: now }).eq('user_id', userId),
    supabase.from('credit_transactions').update({ user_id: null }).eq('user_id', userId),
    supabase.from('admin_audit_logs').update({ target_user_id: null }).eq('target_user_id', userId),
    supabase
      .from('admin_plan_grants')
      .update({ user_id: null, status: 'revoked', credits_remaining: 0, revoked_at: now, updated_at: now })
      .eq('user_id', userId),
    supabase
      .from('user_entitlements')
      .update({
        plan: 'free',
        monthly_credits: 0,
        purchased_credits: 0,
        promotional_credits: 0,
        monthly_credits_expire_at: null,
        updated_at: now,
      })
      .eq('user_id', userId),
    supabase
      .from('profiles')
      .update({ full_name: '', phone: null, account_status: 'deleted', updated_at: now })
      .eq('user_id', userId),
  ];
  const results = await Promise.all(operations);
  const operationError = results.find((result) => result.error)?.error;
  if (operationError) throw new Error(operationError.message);

  const { error: authError } = await supabase.auth.admin.deleteUser(userId);
  if (authError) throw new Error(`auth: ${authError.message}`);
  const { error: requestError } = await supabase
    .from('account_deletion_requests')
    .update({
      status: 'completed',
      user_id: null,
      completed_at: now,
      last_error: null,
      attempt_count: item.attempt_count + 1,
      updated_at: now,
    })
    .eq('id', item.id);
  if (requestError) throw new Error(`request: ${requestError.message}`);
  await sendCompletionEmail(item.email);
}

async function sendCompletionEmail(email: string) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('RESEND_FROM_EMAIL');
  const testRecipient = Deno.env.get('RESEND_TEST_RECIPIENT');
  if (!apiKey || !from) return;
  const to = from.includes('onboarding@resend.dev') ? testRecipient : email;
  if (!to) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        subject: 'تم حذف حسابك',
        html: '<div dir="rtl"><h2>تم حذف حسابك</h2><p>اكتملت عملية حذف بيانات حسابك ومحتواك من المنصة.</p></div>',
      }),
    });
  } catch (error) {
    console.error('Completion email failed', error);
  }
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
