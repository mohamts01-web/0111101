import Image from 'next/image';
import { cn } from '@/lib/utils';

interface BrandMarkProps {
  className?: string;
}

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <span className={cn('brand-mark', className)} aria-hidden="true">
      <Image src="/brand/platform-mark.png" alt="" width={96} height={96} priority />
    </span>
  );
}
