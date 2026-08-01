import { createClient } from '@/utils/supabase/server';
import { getPaddleInstance } from '@/utils/paddle/get-paddle-instance';

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return Response.json({ error: 'NEXT_PUBLIC_APP_URL is not configured.' }, { status: 500 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.redirect(new URL('/login', appUrl), 303);
  }

  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (customerError) {
    return Response.json({ error: 'تعذر تحميل حساب الفوترة.' }, { status: 500 });
  }
  if (!customer) {
    return Response.redirect(new URL('/dashboard/account?portal=unavailable', appUrl), 303);
  }

  const { data: subscriptions, error: subscriptionsError } = await supabase
    .from('subscriptions')
    .select('subscription_id')
    .eq('customer_id', customer.customer_id);

  if (subscriptionsError) {
    return Response.json({ error: 'تعذر تحميل اشتراكات الحساب.' }, { status: 500 });
  }

  try {
    const portalSession = await getPaddleInstance().customerPortalSessions.create(
      customer.customer_id,
      subscriptions?.map((subscription) => subscription.subscription_id) ?? [],
    );
    return Response.redirect(portalSession.urls.general.overview, 303);
  } catch (error) {
    console.error('Unable to create Paddle customer portal session.', error);
    return Response.redirect(new URL('/dashboard/account?portal=error', appUrl), 303);
  }
}
