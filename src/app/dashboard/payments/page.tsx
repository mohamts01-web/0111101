import { DashboardPageHeader } from '@/components/dashboard/layout/dashboard-page-header';
import { PaymentsContent } from '@/components/dashboard/payments/payments-content';
import { LoadingScreen } from '@/components/dashboard/layout/loading-screen';
import { Suspense } from 'react';
import { getRequestLocale } from '@/lib/server-locale';

export default async function PaymentsPage() {
  const locale = await getRequestLocale();
  const copy =
    locale === 'ar'
      ? {
          title: 'المدفوعات',
          eyebrow: 'الفوترة',
          description: 'استعرض سجل الفواتير وحالة كل عملية دفع.',
        }
      : {
          title: 'Payments',
          eyebrow: 'Billing',
          description: 'Review your invoice history and the status of every payment.',
        };
  return (
    <main className="payments-page">
      <DashboardPageHeader pageTitle={copy.title} eyebrow={copy.eyebrow} description={copy.description} />
      <Suspense fallback={<LoadingScreen />}>
        <PaymentsContent subscriptionId={''} />
      </Suspense>
    </main>
  );
}
