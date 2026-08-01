import { CreditPaymentMethods } from '@/components/dashboard/credits/credit-payment-methods';

export default async function CreditCheckoutPage({ searchParams }: { searchParams: Promise<{ amount?: string }> }) {
  const { amount } = await searchParams;
  const parsed = Number(amount);
  return <CreditPaymentMethods amount={Number.isFinite(parsed) ? parsed : 10} />;
}
