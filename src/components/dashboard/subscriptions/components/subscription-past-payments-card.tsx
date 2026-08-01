'use client';

import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Transaction } from '@paddle/paddle-node-sdk';
import dayjs from 'dayjs';
import { parseMoney } from '@/utils/paddle/parse-money';
import { Status } from '@/components/shared/status/status';
import { getPaymentReason } from '@/utils/paddle/data-helpers';
import { useLocale } from '@/components/localization/locale-provider';

interface Props {
  subscriptionId: string;
  transactions?: Transaction[];
}

export function SubscriptionPastPaymentsCard({ subscriptionId, transactions }: Props) {
  const { locale } = useLocale();
  return (
    <Card className="subscription-panel subscription-payments-panel @container">
      <CardTitle className="subscription-panel-heading">
        <span>{locale === 'ar' ? 'المدفوعات' : 'Payments'}</span>
        <Button asChild size="sm" variant="outline">
          <Link href={`/dashboard/payments/${subscriptionId}`}>{locale === 'ar' ? 'عرض الكل' : 'View all'}</Link>
        </Button>
      </CardTitle>
      <CardContent className="subscription-payment-list">
        {transactions?.slice(0, 3).map((transaction) => {
          const formattedPrice = parseMoney(transaction.details?.totals?.total, transaction.currencyCode);
          return (
            <div key={transaction.id} className="subscription-payment-item">
              <time>
                {dayjs(transaction.billedAt ?? transaction.createdAt).format(
                  locale === 'ar' ? 'YYYY/MM/DD' : 'MMM DD, YYYY',
                )}
              </time>
              <div>
                <strong>{getPaymentReason(transaction.origin, locale)}</strong>
                <span>{transaction.details?.lineItems[0].product?.name}</span>
              </div>
              <div className="subscription-payment-meta">
                <strong>{formattedPrice}</strong>
                <Status status={transaction.status} />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
