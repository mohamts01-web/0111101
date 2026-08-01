import { CheckoutHeader } from '@/components/checkout/checkout-header';
import { CheckoutContents } from '@/components/checkout/checkout-contents';
import { createClient } from '@/utils/supabase/server';
import { headers } from 'next/headers';
import { PricingTier } from '@/constants/pricing-tier';
import { redirect } from 'next/navigation';

export default async function CheckoutPage({ params }: { params: Promise<{ priceId: string }> }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(`/login?next=${encodeURIComponent(`/checkout/${(await params).priceId}`)}`);
  const { priceId } = await params;
  const requestHeaders = await headers();
  const country = requestHeaders.get('x-vercel-ip-country') ?? undefined;
  const tier = PricingTier.find((item) => item.priceId === priceId);
  const { data: creditProduct } = tier
    ? { data: null }
    : await supabase.from('credit_products').select('price_sar').eq('paddle_price_id', priceId).maybeSingle();
  const sarReference = tier ? `${tier.priceSar} SAR` : creditProduct ? `${creditProduct.price_sar} SAR` : undefined;
  return (
    <main className="min-h-screen w-full bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 md:px-8 md:py-8">
        <CheckoutHeader />
        <CheckoutContents userEmail={data.user?.email} country={country} sarReference={sarReference} />
      </div>
    </main>
  );
}
