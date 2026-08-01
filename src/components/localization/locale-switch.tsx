'use client';

import { Languages } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/components/localization/locale-provider';

export function LocaleSwitch({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLocale();
  const router = useRouter();
  const label = locale === 'ar' ? 'English' : 'العربية';

  function handleLocaleChange() {
    setLocale(locale === 'ar' ? 'en' : 'ar');
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={compact ? 'icon' : 'sm'}
      onClick={handleLocaleChange}
      aria-label={locale === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
      title={label}
    >
      <Languages className="h-4 w-4" aria-hidden="true" />
      {!compact && <span>{label}</span>}
    </Button>
  );
}
