'use client';

import { Coins, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { BankTransferDialog } from '@/components/billing/bank-transfer-dialog';
import { getCreditOffer } from '@/lib/billing';
import type { EntitlementPlanId } from '@/constants/pricing-tier';
import { useLocale } from '@/components/localization/locale-provider';

type Wallet = { plan: string; totalCredits: number; hasPaidAccess: boolean; accessUntil: string | null };
type Product = {
  id: string;
  face_value_sar: number;
  payable_amount_sar: number;
  discount_percent: number;
  base_credits: number;
};
type Transfer = {
  id: string;
  request_kind: string;
  plan: string | null;
  payable_amount_sar: number;
  base_credits: number;
  bonus_credits: number;
  status: string;
  admin_note: string | null;
  created_at: string;
};
type Data = { entitlement: Wallet; products: Product[]; transfers: Transfer[] };

export function CreditsPage() {
  const { locale } = useLocale();
  const [data, setData] = useState<Data>();
  const [customAmount, setCustomAmount] = useState(250);
  const [bank, setBank] = useState<{
    open: boolean;
    kind: 'subscription' | 'credits';
    plan?: EntitlementPlanId;
    amount: number;
  }>({ open: false, kind: 'credits', amount: 250 });
  const customOffer = useMemo(() => getCreditOffer(customAmount), [customAmount]);

  function load() {
    void fetch('/api/credits').then(async (response) => {
      if (response.ok) setData(await response.json());
    });
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get('bank') === 'subscription') {
      const plan = query.get('plan') as EntitlementPlanId | null;
      if (plan && ['trial_basic', 'basic', 'advanced'].includes(plan))
        setBank({ open: true, kind: 'subscription', plan, amount: 0 });
    }
  }, []);

  function buy(faceValueSar: number) {
    window.location.assign(`/dashboard/credits/checkout?amount=${faceValueSar}`);
  }

  const number = (value: number) => value.toLocaleString('en-US');
  return (
    <main className="mx-auto max-w-7xl space-y-8 p-4 py-8 md:p-8" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <header className="flex flex-wrap items-end justify-between gap-5 border-b pb-6">
        <div>
          <p className="resume-eyebrow">{locale === 'ar' ? 'الرصيد المرن' : 'Flexible balance'}</p>
          <h1 className="text-3xl font-bold">
            {locale === 'ar' ? 'اشترِ النقاط عند حاجتك' : 'Buy credits when you need them'}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {locale === 'ar'
              ? 'كل ريال يعادل 10 نقاط. كلما ارتفعت الشريحة انخفض السعر حتى خصم 10%، دون تاريخ انتهاء للرصيد المشترى.'
              : 'Every SAR equals 10 credits. Larger amounts reduce the price by up to 10%, and purchased credits do not expire.'}
          </p>
        </div>
        <div className="flex min-w-48 items-center gap-3 rounded-md border bg-card p-4">
          <Coins className="h-6 w-6 text-primary" />
          <div>
            <span className="block text-xs text-muted-foreground">
              {locale === 'ar' ? 'الرصيد المتاح' : 'Available balance'}
            </span>
            <strong className="text-2xl">{data ? number(data.entitlement.totalCredits) : '—'}</strong>
          </div>
        </div>
      </header>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">{locale === 'ar' ? 'شرائح جاهزة' : 'Ready-made amounts'}</h2>
          <p className="text-sm text-muted-foreground">
            {locale === 'ar'
              ? 'السعر الكبير بالريال هو المبلغ المدفوع بعد الخصم، والدولار مرجع تقريبي قبل فتح Paddle.'
              : 'The large SAR value is the discounted payable amount; USD is an estimate before Paddle opens.'}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {data?.products.map((product) => {
            const offer = getCreditOffer(product.face_value_sar);
            return (
              <article key={product.id} className="flex min-h-56 flex-col rounded-md border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <strong className="text-lg">
                    {number(product.base_credits)} {locale === 'ar' ? 'نقطة' : 'credits'}
                  </strong>
                  <span className="rounded bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                    -{product.discount_percent}%
                  </span>
                </div>
                <span className="mt-5 text-xs text-muted-foreground line-through">
                  {product.face_value_sar} {locale === 'ar' ? 'ر.س.' : 'SAR'}
                </span>
                <div className="flex items-end gap-1">
                  <b className="text-2xl">{Number(product.payable_amount_sar).toFixed(2)}</b>
                  <span className="pb-1 text-xs font-bold">{locale === 'ar' ? 'ر.س.' : 'SAR'}</span>
                </div>
                <small className="mt-1 text-muted-foreground" dir="ltr">
                  ≈ ${offer.usdAmount} USD
                </small>
                <div className="mt-auto grid gap-2 pt-4">
                  <Button size="sm" onClick={() => buy(product.face_value_sar)}>
                    {locale === 'ar' ? 'احصل عليه الآن!' : 'Get it now!'}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 border-t pt-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.6fr)]">
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <SlidersHorizontal className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-xl font-bold">{locale === 'ar' ? 'مبلغ مخصص' : 'Custom amount'}</h2>
              <p className="text-sm text-muted-foreground">
                {locale === 'ar'
                  ? 'اختر أي مبلغ صحيح من 10 إلى 1000 ريال.'
                  : 'Choose any whole amount from SAR 10 to SAR 1,000.'}
              </p>
            </div>
          </div>
          <input
            className="w-full accent-primary"
            type="range"
            min="10"
            max="1000"
            step="1"
            value={customAmount}
            onChange={(event) => setCustomAmount(Number(event.target.value))}
          />
          <div className="grid grid-cols-3 gap-3 text-center">
            <Metric label={locale === 'ar' ? 'القيمة' : 'Face value'} value={`${customOffer.faceValueSar} SAR`} />
            <Metric label={locale === 'ar' ? 'الخصم' : 'Discount'} value={`${customOffer.discountPercent}%`} />
            <Metric label={locale === 'ar' ? 'النقاط' : 'Credits'} value={number(customOffer.credits)} />
          </div>
        </div>
        <div className="rounded-md border bg-card p-5">
          <span className="text-xs text-muted-foreground">
            {locale === 'ar' ? 'المبلغ بعد الخصم' : 'Discounted total'}
          </span>
          <div className="mt-1 flex items-end gap-2">
            <strong className="text-3xl">{customOffer.payableAmountSar.toFixed(2)}</strong>
            <b>SAR</b>
          </div>
          <span className="mt-1 block text-xs text-muted-foreground line-through">
            {customOffer.faceValueSar.toFixed(2)} SAR
          </span>
          <span className="text-xs text-muted-foreground" dir="ltr">
            ≈ ${customOffer.usdAmount} USD
          </span>
          <div className="mt-5 grid gap-2">
            <Button onClick={() => buy(customAmount)}>{locale === 'ar' ? 'احصل عليه الآن!' : 'Get it now!'}</Button>
          </div>
        </div>
      </section>

      <section className="border-t pt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{locale === 'ar' ? 'طلبات التحويل' : 'Transfer requests'}</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/#pricing">{locale === 'ar' ? 'باقات الاشتراك' : 'Subscription plans'}</Link>
          </Button>
        </div>
        <div className="mt-4 overflow-x-auto rounded-md border">
          <table className="w-full min-w-[650px] text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-start">{locale === 'ar' ? 'النوع' : 'Type'}</th>
                <th className="p-3 text-start">{locale === 'ar' ? 'القيمة' : 'Amount'}</th>
                <th className="p-3 text-start">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                <th className="p-3 text-start">{locale === 'ar' ? 'التاريخ' : 'Date'}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data?.transfers.map((item) => (
                <tr key={item.id}>
                  <td className="p-3">
                    {item.request_kind === 'credits'
                      ? `${number(item.base_credits)} ${locale === 'ar' ? 'نقطة' : 'credits'}`
                      : item.plan}
                  </td>
                  <td className="p-3">{item.payable_amount_sar} SAR</td>
                  <td className="p-3">{transferStatus(item.status, locale)}</td>
                  <td className="p-3">
                    {new Date(item.created_at).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <BankTransferDialog
        open={bank.open}
        onOpenChange={(open) => setBank((current) => ({ ...current, open }))}
        kind={bank.kind}
        plan={bank.plan}
        faceValueSar={bank.amount}
        onSubmitted={load}
      />
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <span className="block text-xs text-muted-foreground">{label}</span>
      <strong className="mt-1 block">{value}</strong>
    </div>
  );
}
function transferStatus(status: string, locale: 'ar' | 'en') {
  const ar: Record<string, string> = {
    pending: 'قيد المراجعة',
    approved: 'مقبول',
    rejected: 'مرفوض',
    canceled: 'ملغي',
  };
  const en: Record<string, string> = {
    pending: 'Under review',
    approved: 'Approved',
    rejected: 'Rejected',
    canceled: 'Canceled',
  };
  return (locale === 'ar' ? ar : en)[status] ?? status;
}
