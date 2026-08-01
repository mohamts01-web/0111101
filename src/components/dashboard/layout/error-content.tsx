'use client';

import { useLocale } from '@/components/localization/locale-provider';

export function ErrorContent() {
  const { locale } = useLocale();
  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-6 text-center text-sm">
      {locale === 'ar' ? 'حدث خطأ غير متوقع، حاول مرة أخرى لاحقاً.' : 'Something went wrong. Please try again later.'}
    </div>
  );
}
