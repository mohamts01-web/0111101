'use client';

import { Bell, Coins, CreditCard, FilePlus2, FileText, Headphones, LetterText, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useLocale } from '@/components/localization/locale-provider';

const sidebarSections = [
  {
    label: { ar: 'المستندات', en: 'Documents' },
    items: [
      { ar: 'سيري الذاتية', en: 'My resumes', icon: FileText, href: '/dashboard' },
      { ar: 'إنشاء سيرة جديدة', en: 'Create new resume', icon: FilePlus2, href: '/dashboard/resumes/new' },
      { ar: 'خطابات التغطية', en: 'Cover letters', icon: LetterText, href: '/dashboard/cover-letters' },
    ],
  },
  {
    label: { ar: 'الباقة والاستخدام', en: 'Plan and usage' },
    items: [
      { ar: 'الرصيد والنقاط', en: 'Credits', icon: Coins, href: '/dashboard/credits' },
      { ar: 'الاشتراك', en: 'Subscription', icon: CreditCard, href: '/dashboard/subscriptions' },
    ],
  },
  {
    label: { ar: 'الحساب', en: 'Account' },
    items: [
      { ar: 'الحساب والفوترة', en: 'Account and billing', icon: Settings, href: '/dashboard/account' },
      { ar: 'الإشعارات', en: 'Notifications', icon: Bell, href: '/dashboard/notifications' },
      { ar: 'الدعم والمقترحات', en: 'Support and feedback', icon: Headphones, href: '/dashboard/support' },
    ],
  },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { locale } = useLocale();

  return (
    <nav className="dashboard-navigation" aria-label={locale === 'ar' ? 'التنقل الرئيسي' : 'Main navigation'}>
      {sidebarSections.map((section) => (
        <section key={section.label.en} className="dashboard-nav-section">
          <p>{section.label[locale]}</p>
          <div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn('dashboard-sidebar-items', active && 'dashboard-sidebar-items-active')}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon />
                  <span>{item[locale]}</span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </nav>
  );
}
