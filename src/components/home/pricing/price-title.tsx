import { Tier } from '@/constants/pricing-tier';
import { useLocale } from '@/components/localization/locale-provider';

interface Props {
  tier: Tier;
}

export function PriceTitle({ tier }: Props) {
  const { name, featured } = tier;
  const { locale } = useLocale();
  const localizedName = {
    Trial: locale === 'ar' ? 'التجريبية الأساسية' : 'Trial',
    'Basic Plus': locale === 'ar' ? 'الأساسية بلس' : 'Basic Plus',
    Advanced: locale === 'ar' ? 'المتقدمة' : 'Advanced',
  }[name];
  return (
    <div className="flex h-20 items-center justify-between px-6 pt-3">
      <p className="text-xl font-bold">{localizedName}</p>
      {featured && (
        <div className="rounded bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">
          {locale === 'ar' ? 'الأكثر اختياراً' : 'Most popular'}
        </div>
      )}
    </div>
  );
}
