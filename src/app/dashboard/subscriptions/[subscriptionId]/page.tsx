'use client';

import { LoadingScreen } from '@/components/dashboard/layout/loading-screen';
import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { SubscriptionDetail } from '@/components/dashboard/subscriptions/components/subscription-detail';
import { SubscriptionPageHeading } from '@/components/dashboard/subscriptions/components/subscription-page-heading';

export default function SubscriptionPage() {
  const { subscriptionId } = useParams<{ subscriptionId: string }>();
  return (
    <main className="subscription-page">
      <SubscriptionPageHeading />
      <Suspense fallback={<LoadingScreen />}>
        <SubscriptionDetail subscriptionId={subscriptionId} />
      </Suspense>
    </main>
  );
}
