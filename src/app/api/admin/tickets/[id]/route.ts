import { NextResponse } from 'next/server';
import { getAdminUser, getConfiguredAdminEmails } from '@/lib/admin-auth';
import { notifyUser } from '@/lib/notifications';
import { createClient as createInternalClient } from '@/utils/supabase/server-internal';

type TicketUpdate = {
  status?: 'open' | 'in_progress' | 'resolved';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  assignedAdminEmail?: string | null;
  reply?: string;
};

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser();
  if (!admin?.email) return NextResponse.json({ error: 'غير مصرح.' }, { status: 403 });

  const { id } = await params;
  const payload = (await request.json().catch(() => ({}))) as TicketUpdate;
  if (payload.status && !['open', 'in_progress', 'resolved'].includes(payload.status))
    return NextResponse.json({ error: 'حالة التذكرة غير صحيحة.' }, { status: 400 });
  if (payload.priority && !['low', 'normal', 'high', 'urgent'].includes(payload.priority))
    return NextResponse.json({ error: 'أولوية التذكرة غير صحيحة.' }, { status: 400 });

  const assignedAdminEmail = payload.assignedAdminEmail?.trim().toLowerCase() ?? payload.assignedAdminEmail;
  if (assignedAdminEmail && !getConfiguredAdminEmails().includes(assignedAdminEmail))
    return NextResponse.json({ error: 'المدير المعيّن غير مهيأ للنظام.' }, { status: 400 });
  if (!payload.status && !payload.priority && payload.assignedAdminEmail === undefined && !payload.reply?.trim())
    return NextResponse.json({ error: 'لا يوجد تحديث.' }, { status: 400 });

  const internal = await createInternalClient();
  const { data: ticket } = await internal.from('support_tickets').select('*').eq('id', id).maybeSingle();
  if (!ticket) return NextResponse.json({ error: 'التذكرة غير موجودة.' }, { status: 404 });

  const nextStatus = payload.status ?? (payload.reply?.trim() ? 'in_progress' : ticket.status);
  const nextPriority = payload.priority ?? ticket.priority;
  const nextAssignee = payload.assignedAdminEmail === undefined ? ticket.assigned_admin_email : assignedAdminEmail;

  if (payload.reply?.trim()) {
    const { error } = await internal
      .from('support_messages')
      .insert({ ticket_id: id, author_user_id: admin.id, author_type: 'admin', body: payload.reply.trim() });
    if (error) return NextResponse.json({ error: 'تعذر إرسال الرد.' }, { status: 500 });
  }

  const { error: updateError } = await internal
    .from('support_tickets')
    .update({
      status: nextStatus,
      priority: nextPriority,
      assigned_admin_email: nextAssignee,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (updateError) return NextResponse.json({ error: 'تعذر تحديث التذكرة.' }, { status: 500 });

  await internal.from('admin_audit_logs').insert({
    actor_email: admin.email,
    action: 'support_ticket_updated',
    target_user_id: ticket.user_id,
    reason: payload.reply?.trim() || `تم التحديث بواسطة ${admin.email}`,
    before_state: {
      status: ticket.status,
      priority: ticket.priority,
      assigned_admin_email: ticket.assigned_admin_email,
    },
    after_state: { status: nextStatus, priority: nextPriority, assigned_admin_email: nextAssignee },
  });

  if (ticket.user_id) {
    await notifyUser({
      userId: ticket.user_id,
      type: 'support_reply',
      title: 'تحديث على تذكرة الدعم',
      body: payload.reply?.trim() || `تم تحديث حالة تذكرة الدعم إلى ${ticketStatusLabel(nextStatus)}.`,
      email: ticket.contact_email,
      data: { ticketId: id, status: nextStatus },
    });
  }
  return NextResponse.json({ updated: true });
}

function ticketStatusLabel(status: string) {
  return (
    ({ open: 'مفتوحة', in_progress: 'قيد المعالجة', resolved: 'محلولة' } as Record<string, string>)[status] ?? status
  );
}
