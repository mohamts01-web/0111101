import { NextResponse } from 'next/server';
import { getCreditOffer } from '@/lib/billing';
import { PricingTier, type EntitlementPlanId } from '@/constants/pricing-tier';
import { createClient } from '@/utils/supabase/server';
import { createClient as createInternalClient } from '@/utils/supabase/server-internal';

const allowedTypes = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['application/pdf', 'pdf'],
]);

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح.' }, { status: 401 });
  const { data, error } = await supabase
    .from('bank_transfer_requests')
    .select('id,request_kind,plan,payable_amount_sar,base_credits,bonus_credits,status,admin_note,created_at')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'تعذر تحميل الطلبات.' }, { status: 500 });
  return NextResponse.json({ requests: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: 'أنشئ حساباً أو سجّل الدخول أولاً.' }, { status: 401 });

  const form = await request.formData();
  const receipt = form.get('receipt');
  const kind = String(form.get('kind') ?? '');
  const senderName = String(form.get('senderName') ?? '')
    .trim()
    .slice(0, 120);
  const transferReference = String(form.get('transferReference') ?? '')
    .trim()
    .slice(0, 120);
  if (
    !(receipt instanceof File) ||
    !allowedTypes.has(receipt.type) ||
    receipt.size <= 0 ||
    receipt.size > 5 * 1024 * 1024
  ) {
    return NextResponse.json({ error: 'أرفق صورة أو PDF للإيصال بحجم لا يتجاوز 5MB.' }, { status: 400 });
  }
  if (!['subscription', 'credits'].includes(kind)) {
    return NextResponse.json({ error: 'نوع الطلب غير صحيح.' }, { status: 400 });
  }

  let plan: EntitlementPlanId | null = null;
  let faceValueSar: number | null = null;
  let payableAmountSar = 0;
  let baseCredits = 0;
  let bonusCredits = 0;
  if (kind === 'subscription') {
    plan = String(form.get('plan') ?? '') as EntitlementPlanId;
    const tier = PricingTier.find((item) => item.entitlementPlan === plan);
    if (!tier) return NextResponse.json({ error: 'الباقة غير صحيحة.' }, { status: 400 });
    payableAmountSar = tier.priceSar;
  } else {
    const offer = getCreditOffer(Number(form.get('faceValueSar')));
    if (offer.faceValueSar !== Number(form.get('faceValueSar'))) {
      return NextResponse.json({ error: 'قيمة الرصيد غير صحيحة.' }, { status: 400 });
    }
    faceValueSar = offer.faceValueSar;
    payableAmountSar = offer.payableAmountSar;
    baseCredits = offer.credits;
    bonusCredits = offer.bankBonusCredits;
  }

  const internal = await createInternalClient();
  const requestId = crypto.randomUUID();
  const path = `${user.id}/${requestId}/receipt.${allowedTypes.get(receipt.type)}`;
  const { error: uploadError } = await internal.storage
    .from('bank-transfer-receipts')
    .upload(path, receipt, { contentType: receipt.type, upsert: false });
  if (uploadError) return NextResponse.json({ error: 'تعذر رفع الإيصال.' }, { status: 500 });

  const { data, error } = await internal
    .from('bank_transfer_requests')
    .insert({
      id: requestId,
      user_id: user.id,
      contact_email: user.email,
      request_kind: kind,
      plan,
      face_value_sar: faceValueSar,
      payable_amount_sar: payableAmountSar,
      base_credits: baseCredits,
      bonus_credits: bonusCredits,
      receipt_path: path,
      sender_name: senderName || null,
      transfer_reference: transferReference || null,
    })
    .select('id,status,created_at')
    .single();
  if (error) {
    await internal.storage.from('bank-transfer-receipts').remove([path]);
    return NextResponse.json({ error: 'تعذر إنشاء طلب المراجعة.' }, { status: 500 });
  }
  return NextResponse.json({ request: data }, { status: 201 });
}
