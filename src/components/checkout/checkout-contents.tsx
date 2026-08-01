'use client';

import { PriceSection } from '@/components/checkout/price-section';
import { PricingTier } from '@/constants/pricing-tier';
import { type Environments, initializePaddle, type Paddle, type Theme } from '@paddle/paddle-js';
import type { CheckoutEventsData } from '@paddle/paddle-js/types/checkout/events';
import { Building2, CreditCard, WalletCards } from 'lucide-react';
import throttle from 'lodash.throttle';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePaddlePrices } from '@/hooks/usePaddlePrices';
import { useLocale } from '@/components/localization/locale-provider';

interface PathParams {
  priceId: string;
  [key: string]: string | string[];
}

interface Props {
  userEmail?: string;
  country?: string;
  sarReference?: string;
}

export function CheckoutContents({ userEmail, country, sarReference }: Props) {
  const { locale } = useLocale();
  const { priceId } = useParams<PathParams>();
  const [quantity, setQuantity] = useState(1);
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [checkoutData, setCheckoutData] = useState<CheckoutEventsData | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal' | null>(null);
  const [theme, setTheme] = useState<Theme>('light');
  const [themeReady, setThemeReady] = useState(false);
  const checkoutTheme = useRef<Theme>('light');
  const checkoutLocale = useRef(locale);
  const allowQuantity = !PricingTier.some((tier) => tier.priceId === priceId);
  const { prices: previewPrices, loading: previewLoading } = usePaddlePrices(
    paddle,
    country,
    priceId ? [priceId] : [],
    quantity,
  );

  const updateItems = useMemo(
    () =>
      throttle((instance: Paddle, currentPriceId: string, currentQuantity: number) => {
        instance.Checkout.updateItems([{ priceId: currentPriceId, quantity: currentQuantity }]);
      }, 1000),
    [],
  );

  useEffect(() => () => updateItems.cancel(), [updateItems]);

  useEffect(() => {
    const readTheme = () => setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    readTheme();
    setThemeReady(true);
    window.addEventListener('cv-theme-change', readTheme);
    return () => window.removeEventListener('cv-theme-change', readTheme);
  }, []);

  useEffect(() => {
    if (!paddle?.Initialized || !paymentMethod) return;
    checkoutTheme.current = theme;
    checkoutLocale.current = locale;
    paddle.Checkout.close();
    const reopenTimer = window.setTimeout(() => {
      paddle.Checkout.open({
        ...(userEmail && { customer: { email: userEmail } }),
        items: [{ priceId, quantity }],
        settings: getCheckoutSettings(theme, !userEmail, locale),
      });
    }, 100);
    return () => window.clearTimeout(reopenTimer);
  }, [locale, paddle, paymentMethod, priceId, quantity, theme, userEmail]);

  useEffect(() => {
    if (
      !themeReady ||
      paddle?.Initialized ||
      !process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ||
      !process.env.NEXT_PUBLIC_PADDLE_ENV
    ) {
      return;
    }

    checkoutTheme.current = theme;
    checkoutLocale.current = locale;
    initializePaddle({
      token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
      environment: process.env.NEXT_PUBLIC_PADDLE_ENV as Environments,
      eventCallback: (event) => {
        if (event.data && event.name) setCheckoutData(event.data);
      },
      checkout: { settings: getCheckoutSettings(theme, !userEmail, locale) },
    }).then((instance) => {
      if (!instance || !priceId) return;
      setPaddle(instance);
    });
  }, [locale, paddle?.Initialized, priceId, theme, themeReady, userEmail]);

  useEffect(() => {
    if (paddle?.Initialized && priceId) updateItems(paddle, priceId, quantity);
  }, [paddle, priceId, quantity, updateItems]);

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="grid min-w-0 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="min-w-0 border-b border-border p-5 md:border-b-0 md:border-e md:p-8">
          <PriceSection
            checkoutData={checkoutData}
            quantity={quantity}
            handleQuantityChange={setQuantity}
            allowQuantity={allowQuantity}
            previewPrice={previewPrices.local[priceId]}
            usdPrice={previewPrices.usd[priceId]}
            sarPrice={sarReference}
            previewLoading={previewLoading}
          />
        </div>
        <div className="min-w-0 p-5 md:p-8">
          <div className="mb-6 text-base font-semibold">{locale === 'ar' ? 'تفاصيل الدفع' : 'Payment details'}</div>
          {paymentMethod ? (
            <div className="paddle-checkout-frame min-h-[450px] w-full min-w-0" dir="ltr" />
          ) : (
            <div className="grid gap-3">
              <PaymentMethodOption
                icon={<CreditCard />}
                title={locale === 'ar' ? 'بطاقة بنكية' : 'Card'}
                body={locale === 'ar' ? 'أكمل بأمان عبر Paddle.' : 'Continue securely with Paddle.'}
                onClick={() => setPaymentMethod('card')}
              />
              <PaymentMethodOption
                icon={<WalletCards />}
                title="PayPal"
                body={
                  locale === 'ar'
                    ? 'اختر PayPal داخل بوابة Paddle إذا كان متاحًا.'
                    : 'Choose PayPal inside Paddle Checkout when available.'
                }
                onClick={() => setPaymentMethod('paypal')}
              />
              <Link
                className="group flex items-center gap-4 rounded-md border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-primary/[0.03]"
                href={bankHref(priceId)}
              >
                <span className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block">{locale === 'ar' ? 'تحويل بنكي' : 'Bank transfer'}</strong>
                  <small className="mt-1 block text-muted-foreground">
                    {locale === 'ar'
                      ? 'ارفع الإيصال ليُراجع طلبك من الإدارة.'
                      : 'Upload the receipt for an admin review.'}
                  </small>
                </span>
              </Link>
              <p className="text-xs text-muted-foreground">
                {locale === 'ar' ? 'لا تضاف ضريبة قيمة مضافة على هذا الطلب.' : 'No VAT is added to this order.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function bankHref(priceId: string) {
  const tier = PricingTier.find((item) => item.priceId === priceId);
  return tier ? `/dashboard/credits?bank=subscription&plan=${tier.entitlementPlan}` : '/dashboard/credits';
}

function PaymentMethodOption({
  icon,
  title,
  body,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-4 rounded-md border bg-card p-4 text-start transition-colors hover:border-primary/50 hover:bg-primary/[0.03]"
    >
      <span className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">{icon}</span>
      <span className="min-w-0 flex-1">
        <strong className="block">{title}</strong>
        <small className="mt-1 block text-muted-foreground">{body}</small>
      </span>
    </button>
  );
}

function getCheckoutSettings(theme: Theme, allowLogout: boolean, locale: 'ar' | 'en') {
  return {
    variant: 'one-page' as const,
    displayMode: 'inline' as const,
    theme,
    locale,
    allowLogout,
    frameTarget: 'paddle-checkout-frame',
    frameInitialHeight: 450,
    frameStyle: 'width: 100%; min-width: 0; background-color: transparent; border: none',
    successUrl: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/checkout/success`,
  };
}
