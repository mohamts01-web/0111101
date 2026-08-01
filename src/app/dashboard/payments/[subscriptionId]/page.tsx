'use client';

import { DashboardPageHeader } from '@/components/dashboard/layout/dashboard-page-header';
import { PaymentsContent } from '@/components/dashboard/payments/payments-content';
import { LoadingScreen } from '@/components/dashboard/layout/loading-screen';
import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { useLocale } from '@/components/localization/locale-provider';

export default function SubscriptionsPaymentPage() {
  const { locale } = useLocale();
  const { subscriptionId } = useParams<{ subscriptionId: string }>();
  const copy =
    locale === 'ar'
      ? {
          title: 'مدفوعات الاشتراك',
          eyebrow: 'الفوترة',
          description: 'سجل الفواتير المرتبط بهذا الاشتراك.',
        }
      : {
          title: 'Subscription payments',
          eyebrow: 'Billing',
          description: 'Invoice history associated with this subscription.',
        };

  return (
    <main className="payments-page">
      <DashboardPageHeader pageTitle={copy.title} eyebrow={copy.eyebrow} description={copy.description} />
      <Suspense fallback={<LoadingScreen />}>
        <PaymentsContent subscriptionId={subscriptionId} />
      </Suspense>
    </main>
  );
}
