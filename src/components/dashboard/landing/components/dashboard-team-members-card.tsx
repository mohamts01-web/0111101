'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

const resumeSteps = [
  {
    name: 'اختر طريقة الإنشاء',
    description: 'محرر مباشر أو Wizard خطوة بخطوة',
    initials: '1',
  },
  {
    name: 'أضف بياناتك',
    description: 'المعلومات الشخصية والخبرات والمهارات',
    initials: '2',
  },
  {
    name: 'اختر القالب',
    description: 'قوالب عربية وإنجليزية مناسبة للتقديم',
    initials: '3',
  },
  {
    name: 'حمّل PDF',
    description: 'بعد الاشتراك أو الشراء المباشر',
    initials: '4',
  },
];

export function DashboardTeamMembersCard() {
  return (
    <Card className={'bg-background/50 backdrop-blur-[24px] border-border p-6'}>
      <CardHeader className="p-0 space-y-0">
        <CardTitle className="flex justify-between gap-2 items-center pb-6 border-border border-b">
          <div className={'flex flex-col gap-2'}>
            <span className={'text-xl font-medium'}>رحلة السيرة</span>
            <span className={'text-base leading-4 text-secondary'}>خطوات إنشاء السيرة داخل المنصة</span>
          </div>
          <Button size={'sm'} variant={'outline'} className={'text-sm rounded-sm border-border'} disabled={true}>
            <CheckCircle2 size={16} className={'text-muted-foreground'} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className={'p-0 pt-6 flex gap-6 flex-col'}>
        {resumeSteps.map((step) => (
          <div key={step.name} className={'flex justify-between items-center gap-2'}>
            <div className={'flex gap-4'}>
              <div className={'flex items-center justify-center px-3 py-4'}>
                <span className={'text-white text-base w-5'}>{step.initials}</span>
              </div>
              <div className={'flex flex-col gap-2'}>
                <span className={'text-base leading-4 font-medium'}>{step.name}</span>
                <span className={'text-base leading-4 text-secondary'}>{step.description}</span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
