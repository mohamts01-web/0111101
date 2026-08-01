import { ErrorContent } from '@/components/dashboard/layout/error-content';

export function SubscriptionErrorView({ locale }: { locale: 'ar' | 'en' }) {
  return (
    <div lang={locale === 'ar' ? 'ar-SA' : 'en'}>
      <ErrorContent />
    </div>
  );
}
