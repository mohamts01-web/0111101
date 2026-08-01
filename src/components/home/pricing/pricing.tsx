import { PriceCards } from '@/components/home/pricing/price-cards';
import { useEffect, useState } from 'react';
import { Environments, initializePaddle, Paddle } from '@paddle/paddle-js';
import { usePaddlePrices } from '@/hooks/usePaddlePrices';
import Link from 'next/link';
import { useLocale } from '@/components/localization/locale-provider';

export function Pricing({ country, userEmail }: { country?: string; userEmail?: string }) {
  const { locale } = useLocale();
  const [paddle, setPaddle] = useState<Paddle>();
  const [currentAccessUntil, setCurrentAccessUntil] = useState<string | null>(null);
  const [hasCurrentAccess, setHasCurrentAccess] = useState(false);
  const { prices, loading, error } = usePaddlePrices(paddle, country);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    const environment = process.env.NEXT_PUBLIC_PADDLE_ENV;
    if (!token || !environment) throw new Error('Paddle client environment is not configured.');
    void initializePaddle({ token, environment: environment as Environments }).then((instance) => {
      if (!instance) throw new Error('Paddle.js initialization failed.');
      setPaddle(instance);
    });
  }, []);

  useEffect(() => {
    if (!userEmail) return;
    void fetch('/api/credits').then(async (response) => {
      if (!response.ok) return;
      const payload = (await response.json()) as {
        entitlement?: { hasPaidAccess?: boolean; accessUntil?: string | null };
      };
      setCurrentAccessUntil(payload.entitlement?.accessUntil ?? null);
      setHasCurrentAccess(Boolean(payload.entitlement?.hasPaidAccess));
    });
  }, [userEmail]);

  return (
    <section id="pricing" className="home-pricing container scroll-mt-24 py-20 md:py-28">
      <div className="home-section-heading">
        <p>{locale === 'ar' ? 'باقات LOAD' : 'LOAD plans'}</p>
        <h2>{locale === 'ar' ? 'اختر المدة التي تناسب رحلتك' : 'Choose the access period that fits your journey'}</h2>
        <span>
          {locale === 'ar'
            ? 'الريال هو السعر المرجعي الأساسي، ويعرض Paddle قيمة الدفع الفعلية بالدولار.'
            : 'SAR is the primary reference; Paddle shows the actual USD charge.'}
        </span>
      </div>
      <p className="mb-8 mt-4 text-center text-xs leading-6 text-muted-foreground">
        {locale === 'ar'
          ? 'قد يحسب Paddle الضرائب المحلية عند الدفع حسب موقع العميل.'
          : 'Paddle may calculate local taxes at checkout based on customer location.'}
      </p>
      {hasCurrentAccess && (
        <div className="mx-auto mb-8 flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-accent px-4 py-3 text-sm text-accent-foreground">
          <span>
            {locale === 'ar' ? 'لديك وصول فعّال' : 'You already have active access'}
            {currentAccessUntil
              ? ` ${locale === 'ar' ? 'حتى' : 'until'} ${new Date(currentAccessUntil).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US')}`
              : ''}
            .
          </span>
          <Link href="/dashboard/subscriptions" className="font-bold underline underline-offset-4">
            {locale === 'ar' ? 'إدارة الاشتراك' : 'Manage subscription'}
          </Link>
        </div>
      )}
      {error && <p className="mb-6 text-sm text-destructive">{error}</p>}
      <PriceCards
        loading={loading}
        priceMap={prices}
        paddle={paddle}
        userEmail={userEmail}
        checkoutDisabled={hasCurrentAccess}
      />
    </section>
  );
}
