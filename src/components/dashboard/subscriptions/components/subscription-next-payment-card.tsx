'use client';

import { Card } from '@/components/ui/card';
import { Subscription, Transaction } from '@paddle/paddle-node-sdk';
import dayjs from 'dayjs';
import { parseMoney } from '@/utils/paddle/parse-money';
import { PaymentMethodSection } from '@/components/dashboard/subscriptions/components/payment-method-section';
import { useLocale } from '@/components/localization/locale-provider';

interface Props {
  transactions?: Transaction[];
  subscription?: Subscription;
}

export function SubscriptionNextPaymentCard({ subscription, transactions }: Props) {
  const { locale } = useLocale();
  if (!subscription?.nextBilledAt) {
    return null;
  }
  return (
    <Card className="subscription-panel subscription-next-payment @container">
      <div className="subscription-next-payment-summary">
        <h3>{locale === 'ar' ? 'الدفعة القادمة' : 'Next payment'}</h3>
        <div>
          <strong>{parseMoney(subscription?.nextTransaction?.details.totals.total, subscription?.currencyCode)}</strong>
          <span>{locale === 'ar' ? 'مستحقة في' : 'due'}</span>
          <b>{dayjs(subscription?.nextBilledAt).format(locale === 'ar' ? 'YYYY/MM/DD' : 'MMM DD, YYYY')}</b>
        </div>
      </div>
      <PaymentMethodSection
        transactions={transactions}
        updatePaymentMethodUrl={subscription?.managementUrls?.updatePaymentMethod}
      />
    </Card>
  );
}
