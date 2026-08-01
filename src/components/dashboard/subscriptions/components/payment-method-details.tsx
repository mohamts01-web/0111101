'use client';

import { PaymentMethodDetails as PaddlePaymentMethodDetails } from '@paddle/paddle-node-sdk';
import { CreditCard } from 'lucide-react';
import { useLocale } from '@/components/localization/locale-provider';

const PaymentMethodLabels: Record<PaddlePaymentMethodDetails['type'], string> = {
  card: 'Card',
  alipay: 'Alipay',
  wire_transfer: 'Wire Transfer',
  apple_pay: 'Apple Pay',
  google_pay: 'Google Pay',
  paypal: 'PayPal',
  ideal: 'iDEAL',
  bancontact: 'Bancontact',
  blik: 'BLIK',
  kakao_pay: 'Kakao Pay',
  korea_local: 'Korean Local Payment',
  south_korea_local_card: 'South Korea Local Card',
  mb_way: 'MB WAY',
  naver_pay: 'Naver Pay',
  payco: 'Payco',
  pix: 'Pix',
  samsung_pay: 'Samsung Pay',
  upi: 'UPI',
  wechat_pay: 'WeChat Pay',
  offline: 'Offline',
  unknown: 'Unknown',
};

interface Props {
  type: PaddlePaymentMethodDetails['type'];
  card?: PaddlePaymentMethodDetails['card'];
}

export function PaymentMethodDetails({ type, card }: Props) {
  const { locale } = useLocale();
  if (type === 'card') {
    return (
      <>
        <CreditCard size={18} />
        <span className={'text-base text-muted-foreground leading-4'}>**** {card?.last4}</span>
      </>
    );
  } else {
    const label =
      type === 'unknown'
        ? locale === 'ar'
          ? 'غير معروف'
          : 'Unknown'
        : type === 'wire_transfer'
          ? locale === 'ar'
            ? 'تحويل بنكي'
            : 'Wire Transfer'
          : type === 'offline'
            ? locale === 'ar'
              ? 'دفع غير إلكتروني'
              : 'Offline'
            : PaymentMethodLabels[type];
    return type ? <span className={'text-base text-muted-foreground leading-4'}>{label}</span> : '-';
  }
}
