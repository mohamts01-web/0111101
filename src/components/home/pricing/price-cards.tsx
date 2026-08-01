import { PricingTier } from '@/constants/pricing-tier';
import { FeaturesList } from '@/components/home/pricing/features-list';
import { PriceAmount } from '@/components/home/pricing/price-amount';
import { Button } from '@/components/ui/button';
import { PriceTitle } from '@/components/home/pricing/price-title';
import { Separator } from '@/components/ui/separator';
import type { Paddle } from '@paddle/paddle-js';
import type { PaddlePriceMaps } from '@/hooks/usePaddlePrices';
import { useLocale } from '@/components/localization/locale-provider';
import { Building2, CreditCard } from 'lucide-react';
import Link from 'next/link';

interface Props {
  loading: boolean;
  priceMap: PaddlePriceMaps;
  paddle?: Paddle;
  userEmail?: string;
  checkoutDisabled?: boolean;
}

export function PriceCards({ loading, priceMap, userEmail, checkoutDisabled = false }: Props) {
  const { locale } = useLocale();
  const subscribe = (priceId: string) => {
    if (!userEmail) {
      window.location.assign(`/signup?next=${encodeURIComponent('/#pricing')}`);
      return;
    }
    window.location.assign(`/checkout/${priceId}`);
  };

  return (
    <div className="pricing-grid mx-auto grid w-full grid-cols-1 gap-4 lg:grid-cols-3">
      {PricingTier.map((tier) => (
        <article
          key={tier.id}
          className={`pricing-card relative flex min-h-[520px] flex-col overflow-hidden rounded-lg border bg-card ${tier.featured ? 'featured border-primary' : 'border-border'}`}
        >
          <div className="flex flex-col gap-5">
            <PriceTitle tier={tier} />
            <PriceAmount loading={loading} tier={tier} priceMap={priceMap} />
            <div className="px-6">
              <Separator className="bg-border" />
            </div>
            <p className="px-6 text-sm leading-7 text-muted-foreground">
              {locale === 'ar' ? tier.description : tier.descriptionEn}
            </p>
          </div>
          <div className="mt-7 grid gap-2 px-6">
            <Button
              variant={tier.featured ? 'default' : 'outline'}
              disabled={checkoutDisabled || loading}
              onClick={() => subscribe(tier.priceId)}
            >
              <CreditCard className="h-4 w-4" />
              {checkoutDisabled
                ? locale === 'ar'
                  ? 'لديك باقة فعالة'
                  : 'Active plan'
                : locale === 'ar'
                  ? 'الدفع الإلكتروني'
                  : 'Pay online'}
            </Button>
            <Button asChild variant="ghost">
              <Link href={`/dashboard/credits?bank=subscription&plan=${tier.entitlementPlan}`}>
                <Building2 className="h-4 w-4" /> {locale === 'ar' ? 'تحويل بنكي' : 'Bank transfer'}
              </Link>
            </Button>
          </div>
          <FeaturesList tier={tier} />
        </article>
      ))}
    </div>
  );
}
