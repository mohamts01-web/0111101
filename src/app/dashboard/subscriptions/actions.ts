'use server';

import { revalidatePath } from 'next/cache';
import { getPaddleInstance } from '@/utils/paddle/get-paddle-instance';
import { createClient } from '@/utils/supabase/server';

const paddle = getPaddleInstance();

export async function cancelSubscription(
  subscriptionId: string,
): Promise<{ success: true; status: string } | { error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: 'يجب تسجيل الدخول أولاً.' };

    const { data: customer } = await supabase
      .from('customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!customer) return { error: 'الاشتراك غير موجود أو لا يخص هذا الحساب.' };

    const { data: ownedSubscription } = await supabase
      .from('subscriptions')
      .select('subscription_id')
      .eq('subscription_id', subscriptionId)
      .eq('customer_id', customer.customer_id)
      .maybeSingle();
    if (!ownedSubscription) return { error: 'الاشتراك غير موجود أو لا يخص هذا الحساب.' };

    const subscription = await paddle.subscriptions.cancel(ownedSubscription.subscription_id, {
      effectiveFrom: 'immediately',
    });
    revalidatePath('/dashboard/subscriptions');
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/account');
    return { success: true, status: subscription.status };
  } catch (error) {
    console.error('Error canceling subscription', error);
    return { error: 'تعذر إلغاء الاشتراك، يرجى المحاولة لاحقًا.' };
  }
}
