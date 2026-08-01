import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/components/localization/locale-provider';

interface Props {
  quantity: number;
  handleQuantityChange: (quantity: number) => void;
}

export function QuantityField({ handleQuantityChange, quantity }: Props) {
  const { locale } = useLocale();
  return (
    <div className="mt-3 flex w-fit items-center gap-1 rounded-md border border-border bg-background p-1.5">
      <Button
        disabled={quantity === 1}
        variant={'secondary'}
        className={
          'h-8 w-8 rounded-sm border-border bg-secondary p-0 text-secondary-foreground disabled:bg-transparent'
        }
        onClick={() => handleQuantityChange(quantity - 1)}
        aria-label={locale === 'ar' ? 'تقليل الكمية' : 'Decrease quantity'}
      >
        <Minus />
      </Button>
      <span className="w-14 rounded-sm bg-muted px-2 py-1 text-center text-xs leading-6">{quantity}</span>
      <Button
        variant={'secondary'}
        className="h-8 w-8 rounded-sm border-border bg-secondary p-0 text-secondary-foreground"
        onClick={() => handleQuantityChange(quantity + 1)}
        aria-label={locale === 'ar' ? 'زيادة الكمية' : 'Increase quantity'}
      >
        <Plus />
      </Button>
    </div>
  );
}
