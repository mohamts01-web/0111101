import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/server';
import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { LocaleSwitch } from '@/components/localization/locale-switch';
import { getRequestLocale } from '@/lib/server-locale';
import { BrandMark } from '@/components/brand/brand-mark';
import { BRAND_NAME } from '@/lib/brand';

const copy = {
  ar: {
    eyebrow: 'اكتملت العملية',
    title: 'تم الدفع بنجاح',
    description: 'اكتملت عملية الدفع، ويمكنك متابعة العمل من لوحة التحكم.',
    dashboard: 'الذهاب إلى لوحة التحكم',
    home: 'العودة للرئيسية',
    secure: 'تتم معالجة الفوترة والمدفوعات بأمان عبر Paddle.',
  },
  en: {
    eyebrow: 'Payment complete',
    title: 'Payment successful',
    description: 'Your payment is complete. You can continue working from your dashboard.',
    dashboard: 'Go to dashboard',
    home: 'Return home',
    secure: 'Billing and payments are processed securely by Paddle.',
  },
} as const;

export default async function SuccessPage() {
  const locale = await getRequestLocale();
  const t = copy[locale];
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-background px-4">
      <div className="mx-auto flex max-w-5xl items-center justify-between py-5">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-foreground"
          aria-label={locale === 'ar' ? 'الرئيسية' : 'Home'}
        >
          <BrandMark className="h-10 w-10" />
          <span className="brand-wordmark">{BRAND_NAME}</span>
        </Link>
        <div className="flex items-center gap-2">
          <LocaleSwitch />
          <ThemeToggle />
        </div>
      </div>
      <div className="mx-auto flex min-h-[75vh] max-w-xl items-center justify-center">
        <section className="w-full rounded-lg border border-border bg-card p-8 text-center shadow-sm md:p-12">
          <CheckCircle2 className="mx-auto mb-6 h-14 w-14 text-primary" aria-hidden="true" />
          <p className="mb-3 text-sm font-semibold text-primary">{t.eyebrow}</p>
          <h1 className="text-3xl font-semibold md:text-4xl">{t.title}</h1>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">{t.description}</p>
          <Button className="mt-8" asChild>
            {data.user ? <Link href="/dashboard">{t.dashboard}</Link> : <Link href="/">{t.home}</Link>}
          </Button>
          <p className="mt-6 text-xs text-muted-foreground">{t.secure}</p>
        </section>
      </div>
    </main>
  );
}
