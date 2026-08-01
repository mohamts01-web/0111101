import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createInternalClient } from '@/utils/supabase/server-internal';
import { notifyUser } from '@/lib/notifications';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: 'غير مصرح.' }, { status: 401 });

  const internal = await createInternalClient();
  const executeAfter = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await internal.from('account_deletion_requests').upsert(
    {
      user_id: user.id,
      email: user.email,
      status: 'pending',
      requested_by: 'user',
      requested_at: new Date().toISOString(),
      execute_after: executeAfter,
      canceled_at: null,
      completed_at: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (error) return NextResponse.json({ error: 'تعذر جدولة حذف الحساب.' }, { status: 500 });

  await internal
    .from('profiles')
    .update({ account_status: 'pending_deletion', updated_at: new Date().toISOString() })
    .eq('user_id', user.id);
  await notifyUser({
    userId: user.id,
    type: 'account_deletion_requested',
    title: 'تمت جدولة حذف حسابك',
    body: `سيتم حذف الحساب بعد 7 أيام بتاريخ ${new Date(executeAfter).toLocaleDateString('ar-SA')}. يمكنك إلغاء الطلب قبل ذلك.`,
    data: { executeAfter },
    email: user.email,
  });
  return NextResponse.json({ scheduled: true, executeAfter });
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: 'غير مصرح.' }, { status: 401 });

  const internal = await createInternalClient();
  const { error } = await internal
    .from('account_deletion_requests')
    .update({ status: 'canceled', canceled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('status', 'pending');
  if (error) return NextResponse.json({ error: 'تعذر إلغاء طلب الحذف.' }, { status: 500 });
  await internal
    .from('profiles')
    .update({ account_status: 'active', updated_at: new Date().toISOString() })
    .eq('user_id', user.id);
  await notifyUser({
    userId: user.id,
    type: 'account_deletion_canceled',
    title: 'تم إلغاء حذف الحساب',
    body: 'حسابك فعال ويمكنك متابعة استخدام المنصة كالمعتاد.',
    email: user.email,
  });
  return NextResponse.json({ canceled: true });
}
