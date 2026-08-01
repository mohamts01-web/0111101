'use client';

import { ReactNode, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Coins, FileText, Languages, Sparkles } from 'lucide-react';
import { Sidebar } from '@/components/dashboard/layout/sidebar';
import { SidebarUserInfo } from '@/components/dashboard/layout/sidebar-user-info';
import { ThemeToggle } from '@/components/theme-toggle';
import { MobileSidebar } from '@/components/dashboard/layout/mobile-sidebar';
import { BrandMark } from '@/components/brand/brand-mark';
import { useLocale } from '@/components/localization/locale-provider';
import { Button } from '@/components/ui/button';
import { BRAND_NAME, CV_PRODUCT_NAME } from '@/lib/brand';
import '../../../styles/dashboard.css';
import '../../../styles/dashboard-modern.css';

interface Props {
  children: ReactNode;
}

type ChromeStatus = {
  totalCredits: number;
  plan: string;
};

const pageNames = {
  ar: {
    default: 'مساحة المستندات',
    coverLetters: 'خطابات التغطية',
    credits: 'الرصيد والنقاط',
    subscription: 'الاشتراك',
    account: 'الحساب والفوترة',
    notifications: 'الإشعارات',
    support: 'الدعم والمقترحات',
    points: 'نقطة',
    upgrade: 'ترقية الباقة',
    brand: BRAND_NAME,
    product: CV_PRODUCT_NAME,
    switchLanguage: 'Switch to English',
  },
  en: {
    default: 'Documents workspace',
    coverLetters: 'Cover letters',
    credits: 'Credits',
    subscription: 'Subscription',
    account: 'Account and billing',
    notifications: 'Notifications',
    support: 'Support and feedback',
    points: 'credits',
    upgrade: 'Upgrade plan',
    brand: BRAND_NAME,
    product: CV_PRODUCT_NAME,
    switchLanguage: 'التبديل إلى العربية',
  },
} as const;

export function DashboardLayout({ children }: Props) {
  const pathname = usePathname();
  const { locale, toggleLocale } = useLocale();
  const text = pageNames[locale];
  const [status, setStatus] = useState<ChromeStatus | null>(null);

  useEffect(() => {
    let active = true;
    void fetch('/api/credits')
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as { entitlement?: ChromeStatus };
        if (active) setStatus(payload.entitlement ?? null);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const currentPage = useMemo(() => {
    if (pathname.startsWith('/dashboard/cover-letters')) return text.coverLetters;
    if (pathname.startsWith('/dashboard/credits')) return text.credits;
    if (pathname.startsWith('/dashboard/subscriptions')) return text.subscription;
    if (pathname.startsWith('/dashboard/account')) return text.account;
    if (pathname.startsWith('/dashboard/notifications')) return text.notifications;
    if (pathname.startsWith('/dashboard/support')) return text.support;
    return text.default;
  }, [pathname, text]);

  if (pathname.startsWith('/dashboard/resumes/')) return <div className="min-h-screen w-full">{children}</div>;

  return (
    <div className="dashboard-app-shell">
      <aside className="dashboard-rail">
        <div className="dashboard-brand-row">
          <Link href="/dashboard" className="dashboard-brand-link">
            <BrandMark className="dashboard-brand-mark" />
            <span>
              <strong className="brand-wordmark">{text.brand}</strong>
              <small className="brand-wordmark">{text.product}</small>
            </span>
          </Link>
        </div>
        <div className="dashboard-rail-content">
          <Sidebar />
          <SidebarUserInfo />
        </div>
      </aside>

      <div className="dashboard-main-shell">
        <header className="dashboard-topbar">
          <div className="dashboard-mobile-brand">
            <BrandMark />
            <strong className="brand-wordmark">{text.brand}</strong>
          </div>
          <div className="dashboard-page-context">
            <span>
              <FileText />
            </span>
            <div>
              <small className="brand-wordmark">{text.brand}</small>
              <strong>{currentPage}</strong>
            </div>
          </div>
          <div className="dashboard-top-actions">
            <Link
              href="/dashboard/credits"
              className="dashboard-credit-pill"
              aria-label={`${status?.totalCredits ?? 0} ${text.points}`}
              title={`${status?.totalCredits ?? 0} ${text.points}`}
            >
              <Coins />
              <span>{status?.totalCredits ?? 0}</span>
              <small>{text.points}</small>
            </Link>
            <Button asChild size="sm" className="dashboard-upgrade-button">
              <Link href="/#pricing" aria-label={text.upgrade} title={text.upgrade}>
                <Sparkles />
                <span>{text.upgrade}</span>
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon" aria-label={text.notifications} title={text.notifications}>
              <Link href="/dashboard/notifications">
                <Bell />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleLocale} aria-label={text.switchLanguage}>
              <Languages />
            </Button>
            <ThemeToggle />
            <MobileSidebar />
          </div>
        </header>
        <main className="dashboard-content">{children}</main>
      </div>
    </div>
  );
}
