'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2, CheckCircle2, Copy, Gift, Upload } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PricingTier, type EntitlementPlanId } from '@/constants/pricing-tier';
import { getCreditOffer } from '@/lib/billing';
import { useLocale } from '@/components/localization/locale-provider';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: 'subscription' | 'credits';
  plan?: EntitlementPlanId;
  faceValueSar?: number;
  onSubmitted?: () => void;
};

const bank = {
  beneficiary: 'محمد فهد محمد الرخيج',
  account: '475000010006086029957',
  iban: 'SA55 8000 0475 6080 1602 9957',
  swift: 'RJHISARI',
};

export function BankTransferDialog({ open, onOpenChange, kind, plan, faceValueSar = 10, onSubmitted }: Props) {
  const { locale } = useLocale();
  const [receipt, setReceipt] = useState<File>();
  const [senderName, setSenderName] = useState('');
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const tier = PricingTier.find((item) => item.entitlementPlan === plan);
  const offer = useMemo(() => getCreditOffer(faceValueSar), [faceValueSar]);
  const amount = kind === 'subscription' ? (tier?.priceSar ?? 0) : offer.payableAmountSar;

  useEffect(() => {
    if (open) setStatus('');
  }, [open]);

  async function submit() {
    if (!receipt || amount <= 0)
      return setStatus(locale === 'ar' ? 'أرفق الإيصال أولاً.' : 'Attach the receipt first.');
    setLoading(true);
    setStatus('');
    const form = new FormData();
    form.set('kind', kind);
    if (plan) form.set('plan', plan);
    if (kind === 'credits') form.set('faceValueSar', String(offer.faceValueSar));
    form.set('senderName', senderName);
    form.set('transferReference', reference);
    form.set('receipt', receipt);
    const response = await fetch('/api/billing/bank-transfers', { method: 'POST', body: form });
    const payload = (await response.json()) as { error?: string };
    setLoading(false);
    if (!response.ok) return setStatus(payload.error ?? 'تعذر إرسال الطلب.');
    setStatus(locale === 'ar' ? 'وصل الطلب للإدارة وسيصلك إشعار بعد المراجعة.' : 'The request was sent for review.');
    setReceipt(undefined);
    onSubmitted?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92vh] max-w-3xl overflow-y-auto [&>button]:left-4 [&>button]:right-auto"
        dir={locale === 'ar' ? 'rtl' : 'ltr'}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" /> {locale === 'ar' ? 'الدفع عبر التحويل البنكي' : 'Pay by bank transfer'}
          </DialogTitle>
          <DialogDescription>
            {locale === 'ar'
              ? 'حوّل القيمة الموضحة، ثم ارفع الإيصال ليتم تفعيل طلبك بعد مراجعة الإدارة.'
              : 'Transfer the shown amount, then upload your receipt for review.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_240px]">
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/40 p-4">
              <span className="text-xs text-muted-foreground">{locale === 'ar' ? 'المبلغ المطلوب' : 'Amount due'}</span>
              <div className="mt-1 flex items-end gap-2">
                <strong className="text-3xl">{amount.toFixed(amount % 1 ? 2 : 0)}</strong>
                <b>{locale === 'ar' ? 'ر.س.' : 'SAR'}</b>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {kind === 'credits'
                  ? locale === 'ar'
                    ? `${offer.credits.toLocaleString('ar-SA')} نقطة + هدية ${offer.bankBonusCredits.toLocaleString('ar-SA')} نقطة بعد القبول.`
                    : `${offer.credits.toLocaleString()} credits + ${offer.bankBonusCredits.toLocaleString()} bonus credits after approval.`
                  : locale === 'ar'
                    ? `باقة ${tier?.name === 'Trial' ? 'التجريبية الأساسية' : tier?.name === 'Basic Plus' ? 'الأساسية بلس' : 'المتقدمة'}.`
                    : `${tier?.name} plan.`}
              </p>
            </div>
            {kind === 'credits' && (
              <div className="flex gap-2 rounded-md border border-primary/25 bg-primary/5 p-3 text-sm">
                <Gift className="h-5 w-5 shrink-0 text-primary" />
                <span>
                  {locale === 'ar'
                    ? 'هدية 5% نقاط إضافية مخصصة لمشتريات الرصيد عبر التحويل البنكي.'
                    : 'A 5% credit bonus is exclusive to bank-transfer top-ups.'}
                </span>
              </div>
            )}
            <BankRow label={locale === 'ar' ? 'اسم المستفيد' : 'Beneficiary'} value={bank.beneficiary} />
            <BankRow label={locale === 'ar' ? 'رقم الحساب' : 'Account number'} value={bank.account} />
            <BankRow label={locale === 'ar' ? 'رقم الآيبان' : 'IBAN'} value={bank.iban} />
            <BankRow label={locale === 'ar' ? 'سويفت' : 'SWIFT'} value={bank.swift} />
          </div>
          <div className="flex items-start justify-center">
            <Image
              src="/assets/bank/load-bank-test.jpeg"
              alt={locale === 'ar' ? 'بيانات الحساب البنكي التجريبي' : 'Test bank account details'}
              width={240}
              height={410}
              className="h-auto w-full max-w-[240px] rounded-md border"
            />
          </div>
        </div>

        <div className="grid gap-4 border-t pt-5 md:grid-cols-2">
          <label className="space-y-2">
            <Label>{locale === 'ar' ? 'اسم المحوّل (اختياري)' : 'Sender name (optional)'}</Label>
            <Input value={senderName} onChange={(event) => setSenderName(event.target.value)} />
          </label>
          <label className="space-y-2">
            <Label>{locale === 'ar' ? 'مرجع التحويل (اختياري)' : 'Transfer reference (optional)'}</Label>
            <Input value={reference} onChange={(event) => setReference(event.target.value)} dir="ltr" />
          </label>
          <label className="space-y-2 md:col-span-2">
            <Label>{locale === 'ar' ? 'صورة الإيصال أو PDF' : 'Receipt image or PDF'}</Label>
            <div className="flex min-h-20 items-center gap-3 rounded-md border border-dashed p-3">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(event) => setReceipt(event.target.files?.[0])}
              />
            </div>
            <span className="text-xs text-muted-foreground">JPG, PNG, WEBP, PDF · 5MB</span>
          </label>
        </div>
        {status && (
          <p role="status" className="rounded-md border p-3 text-sm">
            {status}
          </p>
        )}
        <Button onClick={submit} disabled={loading || !receipt} className="w-full">
          <CheckCircle2 className="h-4 w-4" />{' '}
          {loading
            ? locale === 'ar'
              ? 'جارٍ الإرسال...'
              : 'Sending...'
            : locale === 'ar'
              ? 'إرسال للمراجعة'
              : 'Submit for review'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function BankRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b pb-2">
      <div>
        <span className="block text-xs text-muted-foreground">{label}</span>
        <strong className="text-sm" dir="ltr">
          {value}
        </strong>
      </div>
      <button
        type="button"
        title="Copy"
        aria-label="Copy"
        className="rounded p-2 hover:bg-muted"
        onClick={() => navigator.clipboard.writeText(value)}
      >
        <Copy className="h-4 w-4" />
      </button>
    </div>
  );
}
