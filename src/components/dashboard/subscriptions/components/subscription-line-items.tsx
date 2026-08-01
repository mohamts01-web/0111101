'use client';

import { Subscription } from '@paddle/paddle-node-sdk';
import Image from 'next/image';
import { useLocale } from '@/components/localization/locale-provider';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { parseMoney } from '@/utils/paddle/parse-money';

interface Props {
  subscription?: Subscription;
}

export function SubscriptionLineItems({ subscription }: Props) {
  const { locale } = useLocale();
  const t =
    locale === 'ar'
      ? {
          title: 'المنتجات المتكررة في هذا الاشتراك',
          quantity: 'الكمية',
          tax: 'الضريبة',
          amount: 'المبلغ',
          subtotal: 'المجموع قبل الضريبة',
          total: 'الإجمالي شامل الضريبة',
        }
      : {
          title: 'Recurring products in this subscription',
          quantity: 'Quantity',
          tax: 'Tax',
          amount: 'Amount',
          subtotal: 'Subtotal before tax',
          total: 'Total including tax',
        };

  return (
    <Card className="subscription-panel subscription-products-panel">
      <CardTitle className="subscription-panel-heading">
        <span>{t.title}</span>
      </CardTitle>
      <CardContent className="subscription-products-content">
        <div className="subscription-product-list">
          {subscription?.recurringTransactionDetails?.lineItems.map((lineItem) => (
            <article className="subscription-product-item" key={lineItem.priceId}>
              <div className="subscription-product-copy">
                {lineItem.product.imageUrl && (
                  <Image src={lineItem.product.imageUrl} width={44} height={44} alt={lineItem.product.name} />
                )}
                <div>
                  <strong>{lineItem.product.name}</strong>
                  <p>{lineItem.product.description}</p>
                </div>
              </div>
              <dl className="subscription-product-meta">
                <div>
                  <dt>{t.quantity}</dt>
                  <dd>{lineItem.quantity}</dd>
                </div>
                <div>
                  <dt>{t.tax}</dt>
                  <dd>{parseFloat(lineItem.taxRate) * 100}%</dd>
                </div>
                <div>
                  <dt>{t.amount}</dt>
                  <dd>{parseMoney(lineItem.totals.subtotal, subscription?.currencyCode)}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
        <dl className="subscription-totals">
          <div>
            <dt>{t.subtotal}</dt>
            <dd>
              {parseMoney(subscription?.recurringTransactionDetails?.totals.subtotal, subscription?.currencyCode)}
            </dd>
          </div>
          <div>
            <dt>{t.tax}</dt>
            <dd>{parseMoney(subscription?.recurringTransactionDetails?.totals.tax, subscription?.currencyCode)}</dd>
          </div>
          <div>
            <dt>{t.total}</dt>
            <dd>{parseMoney(subscription?.recurringTransactionDetails?.totals.total, subscription?.currencyCode)}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
