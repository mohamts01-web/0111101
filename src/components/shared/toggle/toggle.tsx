import { BillingFrequency, IBillingFrequency } from '@/constants/billing-frequency';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLocale } from '@/components/localization/locale-provider';

interface Props {
  frequency: IBillingFrequency;
  setFrequency: (frequency: IBillingFrequency) => void;
}

export function Toggle({ setFrequency, frequency }: Props) {
  const { locale } = useLocale();
  return (
    <div className="flex justify-center mb-8">
      <Tabs
        value={frequency.value}
        onValueChange={(value) =>
          setFrequency(BillingFrequency.find((billingFrequency) => value === billingFrequency.value)!)
        }
      >
        <TabsList>
          {BillingFrequency.map((billingFrequency) => (
            <TabsTrigger key={billingFrequency.value} value={billingFrequency.value}>
              {billingFrequency.value === 'month'
                ? locale === 'ar'
                  ? 'شهري'
                  : 'Monthly'
                : locale === 'ar'
                  ? 'سنوي'
                  : 'Yearly'}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
