import { Tier } from '@/constants/pricing-tier';
import { CircleCheck } from 'lucide-react';
import { useLocale } from '@/components/localization/locale-provider';

interface Props {
  tier: Tier;
}

export function FeaturesList({ tier }: Props) {
  const { locale } = useLocale();
  const features = locale === 'ar' ? tier.features : tier.featuresEn;
  return (
    <ul className="flex flex-col gap-3 p-6">
      {features.map((feature: string) => (
        <li key={feature} className="flex gap-x-3">
          <CircleCheck className="h-5 w-5 shrink-0 text-primary" />
          <span className="text-sm leading-6">{feature}</span>
        </li>
      ))}
    </ul>
  );
}
