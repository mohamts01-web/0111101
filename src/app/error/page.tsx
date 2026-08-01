import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandMark } from '@/components/brand/brand-mark';
import { BRAND_NAME } from '@/lib/brand';

export const metadata: Metadata = {
  title: `${BRAND_NAME} - خطأ`,
};

export default function ErrorPage() {
  return (
    <main className="min-h-screen bg-background px-6" dir="rtl">
      <div className="mx-auto flex max-w-5xl items-center justify-between py-5">
        <Link href="/" className="flex items-center gap-2 font-bold text-foreground">
          <BrandMark className="h-10 w-10" />
          <span className="brand-wordmark">{BRAND_NAME}</span>
        </Link>
        <ThemeToggle />
      </div>
      <section className="mx-auto mt-[15vh] max-w-lg rounded-lg border border-border bg-card p-8 text-center shadow-sm">
        <AlertCircle className="mx-auto mb-5 h-12 w-12 text-destructive" aria-hidden="true" />
        <h1 className="text-xl font-bold">حدث خطأ غير متوقع</h1>
        <p className="mt-3 text-sm text-muted-foreground">حاول مرة أخرى لاحقاً، أو ارجع إلى الصفحة الرئيسية.</p>
        <Button className="mt-7" asChild>
          <Link href="/">العودة للرئيسية</Link>
        </Button>
      </section>
    </main>
  );
}
