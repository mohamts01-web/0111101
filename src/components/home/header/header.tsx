'use client';

import Link from 'next/link';
import { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { ArrowLeft, ArrowRight, Languages, Menu } from 'lucide-react';
import { useLocale } from '@/components/localization/locale-provider';
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { usePathname, useRouter } from 'next/navigation';
import { BrandMark } from '@/components/brand/brand-mark';
import { BRAND_NAME } from '@/lib/brand';

interface Props {
  user: User | null;
}

const copy = {
  ar: {
    brand: BRAND_NAME,
    how: 'كيف تعمل',
    templates: 'القوالب',
    capabilities: 'المزايا',
    pricing: 'الباقات',
    login: 'تسجيل الدخول',
    start: 'ابدأ مجاناً',
    dashboard: 'لوحة التحكم',
    menu: 'القائمة الرئيسية',
    language: 'English',
  },
  en: {
    brand: BRAND_NAME,
    how: 'How it works',
    templates: 'Templates',
    capabilities: 'Features',
    pricing: 'Pricing',
    login: 'Sign in',
    start: 'Start free',
    dashboard: 'Dashboard',
    menu: 'Main menu',
    language: 'العربية',
  },
};

export default function Header({ user }: Props) {
  const { locale, setLocale } = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const text = copy[locale];
  const Arrow = locale === 'ar' ? ArrowLeft : ArrowRight;
  const localizedHomePath = pathname === '/ar' || pathname === '/en' ? pathname : '/';
  const navigation = [
    { href: '#how-it-works', label: text.how },
    { href: '#templates', label: text.templates },
    { href: '#capabilities', label: text.capabilities },
    { href: '#pricing', label: text.pricing },
  ];

  function changeLanguage() {
    const nextLocale = locale === 'ar' ? 'en' : 'ar';
    setLocale(nextLocale);
    if (pathname === '/ar' || pathname === '/en') router.replace(`/${nextLocale}`);
  }

  return (
    <nav className="load-nav sticky top-3 z-40 mx-auto w-[calc(100%-1.5rem)] max-w-[1180px] border border-white/10 bg-[#0b0f19]/70 backdrop-blur-xl">
      <div className="container flex h-[68px] items-center justify-between gap-4">
        <div className="flex items-center gap-9">
          <Link className="home-logo flex items-center gap-3" href={localizedHomePath} aria-label={text.brand}>
            <BrandMark className="h-9 w-9" />
            <span className="brand-wordmark text-base">{text.brand}</span>
          </Link>
          <div className="hidden items-center gap-6 text-sm font-medium text-slate-400 lg:flex">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href} className="transition-colors hover:text-white">
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="hidden gap-2 text-slate-300 hover:bg-white/10 hover:text-white sm:inline-flex"
            onClick={changeLanguage}
          >
            <Languages className="h-4 w-4" />
            {text.language}
          </Button>
          <ThemeToggle />
          {user?.id ? (
            <Button asChild className="load-nav-cta hidden sm:inline-flex">
              <Link href="/dashboard">
                {text.dashboard} <Arrow className="h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" className="hidden md:inline-flex">
                <Link href="/login">{text.login}</Link>
              </Button>
              <Button asChild className="load-nav-cta hidden sm:inline-flex">
                <Link href="/resume/new">{text.start}</Link>
              </Button>
            </>
          )}

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label={text.menu}>
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side={locale === 'ar' ? 'left' : 'right'} className="w-[min(88vw,360px)]">
              <SheetHeader className="text-start">
                <SheetTitle className="flex items-center gap-3">
                  <BrandMark className="h-9 w-9" />
                  <span className="brand-wordmark">{text.brand}</span>
                </SheetTitle>
              </SheetHeader>
              <div className="mt-8 grid gap-2">
                {navigation.map((item) => (
                  <SheetClose asChild key={item.href}>
                    <Link className="rounded-md px-3 py-3 text-sm font-bold hover:bg-muted" href={item.href}>
                      {item.label}
                    </Link>
                  </SheetClose>
                ))}
              </div>
              <div className="mt-6 grid gap-2 border-t border-border pt-6">
                <Button variant="outline" className="justify-start gap-2" onClick={changeLanguage}>
                  <Languages className="h-4 w-4" /> {text.language}
                </Button>
                {user?.id ? (
                  <Button asChild>
                    <Link href="/dashboard">{text.dashboard}</Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild>
                      <Link href="/resume/new">{text.start}</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/login">{text.login}</Link>
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
