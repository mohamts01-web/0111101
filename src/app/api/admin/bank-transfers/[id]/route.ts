import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { notifyUser } from '@/lib/notifications';
import { createClient as createInternalClient } from '@/utils/supabase/server-internal';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser();
  if (!admin?.email) return NextResponse.json({ error: 'غير مصرح.' }, { status: 403 });
  const { id } = await params;
  const payload = (await request.json().catch(() => ({}))) as { decision?: 'approved' | 'rejected'; note?: string };
  if (
    !payload.decision ||
    !['approved', 'rejected'].includes(payload.decision) ||
    (payload.note?.trim().length ?? 0) < 3
  ) {
    return NextResponse.json({ error: 'القرار وملاحظة واضحة مطلوبان.' }, { status: 400 });
  }
  const internal = await createInternalClient();
  const { data, error } = await internal.rpc('review_bank_transfer', {
    p_request_id: id,
    p_admin_id: admin.id,
    p_admin_email: admin.email,
    p_decision: payload.decision,
    p_note: payload.note!.trim(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.duplicate && data?.user_id && data?.contact_email) {
    const approved = payload.decision === 'approved';
    await notifyUser({
      userId: data.user_id,
      email: data.contact_email,
      type: `bank_transfer_${payload.decision}`,
      title: approved ? 'تم قبول التحويل البنكي' : 'تعذر قبول التحويل البنكي',
      body: approved
        ? data.kind === 'credits'
          ? `تمت إضافة ${data.base_credits} نقطة وهدية ${data.bonus_credits} نقطة إلى رصيدك.`
          : 'تم تفعيل باقتك من تاريخ الموافقة.'
        : `تم رفض الطلب. ملاحظة الإدارة: ${payload.note!.trim()}`,
      data: { requestId: id, decision: payload.decision },
    });
  }
  return NextResponse.json({ request: data });
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: 'غير مصرح.' }, { status: 403 });
  const { id } = await params;
  const internal = await createInternalClient();
  const { data: transfer } = await internal.from('bank_transfer_requests').select('receipt_path').eq('id', id).single();
  if (!transfer) return NextResponse.json({ error: 'الإيصال غير موجود.' }, { status: 404 });
  const { data, error } = await internal.storage
    .from('bank-transfer-receipts')
    .createSignedUrl(transfer.receipt_path, 300);
  if (error) return NextResponse.json({ error: 'تعذر فتح الإيصال.' }, { status: 500 });
  return NextResponse.redirect(data.signedUrl);
}
