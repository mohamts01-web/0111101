import { Tier } from '@/constants/pricing-tier';
import { Skeleton } from '@/components/ui/skeleton';
import type { PaddlePriceMaps } from '@/hooks/usePaddlePrices';
import { useLocale } from '@/components/localization/locale-provider';

export function PriceAmount({ loading, priceMap, tier }: { loading: boolean; tier: Tier; priceMap: PaddlePriceMaps }) {
  const { locale } = useLocale();
  const usd = priceMap.usd[tier.priceId] ?? priceMap.local[tier.priceId];
  return (
    <div className="mt-2 flex min-h-[104px] flex-col px-6">
      <div className="flex items-end gap-2" dir="rtl">
        <strong className="text-4xl leading-none">{tier.priceSar.toFixed(tier.priceSar % 1 ? 2 : 0)}</strong>
        <span className="pb-1 text-base font-bold">{locale === 'ar' ? 'ر.س.' : 'SAR'}</span>
      </div>
      <span className="mt-2 text-xs font-medium text-muted-foreground">
        {locale === 'ar' ? tier.periodAr : tier.periodEn}
      </span>
      {loading ? (
        <Skeleton className="mt-3 h-4 w-24" />
      ) : (
        <span className="mt-3 text-xs text-muted-foreground" dir="ltr">
          {usd ? `${usd} USD` : locale === 'ar' ? 'يظهر الإجمالي بالدولار عند الدفع' : 'USD total appears at checkout'}
        </span>
      )}
    </div>
  );
}
