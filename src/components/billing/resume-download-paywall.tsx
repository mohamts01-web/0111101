'use client';

import { useEffect, useState } from 'react';
import { type Environments, initializePaddle, type Paddle } from '@paddle/paddle-js';
import { Building2, Check, CreditCard, LockKeyhole } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PricingTier } from '@/constants/pricing-tier';
import { usePaddlePrices } from '@/hooks/usePaddlePrices';
import { useLocale } from '@/components/localization/locale-provider';

export function ResumeDownloadPaywall({
  open,
  onOpenChange,
  isGuest,
  draftId,
  userEmail,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isGuest: boolean;
  draftId: string;
  userEmail?: string;
}) {
  const { locale } = useLocale();
  const [paddle, setPaddle] = useState<Paddle>();
  const { prices, loading } = usePaddlePrices(paddle);

  useEffect(() => {
    if (!open || isGuest || paddle) return;
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    const environment = process.env.NEXT_PUBLIC_PADDLE_ENV;
    if (!token || !environment) return;
    void initializePaddle({ token, environment: environment as Environments }).then(
      (instance) => instance && setPaddle(instance),
    );
  }, [isGuest, open, paddle]);

  const next = `/dashboard/resumes/new?draft=${draftId}`;
  function checkout(priceId: string) {
    if (!paddle) return;
    paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      ...(userEmail && { customer: { email: userEmail } }),
      settings: { displayMode: 'overlay', variant: 'one-page', successUrl: `${window.location.origin}${next}` },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92vh] max-w-5xl overflow-y-auto [&>button]:left-4 [&>button]:right-auto"
        dir={locale === 'ar' ? 'rtl' : 'ltr'}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <LockKeyhole className="h-6 w-6 text-primary" />
            {locale === 'ar' ? 'سيرتك جاهزة للتنزيل' : 'Your resume is ready to download'}
          </DialogTitle>
          <DialogDescription>
            {isGuest
              ? locale === 'ar'
                ? 'أنشئ حساباً لحفظ مسودتك، ثم اختر مدة الوصول المناسبة. لن تفقد البيانات التي كتبتها.'
                : 'Create an account to preserve your draft, then choose an access period.'
              : locale === 'ar'
                ? 'اختر إحدى الباقات لتنزيل PDF بلا علامة مائية والاستفادة من أدوات LOAD.'
                : 'Choose a plan to download a watermark-free PDF and use LOAD tools.'}
          </DialogDescription>
        </DialogHeader>
        {isGuest ? (
          <div className="grid gap-3 py-8 sm:grid-cols-2">
            <Button asChild size="lg">
              <Link href={`/signup?next=${encodeURIComponent(next)}`}>
                {locale === 'ar' ? 'إنشاء حساب والمتابعة' : 'Create account and continue'}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href={`/login?next=${encodeURIComponent(next)}`}>
                {locale === 'ar' ? 'لدي حساب' : 'I have an account'}
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 py-4 lg:grid-cols-3">
            {PricingTier.map((tier) => (
              <article
                key={tier.id}
                className={`flex flex-col rounded-md border p-5 ${tier.featured ? 'border-primary bg-primary/5' : 'bg-card'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-bold">
                    {locale === 'ar'
                      ? tier.id === 'trial'
                        ? 'التجريبية الأساسية'
                        : tier.id === 'plus'
                          ? 'الأساسية بلس'
                          : 'المتقدمة'
                      : tier.name}
                  </h3>
                  {tier.featured && (
                    <span className="rounded bg-primary px-2 py-1 text-[11px] font-bold text-primary-foreground">
                      {locale === 'ar' ? 'الأكثر اختياراً' : 'Popular'}
                    </span>
                  )}
                </div>
                <div className="mt-5 flex items-end gap-1">
                  <strong className="text-3xl">{tier.priceSar}</strong>
                  <b>{locale === 'ar' ? 'ر.س.' : 'SAR'}</b>
                </div>
                <span className="mt-1 text-xs text-muted-foreground" dir="ltr">
                  {loading ? '...' : prices.usd[tier.priceId] ? `${prices.usd[tier.priceId]} USD` : 'USD at checkout'}
                </span>
                <span className="mt-1 text-xs text-muted-foreground">
                  {locale === 'ar' ? tier.periodAr : tier.periodEn}
                </span>
                <ul className="my-5 space-y-2 text-sm">
                  {(locale === 'ar' ? tier.features : tier.featuresEn).slice(0, 3).map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto grid gap-2">
                  <Button onClick={() => checkout(tier.priceId)} disabled={!paddle || loading}>
                    <CreditCard className="h-4 w-4" />
                    {locale === 'ar' ? 'الدفع عبر Paddle' : 'Pay with Paddle'}
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/dashboard/credits?bank=subscription&plan=${tier.entitlementPlan}`}>
                      <Building2 className="h-4 w-4" />
                      {locale === 'ar' ? 'تحويل بنكي' : 'Bank transfer'}
                    </Link>
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {locale === 'ar'
            ? 'الأسعار بالريال مرجعية أساسية. Paddle يعرض ويحصّل القيمة الفعلية بالدولار وقد يحسب الضرائب المحلية.'
            : 'SAR prices are the primary reference. Paddle charges the displayed USD total and may calculate local taxes.'}
        </p>
      </DialogContent>
    </Dialog>
  );
}
