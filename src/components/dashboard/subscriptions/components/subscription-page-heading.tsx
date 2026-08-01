'use client';

import { ArrowUpRight, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from '@/components/localization/locale-provider';
import { Button } from '@/components/ui/button';

export function SubscriptionPageHeading() {
  const { locale } = useLocale();
  const text =
    locale === 'ar'
      ? {
          eyebrow: 'الباقة والفوترة',
          title: 'إدارة اشتراكك',
          subtitle: 'راجع خطتك ومدفوعاتك وتحكم في حالة الاشتراك من مكان واحد.',
          plans: 'عرض الباقات',
        }
      : {
          eyebrow: 'Plan and billing',
          title: 'Manage your subscription',
          subtitle: 'Review your plan, payments, and subscription status in one place.',
          plans: 'View plans',
        };

  return (
    <header className="subscription-page-heading">
      <div>
        <p className="resume-eyebrow">{text.eyebrow}</p>
        <h1>{text.title}</h1>
        <p>{text.subtitle}</p>
      </div>
      <Button asChild variant="outline">
        <Link href="/#pricing">
          {text.plans}
          <ArrowUpRight aria-hidden="true" />
        </Link>
      </Button>
      <span className="subscription-page-heading-icon" aria-hidden="true">
        <CreditCard />
      </span>
    </header>
  );
}
