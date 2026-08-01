'use client';

import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Languages, Menu } from 'lucide-react';
import { Sidebar } from '@/components/dashboard/layout/sidebar';
import { SidebarUserInfo } from '@/components/dashboard/layout/sidebar-user-info';
import { ThemeToggle } from '@/components/theme-toggle';
import Link from 'next/link';
import { useLocale } from '@/components/localization/locale-provider';
import { BrandMark } from '@/components/brand/brand-mark';
import { BRAND_NAME } from '@/lib/brand';

export function MobileSidebar() {
  const { locale, toggleLocale } = useLocale();
  const brand = BRAND_NAME;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="dashboard-menu-trigger">
          <Menu />
          <span className="sr-only">{locale === 'ar' ? 'فتح قائمة التنقل' : 'Open navigation menu'}</span>
        </Button>
      </SheetTrigger>
      <SheetContent side={locale === 'ar' ? 'right' : 'left'} className="dashboard-mobile-sheet">
        <div className="dashboard-mobile-sheet-header">
          <Link href="/dashboard" className="dashboard-brand-link">
            <BrandMark />
            <strong className="brand-wordmark">{brand}</strong>
          </Link>
          <div>
            <Button variant="ghost" size="icon" onClick={toggleLocale}>
              <Languages />
            </Button>
            <ThemeToggle />
          </div>
        </div>
        <div className="dashboard-mobile-sheet-body">
          <Sidebar />
          <SidebarUserInfo />
        </div>
      </SheetContent>
    </Sheet>
  );
}
