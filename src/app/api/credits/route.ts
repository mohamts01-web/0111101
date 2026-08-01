import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';
import { resolveEffectiveEntitlement } from '@/lib/effective-entitlement';

export async function GET(request: Request) {
  const authorization = request.headers.get('authorization');
  const supabase = authorization
    ? createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: authorization } },
        auth: { persistSession: false },
      })
    : await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح.' }, { status: 401 });

  try {
    const [entitlement, products, transfers] = await Promise.all([
      resolveEffectiveEntitlement(supabase, user.id),
      supabase
        .from('credit_products')
        .select('id,face_value_sar,payable_amount_sar,discount_percent,base_credits')
        .eq('is_active', true)
        .order('face_value_sar'),
      supabase
        .from('bank_transfer_requests')
        .select('id,request_kind,plan,payable_amount_sar,base_credits,bonus_credits,status,admin_note,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    if (products.error || transfers.error) throw products.error ?? transfers.error;

    return NextResponse.json({
      userEmail: user.email,
      entitlement,
      products: products.data ?? [],
      transfers: transfers.data ?? [],
    });
  } catch (error) {
    console.error('Loading credit data failed', error);
    return NextResponse.json({ error: 'تعذر تحميل بيانات الرصيد.' }, { status: 500 });
  }
}
