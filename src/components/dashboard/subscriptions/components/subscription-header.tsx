'use client';

import { Subscription } from '@paddle/paddle-node-sdk';
import Image from 'next/image';
import { Status } from '@/components/shared/status/status';
import { parseMoney } from '@/utils/paddle/parse-money';
import dayjs from 'dayjs';
import { SubscriptionHeaderActionButton } from '@/components/dashboard/subscriptions/components/subscription-header-action-button';
import { SubscriptionAlerts } from '@/components/dashboard/subscriptions/components/subscription-alerts';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useLocale } from '@/components/localization/locale-provider';

interface Props {
  subscription: Subscription;
}

export function SubscriptionHeader({ subscription }: Props) {
  const { locale } = useLocale();
  const subscriptionItem = subscription.items[0];

  const price = subscriptionItem.quantity * parseFloat(subscription?.recurringTransactionDetails?.totals.total ?? '0');
  const formattedPrice = parseMoney(price.toString(), subscription.currencyCode);
  const frequency =
    subscription.billingCycle.frequency === 1
      ? `/${subscription.billingCycle.interval === 'month' ? (locale === 'ar' ? 'شهر' : 'month') : locale === 'ar' ? 'سنة' : 'year'}`
      : locale === 'ar'
        ? `كل ${subscription.billingCycle.frequency} ${subscription.billingCycle.interval === 'month' ? 'أشهر' : 'سنوات'}`
        : `every ${subscription.billingCycle.frequency} ${subscription.billingCycle.interval === 'month' ? 'months' : 'years'}`;

  const formattedStartedDate = dayjs(subscription.startedAt).format(locale === 'ar' ? 'YYYY/MM/DD' : 'MMM DD, YYYY');

  return (
    <section className="subscription-plan-header">
      <div className="subscription-plan-main">
        <SubscriptionAlerts subscription={subscription} />
        <div className="subscription-product-heading">
          {subscriptionItem.product.imageUrl && (
            <Image src={subscriptionItem.product.imageUrl} alt={subscriptionItem.product.name} width={48} height={48} />
          )}
          <h2>{subscriptionItem.product.name}</h2>
        </div>
        <div className="subscription-plan-price-row">
          <div className="subscription-plan-price">
            <strong>{formattedPrice}</strong>
            <span>{frequency}</span>
          </div>
          <Status status={subscription.status} />
        </div>
        <p className="subscription-plan-date">
          {locale === 'ar' ? 'بدأ الاشتراك بتاريخ' : 'Subscription started'} {formattedStartedDate}
        </p>
      </div>
      <div className="subscription-plan-action">
        {subscription.status === 'canceled' ? (
          <Button asChild>
            <Link href="/#pricing">{locale === 'ar' ? 'تجديد الاشتراك' : 'Renew subscription'}</Link>
          </Button>
        ) : (
          !subscription.scheduledChange && <SubscriptionHeaderActionButton subscriptionId={subscription.id} />
        )}
      </div>
    </section>
  );
}
