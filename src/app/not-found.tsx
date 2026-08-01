import Link from 'next/link';
import { BrandMark } from '@/components/brand/brand-mark';
import { LocaleSwitch } from '@/components/localization/locale-switch';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { getRequestLocale } from '@/lib/server-locale';
import { BRAND_NAME } from '@/lib/brand';

export default async function NotFoundPage() {
  const locale = await getRequestLocale();
  const text =
    locale === 'ar'
      ? {
          brand: BRAND_NAME,
          code: '404',
          title: 'الصفحة غير موجودة',
          body: 'قد يكون الرابط قديمًا أو تم نقل الصفحة إلى مكان آخر.',
          action: 'العودة إلى الرئيسية',
        }
      : {
          brand: BRAND_NAME,
          code: '404',
          title: 'Page not found',
          body: 'This link may be outdated or the page may have moved.',
          action: 'Return home',
        };

  return (
    <main className="min-h-screen bg-background px-6">
      <header className="mx-auto flex max-w-5xl items-center justify-between py-5">
        <Link href="/" className="flex items-center gap-2 font-bold text-foreground">
          <BrandMark className="h-10 w-10" />
          <span className="brand-wordmark">{text.brand}</span>
        </Link>
        <div className="flex items-center gap-2">
          <LocaleSwitch />
          <ThemeToggle />
        </div>
      </header>
      <section className="mx-auto mt-[14vh] max-w-lg text-center">
        <p className="text-sm font-bold text-primary">{text.code}</p>
        <h1 className="mt-3 text-3xl font-extrabold md:text-4xl">{text.title}</h1>
        <p className="mt-4 text-muted-foreground">{text.body}</p>
        <Button className="mt-8" asChild>
          <Link href="/">{text.action}</Link>
        </Button>
      </section>
    </main>
  );
}
