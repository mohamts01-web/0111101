'use client';

import { LoginForm } from '@/components/authentication/login-form';
import { GhLoginButton } from '@/components/authentication/gh-login-button';
import { ThemeToggle } from '@/components/theme-toggle';
import Link from 'next/link';
import { useLocale } from '@/components/localization/locale-provider';
import { Button } from '@/components/ui/button';
import { Languages } from 'lucide-react';
import { BrandMark } from '@/components/brand/brand-mark';
import { BRAND_NAME } from '@/lib/brand';

export default function LoginPage() {
  const { locale, setLocale } = useLocale();
  return (
    <main className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <BrandMark className="h-10 w-10" />
          <span className="brand-wordmark">{BRAND_NAME}</span>
        </Link>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}>
            <Languages className="h-4 w-4" /> {locale === 'ar' ? 'English' : 'العربية'}
          </Button>
          <ThemeToggle />
        </div>
      </div>
      <div className="mx-auto mt-12 w-full max-w-md rounded-lg border border-border bg-card shadow-md md:mt-20">
        <LoginForm />
        <GhLoginButton label={locale === 'ar' ? 'الدخول عبر GitHub' : 'Continue with GitHub'} />
        <div className="px-6 pb-8 text-center text-sm text-muted-foreground md:px-10">
          {locale === 'ar' ? 'ما عندك حساب؟' : 'New here?'}{' '}
          <Link href="/signup" className="font-bold text-primary">
            {locale === 'ar' ? 'افتح حسابك' : 'Create an account'}
          </Link>
        </div>
      </div>
    </main>
  );
}
