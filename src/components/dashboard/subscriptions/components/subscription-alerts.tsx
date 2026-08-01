'use client';

import { Subscription } from '@paddle/paddle-node-sdk';
import { Alert } from '@/components/ui/alert';
import dayjs from 'dayjs';
import { useLocale } from '@/components/localization/locale-provider';

interface Props {
  subscription: Subscription;
}
export function SubscriptionAlerts({ subscription }: Props) {
  const { locale } = useLocale();
  if (subscription.status === 'canceled') {
    return (
      <Alert variant="destructive" className="subscription-plan-alert">
        {locale === 'ar'
          ? `انتهى هذا الاشتراك بتاريخ ${dayjs(subscription.canceledAt).format('YYYY/MM/DD')}. يمكنك تجديده من صفحة الباقات واستعادة مزايا خطتك.`
          : `This subscription ended on ${dayjs(subscription.canceledAt).format('MMM DD, YYYY')}. Renew it from the plans page to restore your benefits.`}
      </Alert>
    );
  } else if (subscription.scheduledChange && subscription.scheduledChange.action === 'cancel') {
    return (
      <Alert className="subscription-plan-alert">
        {locale === 'ar'
          ? `سيُلغى الاشتراك بنهاية الفترة الحالية بتاريخ ${dayjs(subscription.scheduledChange.effectiveAt).format('YYYY/MM/DD')}. مزاياك مستمرة حتى ذلك التاريخ.`
          : `This subscription is scheduled to end on ${dayjs(subscription.scheduledChange.effectiveAt).format('MMM DD, YYYY')}. Your benefits remain active until then.`}
      </Alert>
    );
  }
  return null;
}
