import { SubscriptionCards } from '@/components/dashboard/subscriptions/components/subscription-cards';
import { Subscription } from '@paddle/paddle-node-sdk';

interface Props {
  subscriptions: Subscription[];
  locale: 'ar' | 'en';
}

export function MultipleSubscriptionsView({ subscriptions, locale }: Props) {
  return (
    <SubscriptionCards className="grid-cols-1 gap-6 lg:grid-cols-3" subscriptions={subscriptions} locale={locale} />
  );
}
