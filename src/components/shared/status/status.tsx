'use client';

import { Check, CircleMinus, Clock4, Pause, SquarePen } from 'lucide-react';
import { ReactNode } from 'react';
import { useLocale } from '@/components/localization/locale-provider';

interface Props {
  status: string;
}

interface StatusInfo {
  [key: string]: { color: string; icon: ReactNode };
}
// Ensure that any new colors are added to `safelist` in tailwind.config.js
const StatusInfo: StatusInfo = {
  active: { color: 'var(--primary)', icon: <Check size={16} /> },
  paid: { color: 'var(--primary)', icon: <Check size={16} /> },
  completed: { color: 'var(--primary)', icon: <Check size={16} /> },
  trialing: { color: 'var(--primary)', icon: <Clock4 size={16} /> },
  draft: { color: 'var(--muted-foreground)', icon: <SquarePen size={16} /> },
  ready: { color: 'var(--muted-foreground)', icon: <SquarePen size={16} /> },
  canceled: { color: 'var(--muted-foreground)', icon: <CircleMinus size={16} /> },
  inactive: { color: 'var(--destructive)', icon: <CircleMinus size={16} /> },
  past_due: { color: 'var(--destructive)', icon: <Clock4 size={16} /> },
  paused: { color: 'var(--warning)', icon: <Pause size={16} /> },
  billed: { color: 'var(--warning)', icon: <Clock4 size={16} /> },
};

const statusLabels: Record<string, { ar: string; en: string }> = {
  active: { ar: 'نشط', en: 'Active' },
  paid: { ar: 'مدفوع', en: 'Paid' },
  completed: { ar: 'مكتمل', en: 'Completed' },
  trialing: { ar: 'فترة تجريبية', en: 'Trialing' },
  draft: { ar: 'مسودة', en: 'Draft' },
  ready: { ar: 'جاهز', en: 'Ready' },
  canceled: { ar: 'منتهي', en: 'Canceled' },
  inactive: { ar: 'غير نشط', en: 'Inactive' },
  past_due: { ar: 'متأخر السداد', en: 'Past due' },
  paused: { ar: 'متوقف مؤقتاً', en: 'Paused' },
  billed: { ar: 'فاتورة غير مدفوعة', en: 'Unpaid invoice' },
};

export function Status({ status }: Props) {
  const { locale } = useLocale();
  const { color, icon } = StatusInfo[status] ?? {};
  const text = statusLabels[status]?.[locale] ?? status;
  return (
    <div className="flex w-fit items-center gap-2 rounded-md border border-border px-2 py-1 text-sm" style={{ color }}>
      {icon}
      {text}
    </div>
  );
}
