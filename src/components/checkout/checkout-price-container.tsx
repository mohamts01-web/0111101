import { CheckoutPriceAmount } from '@/components/checkout/checkout-price-amount';
import { useLocale } from '@/components/localization/locale-provider';

export function CheckoutPriceContainer({ price, loading }: { price?: string; loading: boolean }) {
  const { locale } = useLocale();
  return (
    <>
      <div className="text-base font-semibold leading-5">{locale === 'ar' ? 'ملخص الطلب' : 'Order summary'}</div>
      <CheckoutPriceAmount price={price} loading={loading} />
    </>
  );
}
