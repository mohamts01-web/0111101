'use client';

import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { ArrowLeft, ArrowRight, Languages } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from '@/components/localization/locale-provider';
import { BrandMark } from '@/components/brand/brand-mark';
import { BRAND_NAME } from '@/lib/brand';

export function CheckoutHeader() {
  const { locale, setLocale } = useLocale();
  const BackIcon = locale === 'ar' ? ArrowRight : ArrowLeft;

  return (
    <header className="flex items-center justify-between gap-4 border-b border-border pb-5">
      <div className="flex items-center gap-3">
        <BrandMark className="h-10 w-10" />
        <div>
          <p className="brand-wordmark">{BRAND_NAME}</p>
          <p className="text-xs text-muted-foreground">
            {locale === 'ar' ? 'إتمام الاشتراك بأمان' : 'Secure checkout'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
          aria-label={locale === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
          title={locale === 'ar' ? 'English' : 'العربية'}
        >
          <Languages className="h-4 w-4" />
        </Button>
        <ThemeToggle />
        <Button variant="ghost" size="icon" asChild>
          <Link href="/" aria-label={locale === 'ar' ? 'العودة إلى الرئيسية' : 'Return home'}>
            <BackIcon className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </header>
  );
}
