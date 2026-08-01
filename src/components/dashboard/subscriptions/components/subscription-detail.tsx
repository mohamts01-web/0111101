'use client';

import { getSubscription } from '@/utils/paddle/get-subscription';
import { getTransactions } from '@/utils/paddle/get-transactions';
import { SubscriptionPastPaymentsCard } from '@/components/dashboard/subscriptions/components/subscription-past-payments-card';
import { SubscriptionNextPaymentCard } from '@/components/dashboard/subscriptions/components/subscription-next-payment-card';
import { SubscriptionLineItems } from '@/components/dashboard/subscriptions/components/subscription-line-items';
import { SubscriptionHeader } from '@/components/dashboard/subscriptions/components/subscription-header';
import { ErrorContent } from '@/components/dashboard/layout/error-content';
import { useEffect, useState } from 'react';
import { LoadingScreen } from '@/components/dashboard/layout/loading-screen';
import { SubscriptionDetailResponse, TransactionResponse } from '@/lib/api.types';

interface Props {
  subscriptionId: string;
}

export function SubscriptionDetail({ subscriptionId }: Props) {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionDetailResponse>();
  const [transactions, setTransactions] = useState<TransactionResponse>();

  useEffect(() => {
    (async () => {
      const [subscriptionResponse, transactionsResponse] = await Promise.all([
        getSubscription(subscriptionId),
        getTransactions(subscriptionId, ''),
      ]);

      if (subscriptionResponse) {
        setSubscription(subscriptionResponse);
      }

      if (transactionsResponse) {
        setTransactions(transactionsResponse);
      }
      setLoading(false);
    })();
  }, [subscriptionId]);

  if (loading) {
    return <LoadingScreen />;
  } else if (subscription?.data && transactions?.data) {
    return (
      <div className="subscription-detail">
        <SubscriptionHeader subscription={subscription.data} />
        <div className="subscription-detail-grid">
          <div className="subscription-detail-side">
            <SubscriptionNextPaymentCard transactions={transactions.data} subscription={subscription.data} />
            <SubscriptionPastPaymentsCard transactions={transactions.data} subscriptionId={subscriptionId} />
          </div>
          <div className="subscription-detail-main">
            <SubscriptionLineItems subscription={subscription.data} />
          </div>
        </div>
      </div>
    );
  } else {
    return <ErrorContent />;
  }
}
