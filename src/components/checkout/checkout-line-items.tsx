import { QuantityField } from '@/components/checkout/quantity-field';
import { Separator } from '@/components/ui/separator';
import { CheckoutEventsData } from '@paddle/paddle-js/types/checkout/events';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocale } from '@/components/localization/locale-provider';

interface Props {
  checkoutData: CheckoutEventsData | null;
  quantity: number;
  handleQuantityChange: (quantity: number) => void;
  allowQuantity: boolean;
  previewPrice?: string;
  usdPrice?: string;
  sarPrice?: string;
  previewLoading: boolean;
}

export function CheckoutLineItems({
  handleQuantityChange,
  checkoutData,
  quantity,
  allowQuantity,
  previewPrice,
  usdPrice,
  sarPrice,
  previewLoading,
}: Props) {
  const { locale } = useLocale();
  return (
    <>
      <div className="pt-6 text-base font-medium md:pt-12">{checkoutData?.items?.[0]?.price_name}</div>
      {allowQuantity && <QuantityField quantity={quantity} handleQuantityChange={handleQuantityChange} />}
      <Separator className="mt-6 bg-border/50" />
      <div className="flex justify-between gap-4 pt-6">
        <span className="text-base font-medium text-muted-foreground">
          {locale === 'ar' ? 'الإجمالي من Paddle' : 'Paddle total'}
        </span>
        {previewLoading || !previewPrice ? (
          <Skeleton className="h-5 w-24 bg-border" />
        ) : (
          <strong dir="ltr">{previewPrice}</strong>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span>
          {locale === 'ar' ? 'تقريباً بالريال' : 'Approx. SAR'}: <b dir="ltr">{sarPrice ?? '—'}</b>
        </span>
        <span>
          {locale === 'ar' ? 'بالدولار من Paddle' : 'USD from Paddle'}: <b dir="ltr">{usdPrice ?? '—'}</b>
        </span>
      </div>
    </>
  );
}
