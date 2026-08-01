import { LoadingScreen } from '@/components/dashboard/layout/loading-screen';
import { Suspense } from 'react';
import { Subscriptions } from '@/components/dashboard/subscriptions/subscriptions';
import { SubscriptionPageHeading } from '@/components/dashboard/subscriptions/components/subscription-page-heading';

export default async function SubscriptionsListPage() {
  return (
    <main className="subscription-page">
      <SubscriptionPageHeading />
      <Suspense fallback={<LoadingScreen />}>
        <Subscriptions />
      </Suspense>
    </main>
  );
}
