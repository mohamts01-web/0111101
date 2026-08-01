import { CheckoutLineItems } from '@/components/checkout/checkout-line-items';
import { CheckoutPriceContainer } from '@/components/checkout/checkout-price-container';
import { CheckoutPriceAmount } from '@/components/checkout/checkout-price-amount';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { CheckoutEventsData } from '@paddle/paddle-js/types/checkout/events';
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

export function PriceSection({
  checkoutData,
  handleQuantityChange,
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
      <div className={'hidden md:block'}>
        <CheckoutPriceContainer price={previewPrice} loading={previewLoading} />
        <CheckoutLineItems
          handleQuantityChange={handleQuantityChange}
          checkoutData={checkoutData}
          quantity={quantity}
          allowQuantity={allowQuantity}
          previewPrice={previewPrice}
          usdPrice={usdPrice}
          sarPrice={sarPrice}
          previewLoading={previewLoading}
        />
      </div>
      <div className={'block md:hidden'}>
        <CheckoutPriceAmount price={previewPrice} loading={previewLoading} />
        <Separator className="mt-6 bg-border" />
        <Accordion type="single" collapsible>
          <AccordionItem className={'border-none'} value="item-1">
            <AccordionTrigger className="text-muted-foreground no-underline!">
              {locale === 'ar' ? 'ملخص الطلب' : 'Order summary'}
            </AccordionTrigger>
            <AccordionContent className={'pb-0'}>
              <CheckoutLineItems
                handleQuantityChange={handleQuantityChange}
                checkoutData={checkoutData}
                quantity={quantity}
                allowQuantity={allowQuantity}
                previewPrice={previewPrice}
                usdPrice={usdPrice}
                sarPrice={sarPrice}
                previewLoading={previewLoading}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </>
  );
}
