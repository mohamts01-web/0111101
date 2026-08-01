import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function NoSubscriptionView({ locale }: { locale: 'ar' | 'en' }) {
  const t =
    locale === 'ar'
      ? {
          title: 'لا توجد اشتراكات نشطة',
          body: 'اختر الباقة المناسبة لك، وستظهر هنا تفاصيل الخطة والفواتير وإدارة الاشتراك.',
          action: 'عرض الباقات',
        }
      : {
          title: 'No active subscriptions',
          body: 'Choose the plan that fits you. Plan details, invoices, and subscription controls will appear here.',
          action: 'View plans',
        };
  return (
    <div className="subscription-empty-grid">
      <Card className="subscription-panel subscription-empty-card">
        <CardHeader className="p-0 space-y-0">
          <CardTitle className="flex justify-between items-center pb-2">
            <span className={'text-xl font-medium'}>{t.title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className={'p-0'}>
          <div className="text-base leading-7 text-muted-foreground">{t.body}</div>
        </CardContent>
        <CardFooter className={'p-0 pt-6'}>
          <Button asChild size="sm">
            <Link href="/#pricing">{t.action}</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
