import { PricingTier, type EntitlementPlanId } from '@/constants/pricing-tier';

export const SAR_PER_USD = 3.75;
export const CREDIT_FACE_VALUES = [10, 20, 30, 50, 75, 100, 150, 200, 300, 500] as const;

export type CreditOffer = {
  faceValueSar: number;
  payableAmountSar: number;
  discountPercent: number;
  credits: number;
  bankBonusCredits: number;
  usdAmount: string;
  usdCents: number;
};

export function creditDiscountPercent(amountSar: number) {
  if (amountSar >= 500) return 10;
  if (amountSar >= 300) return 9;
  if (amountSar >= 200) return 8;
  if (amountSar >= 150) return 7;
  if (amountSar >= 100) return 6;
  if (amountSar >= 75) return 5;
  if (amountSar >= 50) return 4;
  if (amountSar >= 30) return 3;
  if (amountSar >= 20) return 2;
  return 1;
}

export function getCreditOffer(faceValueSar: number): CreditOffer {
  const normalized = Math.min(1000, Math.max(10, Math.round(faceValueSar)));
  const discountPercent = creditDiscountPercent(normalized);
  const payableAmountSar = Number((normalized * (1 - discountPercent / 100)).toFixed(2));
  const credits = normalized * 10;
  const usdCents = Math.max(50, Math.round((payableAmountSar / SAR_PER_USD) * 100));
  return {
    faceValueSar: normalized,
    payableAmountSar,
    discountPercent,
    credits,
    bankBonusCredits: Math.floor(credits * 0.05),
    usdAmount: (usdCents / 100).toFixed(2),
    usdCents,
  };
}

export function planDurationEnd(plan: EntitlementPlanId, startsAt = new Date()) {
  const endsAt = new Date(startsAt);
  if (plan === 'trial_basic') endsAt.setDate(endsAt.getDate() + 7);
  if (plan === 'basic') endsAt.setMonth(endsAt.getMonth() + 1);
  if (plan === 'advanced') endsAt.setMonth(endsAt.getMonth() + 3);
  return endsAt;
}

export function tierForEntitlement(plan?: string | null) {
  return PricingTier.find((tier) => tier.entitlementPlan === plan);
}
