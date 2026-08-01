import { Skeleton } from '@/components/ui/skeleton';
import { useLocale } from '@/components/localization/locale-provider';

export function CheckoutPriceAmount({ price, loading }: { price?: string; loading: boolean }) {
  const { locale } = useLocale();
  return price && !loading ? (
    <div className="flex items-end gap-2 pt-8">
      <span className="text-4xl font-semibold md:text-5xl" dir="ltr">
        {price}
      </span>
      <span className="text-sm text-muted-foreground">{locale === 'ar' ? 'شامل الضريبة' : 'Tax included'}</span>
    </div>
  ) : (
    <Skeleton className="mt-8 h-[48px] w-full bg-border" />
  );
}
