import { NextResponse } from 'next/server';
import { getCreditOffer } from '@/lib/billing';
import { getPaddleInstance } from '@/utils/paddle/get-paddle-instance';
import { createClient } from '@/utils/supabase/server';
import { createClient as createInternalClient } from '@/utils/supabase/server-internal';

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: 'سجّل الدخول قبل الدفع.' }, { status: 401 });

  const payload = (await request.json().catch(() => ({}))) as { faceValueSar?: number };
  const requestedAmount = Number(payload.faceValueSar);
  if (!Number.isInteger(requestedAmount) || requestedAmount < 10 || requestedAmount > 1000) {
    return NextResponse.json({ error: 'اختر مبلغاً صحيحاً بين 10 و1000 ريال.' }, { status: 400 });
  }

  const offer = getCreditOffer(requestedAmount);
  const internal = await createInternalClient();
  const paddle = getPaddleInstance();

  try {
    let { data: customer } = await internal
      .from('customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!customer) {
      const existingCustomers = await paddle.customers.list({ email: [user.email], perPage: 1 }).next();
      const created =
        existingCustomers[0] ??
        (await paddle.customers.create({ email: user.email, customData: { loadUserId: user.id } }));
      const { error } = await internal.rpc('upsert_paddle_customer', {
        p_customer_id: created.id,
        p_email: user.email,
        p_user_id: user.id,
        p_event_at: new Date().toISOString(),
      });
      if (error) throw error;
      customer = { customer_id: created.id };
    }

    const transaction = await paddle.transactions.create({
      customerId: customer.customer_id,
      collectionMode: 'automatic',
      customData: {
        loadKind: 'credit_topup',
        loadUserId: user.id,
        faceValueSar: offer.faceValueSar,
        payableAmountSar: offer.payableAmountSar,
        credits: offer.credits,
      },
      items: [
        {
          quantity: 1,
          price: {
            description: `${offer.credits} LOAD AI credits`,
            unitPrice: { amount: String(offer.usdCents), currencyCode: 'USD' },
            taxMode: 'internal',
            product: {
              name: 'LOAD AI Credits',
              description: 'One-time AI credit top-up for LOAD CV',
              taxCategory: 'saas',
              customData: { loadKind: 'credit_topup' },
            },
          },
        },
      ],
    });

    const { error: orderError } = await internal.from('paddle_credit_orders').insert({
      transaction_id: transaction.id,
      user_id: user.id,
      face_value_sar: offer.faceValueSar,
      payable_amount_sar: offer.payableAmountSar,
      credits: offer.credits,
    });
    if (orderError) throw orderError;

    return NextResponse.json({ transactionId: transaction.id, offer });
  } catch (error) {
    console.error('Creating Paddle credit checkout failed', error);
    return NextResponse.json({ error: 'تعذر تجهيز الدفع الآن.' }, { status: 500 });
  }
}
