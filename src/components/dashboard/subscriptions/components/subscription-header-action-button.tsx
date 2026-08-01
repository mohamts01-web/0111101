'use client';

import { cancelSubscription } from '@/app/dashboard/subscriptions/actions';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { CircleAlert, CircleCheck } from 'lucide-react';
import { useState } from 'react';
import { Confirmation } from '@/components/shared/confirmation/confirmation';
import { useLocale } from '@/components/localization/locale-provider';

export function SubscriptionHeaderActionButton({ subscriptionId }: { subscriptionId: string }) {
  const { locale } = useLocale();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setModalOpen] = useState(false);

  function handleCancelSubscription() {
    setModalOpen(false);
    setLoading(true);
    cancelSubscription(subscriptionId)
      .then((result) => {
        if ('error' in result) throw new Error(result.error);
        toast({
          description: (
            <div className="flex items-center gap-3">
              <CircleCheck size={20} className="shrink-0 text-success" />
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-primary">
                  {locale === 'ar' ? 'تم إلغاء الاشتراك' : 'Subscription canceled'}
                </span>
                <span className="text-sm text-muted-foreground">
                  {locale === 'ar'
                    ? 'توقف الوصول فوراً، وسيعالج Paddle الاسترداد النسبي للمدة غير المستخدمة.'
                    : 'Paid access has ended. Paddle will process any applicable prorated refund.'}
                </span>
              </div>
            </div>
          ),
        });
      })
      .catch((error) => {
        toast({
          description: (
            <div className="flex items-start gap-3">
              <CircleAlert size={20} className="shrink-0 text-destructive" />
              <div className="flex flex-col gap-1">
                <div className="text-sm font-medium text-primary">
                  {locale === 'ar' ? 'تعذر إلغاء الاشتراك' : 'Subscription could not be canceled'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {error instanceof Error
                    ? error.message
                    : locale === 'ar'
                      ? 'يرجى المحاولة لاحقاً.'
                      : 'Please try again later.'}
                </div>
              </div>
            </div>
          ),
        });
      })
      .finally(() => setLoading(false));
  }

  return (
    <>
      <Button disabled={loading} onClick={() => setModalOpen(true)} size="sm" variant="outline">
        {loading
          ? locale === 'ar'
            ? 'جاري الإلغاء...'
            : 'Canceling...'
          : locale === 'ar'
            ? 'إلغاء الاشتراك'
            : 'Cancel subscription'}
      </Button>
      <Confirmation
        description={
          locale === 'ar'
            ? 'سيُلغى الاشتراك فوراً، وتتوقف المزايا مباشرة، وقد يعيد Paddle مبلغاً نسبياً عن المدة غير المستخدمة. لا يمكن التراجع عن هذا الإجراء.'
            : 'The subscription will be canceled immediately and paid access will end. Paddle may issue a prorated refund for unused time. This cannot be undone.'
        }
        title={locale === 'ar' ? 'إلغاء الاشتراك فوراً؟' : 'Cancel subscription now?'}
        onClose={() => setModalOpen(false)}
        isOpen={isModalOpen}
        onConfirm={handleCancelSubscription}
      />
    </>
  );
}
