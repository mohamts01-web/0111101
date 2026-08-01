import { SubscriptionDetail } from '@/components/dashboard/subscriptions/components/subscription-detail';
import { NoSubscriptionView } from '@/components/dashboard/subscriptions/views/no-subscription-view';
import { MultipleSubscriptionsView } from '@/components/dashboard/subscriptions/views/multiple-subscriptions-view';
import { SubscriptionErrorView } from '@/components/dashboard/subscriptions/views/subscription-error-view';
import { getSubscriptions } from '@/utils/paddle/get-subscriptions';
import { getRequestLocale } from '@/lib/server-locale';

export async function Subscriptions() {
  const locale = await getRequestLocale();
  const { data: subscriptions } = await getSubscriptions();

  if (subscriptions) {
    if (subscriptions.length === 0) {
      return <NoSubscriptionView locale={locale} />;
    } else if (subscriptions.length === 1) {
      return <SubscriptionDetail subscriptionId={subscriptions[0].id} />;
    } else {
      return <MultipleSubscriptionsView subscriptions={subscriptions} locale={locale} />;
    }
  } else {
    return <SubscriptionErrorView locale={locale} />;
  }
}
