import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { LocaleSwitch } from '@/components/localization/locale-switch';
import { getRequestLocale } from '@/lib/server-locale';
import type { Metadata } from 'next';
import { BrandMark } from '@/components/brand/brand-mark';
import { BRAND_NAME } from '@/lib/brand';

export const metadata: Metadata = {
  title: `Welcome | ${BRAND_NAME}`,
  robots: { index: false, follow: false, nocache: true },
};

const copy = {
  ar: {
    eyebrow: 'تم تفعيل الاشتراك',
    title: `مرحباً بك في ${BRAND_NAME}`,
    description: 'تم الدفع بنجاح. يجري الآن تفعيل مزايا باقتك، ويمكنك متابعة العمل من لوحة التحكم.',
    action: 'الانتقال إلى لوحة التحكم',
  },
  en: {
    eyebrow: 'Subscription activated',
    title: `Welcome to ${BRAND_NAME}`,
    description:
      'Your payment was successful. Your plan benefits are being activated and you can continue from your dashboard.',
    action: 'Go to dashboard',
  },
} as const;

export default async function WelcomePage() {
  const locale = await getRequestLocale();
  const t = copy[locale];

  return (
    <main className="min-h-screen bg-background px-6">
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
      <section className="mx-auto mt-[15vh] max-w-xl rounded-lg border border-border bg-card p-8 text-center shadow-sm md:p-12">
        <CheckCircle2 className="mx-auto mb-6 h-14 w-14 text-primary" aria-hidden="true" />
        <p className="mb-3 text-sm font-semibold text-primary">{t.eyebrow}</p>
        <h1 className="text-3xl font-semibold">{t.title}</h1>
        <p className="mt-4 text-muted-foreground">{t.description}</p>
        <Button className="mt-8" asChild>
          <Link href="/dashboard">{t.action}</Link>
        </Button>
      </section>
    </main>
  );
}
