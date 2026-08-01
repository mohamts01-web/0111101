import { NextResponse } from 'next/server';
import { getAdminUser, isConfiguredAdmin } from '@/lib/admin-auth';
import { notifyUser } from '@/lib/notifications';
import { getPaddleInstance } from '@/utils/paddle/get-paddle-instance';
import { createClient as createInternalClient } from '@/utils/supabase/server-internal';

type AdminAction = {
  action?: 'adjust_credit' | 'grant_plan' | 'revoke_grant' | 'cancel_subscription' | 'request_delete' | 'set_status';
  amount?: number;
  plan?: string;
  endsAt?: string;
  grantId?: string;
  reason?: string;
  status?: string;
  disableImmediately?: boolean;
  operationId?: string;
};

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser();
  if (!admin?.email) return NextResponse.json({ error: 'غير مصرح.' }, { status: 403 });
  const { id: userId } = await params;
  const payload = (await request.json().catch(() => ({}))) as AdminAction;
  const reason = payload.reason?.trim() ?? '';
  if (!payload.action || reason.length < 3)
    return NextResponse.json({ error: 'الإجراء والسبب التفصيلي مطلوبان.' }, { status: 400 });

  if (!payload.operationId || !/^[\da-f-]{36}$/i.test(payload.operationId))
    return NextResponse.json({ error: 'معرّف العملية مطلوب لحماية الرصيد من التكرار.' }, { status: 400 });

  const internal = await createInternalClient();
  const { data: targetAuth } = await internal.auth.admin.getUserById(userId);
  const target = targetAuth.user;
  if (!target?.email) return NextResponse.json({ error: 'المستخدم غير موجود.' }, { status: 404 });

  const isProtectedAdmin = isConfiguredAdmin(target.email);
  if (isProtectedAdmin && ['set_status', 'request_delete'].includes(payload.action))
    return NextResponse.json({ error: 'لا يمكن تعطيل أو جدولة حذف حساب مدير مهيأ للنظام.' }, { status: 400 });

  try {
    if (payload.action === 'adjust_credit') {
      const amount = Number(payload.amount);
      if (!Number.isInteger(amount) || amount === 0)
        return NextResponse.json({ error: 'قيمة الرصيد يجب أن تكون عددًا صحيحًا غير صفري.' }, { status: 400 });
      const { error } = await internal.rpc('admin_adjust_user_credits', {
        p_user_id: userId,
        p_amount: amount,
        p_actor_email: admin.email,
        p_reason: reason,
        p_idempotency_key: `admin:${admin.id}:${payload.operationId}`,
      });
      if (error) throw error;
      await notifyUser({
        userId,
        type: 'admin_credit_adjustment',
        title: 'تم تعديل رصيدك',
        body: `${amount > 0 ? 'أضافت' : 'خصمت'} الإدارة ${Math.abs(amount)} نقطة. السبب: ${reason}`,
        email: target.email,
        data: { amount },
      });
    }

    if (payload.action === 'grant_plan') {
      if (
        !payload.plan ||
        !['basic', 'advanced'].includes(payload.plan) ||
        !payload.endsAt ||
        new Date(payload.endsAt).getTime() <= Date.now()
      ) {
        return NextResponse.json({ error: 'اختر باقة وتاريخ انتهاء صحيحين.' }, { status: 400 });
      }
      const { error } = await internal.rpc('admin_create_plan_grant', {
        p_user_id: userId,
        p_plan: payload.plan,
        p_ends_at: payload.endsAt,
        p_actor_email: admin.email,
        p_reason: reason,
      });
      if (error) throw error;
      await notifyUser({
        userId,
        type: 'admin_plan_grant',
        title: 'منحة باقة من الإدارة',
        body: `تم منحك باقة ${planLabel(payload.plan)} حتى ${new Date(payload.endsAt).toLocaleDateString('ar-SA')}. السبب: ${reason}`,
        email: target.email,
        data: { plan: payload.plan, endsAt: payload.endsAt },
      });
    }

    if (payload.action === 'revoke_grant') {
      if (!payload.grantId) return NextResponse.json({ error: 'معرّف المنحة مطلوب.' }, { status: 400 });
      const { error } = await internal.rpc('admin_revoke_plan_grant', {
        p_grant_id: payload.grantId,
        p_actor_email: admin.email,
        p_reason: reason,
      });
      if (error) throw error;
      await notifyUser({
        userId,
        type: 'admin_plan_grant_revoked',
        title: 'تم إيقاف منحة الباقة',
        body: `أوقفت الإدارة منحة الباقة. السبب: ${reason}`,
        email: target.email,
      });
    }

    if (payload.action === 'cancel_subscription') {
      const { data: customer } = await internal
        .from('customers')
        .select('customer_id')
        .eq('user_id', userId)
        .maybeSingle();
      const { data: subscription } = customer
        ? await internal
            .from('subscriptions')
            .select('*')
            .eq('customer_id', customer.customer_id)
            .in('subscription_status', ['active', 'trialing'])
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        : { data: null };
      if (!subscription) return NextResponse.json({ error: 'لا يوجد اشتراك Paddle فعّال.' }, { status: 404 });
      await getPaddleInstance().subscriptions.cancel(subscription.subscription_id, { effectiveFrom: 'immediately' });
      await internal.from('admin_audit_logs').insert({
        actor_email: admin.email,
        action: 'paddle_subscription_canceled',
        target_user_id: userId,
        reason,
        before_state: subscription,
        after_state: { requested_status: 'canceled', effective_from: 'immediately' },
      });
      await notifyUser({
        userId,
        type: 'admin_subscription_canceled',
        title: 'تم إلغاء الاشتراك',
        body: `ألغت الإدارة اشتراكك فورًا، وسيعالج Paddle أي استرداد نسبي مستحق. السبب: ${reason}`,
        email: target.email,
        data: { subscriptionId: subscription.subscription_id },
      });
    }

    if (payload.action === 'request_delete') {
      const executeAfter = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await internal.from('account_deletion_requests').upsert(
        {
          user_id: userId,
          email: target.email,
          status: 'pending',
          requested_by: 'admin',
          requested_at: new Date().toISOString(),
          execute_after: executeAfter,
          canceled_at: null,
          completed_at: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );
      await internal
        .from('profiles')
        .update({
          account_status: payload.disableImmediately ? 'disabled' : 'pending_deletion',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
      await internal.from('admin_audit_logs').insert({
        actor_email: admin.email,
        action: 'account_deletion_requested',
        target_user_id: userId,
        reason,
        after_state: { execute_after: executeAfter, disabled_immediately: Boolean(payload.disableImmediately) },
      });
      await notifyUser({
        userId,
        type: 'admin_account_deletion_requested',
        title: 'تمت جدولة حذف الحساب',
        body: `سيُحذف حسابك بعد 7 أيام. السبب: ${reason}`,
        email: target.email,
        data: { executeAfter },
      });
    }

    if (payload.action === 'set_status') {
      if (!payload.status || !['active', 'disabled'].includes(payload.status))
        return NextResponse.json({ error: 'حالة الحساب غير صحيحة.' }, { status: 400 });
      const { data: before } = await internal
        .from('profiles')
        .select('account_status')
        .eq('user_id', userId)
        .maybeSingle();
      await internal
        .from('profiles')
        .update({ account_status: payload.status, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
      await internal.from('admin_audit_logs').insert({
        actor_email: admin.email,
        action: 'account_status_changed',
        target_user_id: userId,
        reason,
        before_state: before ?? {},
        after_state: { account_status: payload.status },
      });
      await notifyUser({
        userId,
        type: 'admin_account_status',
        title: 'تحديث حالة الحساب',
        body: `${payload.status === 'active' ? 'تم تفعيل حسابك.' : 'تم تعطيل حسابك مؤقتًا.'} السبب: ${reason}`,
        email: target.email,
        data: { status: payload.status },
      });
    }
    return NextResponse.json({ updated: true, pendingWebhook: payload.action === 'cancel_subscription' });
  } catch (error) {
    console.error('Admin user action failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'تعذر تنفيذ الإجراء الإداري.' },
      { status: 500 },
    );
  }
}

function planLabel(plan: string) {
  return ({ basic: 'الأساسية بلس', advanced: 'المتقدمة' } as Record<string, string>)[plan] ?? plan;
}
