'use client';

import { type Environments, initializePaddle, type Paddle } from '@paddle/paddle-js';
import { ArrowRight, Building2, CreditCard, Landmark, WalletCards } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { BankTransferDialog } from '@/components/billing/bank-transfer-dialog';
import { getCreditOffer } from '@/lib/billing';
import { useLocale } from '@/components/localization/locale-provider';

export function CreditPaymentMethods({ amount }: { amount: number }) {
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const offer = useMemo(() => getCreditOffer(amount), [amount]);
  const [paddle, setPaddle] = useState<Paddle>();
  const [bankOpen, setBankOpen] = useState(false);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  async function startPaddleCheckout() {
    setStatus('');
    setLoading(true);
    try {
      const environment = process.env.NEXT_PUBLIC_PADDLE_ENV;
      const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
      if (!environment || !token) throw new Error(ar ? 'إعدادات الدفع غير مكتملة.' : 'Paddle is not configured.');
      const instance = paddle ?? (await initializePaddle({ environment: environment as Environments, token }));
      if (!instance) throw new Error(ar ? 'تعذر تشغيل بوابة الدفع.' : 'Could not initialize checkout.');
      if (!paddle) setPaddle(instance);
      const response = await fetch('/api/billing/credit-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faceValueSar: offer.faceValueSar }),
      });
      const payload = (await response.json()) as { transactionId?: string; error?: string };
      if (!response.ok || !payload.transactionId)
        throw new Error(payload.error || (ar ? 'تعذر تجهيز الدفع الآن.' : 'Unable to prepare payment.'));
      instance.Checkout.open({
        transactionId: payload.transactionId,
        settings: { displayMode: 'overlay', variant: 'one-page', successUrl: `${window.location.origin}/welcome` },
      });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : ar ? 'تعذر تجهيز الدفع الآن.' : 'Unable to prepare payment.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 py-8 md:p-10" dir={ar ? 'rtl' : 'ltr'}>
      <Link
        href="/dashboard/credits"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className={ar ? '' : 'rotate-180'} /> {ar ? 'العودة إلى النقاط' : 'Back to credits'}
      </Link>
      <header>
        <p className="resume-eyebrow">{ar ? 'مراجعة الطلب' : 'Order review'}</p>
        <h1 className="mt-1 text-3xl font-bold">{ar ? 'اختر طريقة الدفع' : 'Choose a payment method'}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {ar ? 'لن تتم إضافة ضريبة قيمة مضافة على هذا الطلب.' : 'No VAT is added to this order.'}
        </p>
      </header>

      <section className="rounded-md border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <strong className="text-xl">
              {offer.credits.toLocaleString('en-US')} {ar ? 'نقطة' : 'credits'}
            </strong>
            <p className="mt-1 text-sm text-muted-foreground">
              {ar ? 'رصيد إضافي لا تنتهي صلاحيته' : 'Additional credits that do not expire'}
            </p>
          </div>
          <div className="text-end">
            <span className="block text-sm text-muted-foreground line-through">
              {offer.faceValueSar.toFixed(2)} SAR
            </span>
            <strong className="text-3xl">{offer.payableAmountSar.toFixed(2)} SAR</strong>
            <small className="mt-1 block text-xs text-muted-foreground" dir="ltr">
              ≈ ${offer.usdAmount} USD
            </small>
          </div>
        </div>
      </section>

      {status && (
        <p role="status" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
          {status}
        </p>
      )}

      <section className="grid gap-3">
        <PaymentOption
          icon={<CreditCard />}
          title={ar ? 'بطاقة بنكية' : 'Card'}
          body={ar ? 'أكمل بأمان عبر Paddle.' : 'Continue securely with Paddle.'}
          onClick={() => void startPaddleCheckout()}
          disabled={loading}
        />
        <PaymentOption
          icon={<WalletCards />}
          title="PayPal"
          body={
            ar
              ? 'اختر PayPal داخل بوابة Paddle إذا كان متاحًا.'
              : 'Choose PayPal inside Paddle Checkout when available.'
          }
          onClick={() => void startPaddleCheckout()}
          disabled={loading}
        />
        <PaymentOption
          icon={<Landmark />}
          title={ar ? 'تحويل بنكي' : 'Bank transfer'}
          body={
            ar
              ? `ارفع الإيصال بعد التحويل لتحصل على ${offer.bankBonusCredits.toLocaleString('en-US')} نقطة هدية.`
              : `Upload your receipt after transfer and receive ${offer.bankBonusCredits.toLocaleString('en-US')} bonus credits.`
          }
          onClick={() => setBankOpen(true)}
        />
      </section>

      <BankTransferDialog open={bankOpen} onOpenChange={setBankOpen} kind="credits" faceValueSar={offer.faceValueSar} />
    </main>
  );
}

function PaymentOption({
  icon,
  title,
  body,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex items-center gap-4 rounded-md border bg-card p-5 text-start transition-colors hover:border-primary/50 hover:bg-primary/[0.03] disabled:opacity-60"
    >
      <span className="grid h-11 w-11 place-items-center rounded-md bg-primary/10 text-primary">{icon}</span>
      <span className="min-w-0 flex-1">
        <strong className="block">{title}</strong>
        <small className="mt-1 block text-muted-foreground">{body}</small>
      </span>
      <Building2 className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
    </button>
  );
}
