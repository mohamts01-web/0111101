import { Bolt, FileText, Languages, Timer } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const cards = [
  {
    title: 'السير المحفوظة',
    icon: <Bolt className="text-muted-foreground" size={18} />,
    value: '0',
    change: 'ابدأ بإنشاء سيرتك الأولى',
  },
  {
    title: 'قوالب جاهزة',
    icon: <FileText className="text-muted-foreground" size={18} />,
    value: '5',
    change: 'ATS وModern وGraduate وTech وExecutive',
  },
  {
    title: 'دعم اللغات',
    icon: <Languages className="text-muted-foreground" size={18} />,
    value: 'AR / EN',
    change: 'واجهة عربية مع دعم الإنجليزية',
  },
  {
    title: 'متوسط الإنشاء',
    icon: <Timer className="text-muted-foreground" size={18} />,
    value: '5-10',
    change: 'دقائق للوصول إلى سيرة جاهزة',
  },
];
export function DashboardUsageCardGroup() {
  return (
    <div className={'grid gap-6 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2'}>
      {cards.map((card) => (
        <Card key={card.title} className={'bg-background/50 backdrop-blur-[24px] border-border p-6'}>
          <CardHeader className="p-0 space-y-0">
            <CardTitle className="flex justify-between items-center mb-6">
              <span className={'text-base leading-4'}>{card.title}</span> {card.icon}
            </CardTitle>
            <CardDescription className={'text-[32px] leading-[32px] text-primary'}>{card.value}</CardDescription>
          </CardHeader>
          <CardContent className={'p-0'}>
            <div className="text-sm leading-[14px] pt-2 text-secondary">{card.change}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
