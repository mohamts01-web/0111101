import type { SupabaseClient } from '@supabase/supabase-js';
import { tierForPriceId } from '@/constants/pricing-tier';

export type EffectivePlan = 'free' | 'trial_basic' | 'basic' | 'standard' | 'advanced';

export type EffectiveEntitlement = {
  plan: EffectivePlan;
  source: 'free' | 'paddle' | 'admin' | 'bank_transfer' | 'paddle_transaction';
  trial_ends_at: string | null;
  monthly_credits: number;
  purchased_credits: number;
  promotional_credits: number;
  adminGrantCredits: number;
  monthly_credits_expire_at: string | null;
  totalCredits: number;
  monthlyAllocation: number;
  monthlyUsed: number;
  usagePercent: number;
  subscriptionId: string | null;
  subscriptionStatus: string | null;
  subscriptionAccessUntil: string | null;
  adminGrantId: string | null;
  adminGrantEndsAt: string | null;
  accessGrantId: string | null;
  accessGrantCredits: number;
  accessUntil: string | null;
  hasPaidAccess: boolean;
};

export type EntitlementWallet = {
  plan?: string | null;
  trial_ends_at?: string | null;
  monthly_credits?: number | null;
  purchased_credits?: number | null;
  promotional_credits?: number | null;
  monthly_credits_expire_at?: string | null;
} | null;

export type EntitlementSubscription = {
  subscription_id: string;
  subscription_status: string;
  price_id: string | null;
  access_until: string | null;
  updated_at?: string | null;
};

export type EntitlementAdminGrant = {
  id: string;
  plan: string;
  ends_at: string;
  credits_granted: number | null;
  credits_remaining: number | null;
  status: string;
  starts_at: string;
};

export type EntitlementAccessGrant = EntitlementAdminGrant & {
  source: 'bank_transfer' | 'paddle_transaction';
};

const allocationByPlan: Record<EffectivePlan, number> = {
  free: 0,
  trial_basic: 50,
  basic: 300,
  standard: 700,
  advanced: 2400,
};

const planRank: Record<EffectivePlan, number> = {
  free: 0,
  trial_basic: 1,
  basic: 1,
  standard: 2,
  advanced: 3,
};

export async function resolveEffectiveEntitlement(
  supabase: SupabaseClient,
  userId: string,
): Promise<EffectiveEntitlement> {
  const now = Date.now();
  const [
    { data: wallet, error: walletError },
    { data: customer, error: customerError },
    { data: grants, error: grantsError },
    { data: accessGrants, error: accessGrantsError },
  ] = await Promise.all([
    supabase
      .from('user_entitlements')
      .select('plan,trial_ends_at,monthly_credits,purchased_credits,promotional_credits,monthly_credits_expire_at')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase.from('customers').select('customer_id').eq('user_id', userId).maybeSingle(),
    supabase
      .from('admin_plan_grants')
      .select('id,plan,ends_at,credits_granted,credits_remaining,status,starts_at')
      .eq('user_id', userId)
      .eq('status', 'active')
      .lte('starts_at', new Date(now).toISOString())
      .gt('ends_at', new Date(now).toISOString())
      .order('ends_at', { ascending: false })
      .limit(1),
    supabase
      .from('plan_access_grants')
      .select('id,plan,source,ends_at,credits_granted,credits_remaining,status,starts_at')
      .eq('user_id', userId)
      .eq('status', 'active')
      .lte('starts_at', new Date(now).toISOString())
      .gt('ends_at', new Date(now).toISOString())
      .order('ends_at', { ascending: true }),
  ]);

  if (walletError || customerError || grantsError || accessGrantsError) {
    throw walletError ?? customerError ?? grantsError ?? accessGrantsError;
  }

  const { data: subscriptions, error: subscriptionError } = customer
    ? await supabase
        .from('subscriptions')
        .select('subscription_id,subscription_status,price_id,access_until,updated_at')
        .eq('customer_id', customer.customer_id)
        .order('updated_at', { ascending: false })
    : { data: [], error: null };

  if (subscriptionError) throw subscriptionError;

  return deriveEffectiveEntitlement({
    wallet,
    subscriptions: subscriptions ?? [],
    adminGrants: grants ?? [],
    accessGrants: accessGrants ?? [],
    now,
  });
}

/**
 * Shared decision engine for every surface that describes a user's plan.
 * Keeping it pure makes the admin list agree with the account and API views.
 */
export function deriveEffectiveEntitlement({
  wallet,
  subscriptions,
  adminGrants,
  accessGrants,
  now = Date.now(),
}: {
  wallet: EntitlementWallet;
  subscriptions: EntitlementSubscription[];
  adminGrants: EntitlementAdminGrant[];
  accessGrants: EntitlementAccessGrant[];
  now?: number;
}): EffectiveEntitlement {
  const latestSubscription =
    [...subscriptions].sort(
      (a, b) => new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime(),
    )[0] ?? null;
  const paidSubscription =
    subscriptions.find((subscription) => ['active', 'trialing'].includes(subscription.subscription_status)) ?? null;
  const paddleBasePlan = paidSubscription ? planForPriceId(paidSubscription.price_id) : 'free';
  const paddlePlan: EffectivePlan =
    paidSubscription?.subscription_status === 'trialing' && paddleBasePlan === 'basic' ? 'trial_basic' : paddleBasePlan;
  const grant =
    [...adminGrants]
      .filter(
        (item) =>
          item.status === 'active' &&
          new Date(item.starts_at).getTime() <= now &&
          new Date(item.ends_at).getTime() > now,
      )
      .sort((a, b) => new Date(b.ends_at).getTime() - new Date(a.ends_at).getTime())[0] ?? null;
  const grantPlan = (grant?.plan as EffectivePlan | undefined) ?? 'free';
  const accessGrant =
    [...accessGrants]
      .filter(
        (item) =>
          item.status === 'active' &&
          new Date(item.starts_at).getTime() <= now &&
          new Date(item.ends_at).getTime() > now,
      )
      .sort((a, b) => {
        const rank = planRank[b.plan as EffectivePlan] - planRank[a.plan as EffectivePlan];
        return rank || new Date(b.ends_at).getTime() - new Date(a.ends_at).getTime();
      })[0] ?? null;
  const accessPlan = (accessGrant?.plan as EffectivePlan | undefined) ?? 'free';
  const candidates = [
    {
      plan: paddlePlan,
      source: 'paddle' as const,
      endsAt: paidSubscription?.access_until ?? null,
      creditsGranted: allocationByPlan[paddlePlan],
      creditsRemaining: Number(wallet?.monthly_credits ?? 0),
    },
    {
      plan: grantPlan,
      source: 'admin' as const,
      endsAt: grant?.ends_at ?? null,
      creditsGranted: Number(grant?.credits_granted ?? 0),
      creditsRemaining: Number(grant?.credits_remaining ?? 0),
    },
    {
      plan: accessPlan,
      source: (accessGrant?.source ?? 'paddle_transaction') as 'bank_transfer' | 'paddle_transaction',
      endsAt: accessGrant?.ends_at ?? null,
      creditsGranted: Number(accessGrant?.credits_granted ?? 0),
      creditsRemaining: Number(accessGrant?.credits_remaining ?? 0),
    },
  ].sort((a, b) => {
    const rank = planRank[b.plan] - planRank[a.plan];
    return rank || new Date(b.endsAt ?? 0).getTime() - new Date(a.endsAt ?? 0).getTime();
  });
  const best = candidates[0];
  const plan = best.plan;
  const source = plan === 'free' ? 'free' : best.source;

  const monthlyCreditsValid = Boolean(
    paidSubscription && wallet?.monthly_credits_expire_at && new Date(wallet.monthly_credits_expire_at).getTime() > now,
  );
  const monthlyCredits = monthlyCreditsValid ? Number(wallet?.monthly_credits ?? 0) : 0;
  const purchasedCredits = Number(wallet?.purchased_credits ?? 0);
  const promotionalCredits = Number(wallet?.promotional_credits ?? 0);
  const adminGrantCredits = Number(grant?.credits_remaining ?? 0);
  const accessGrantCredits = accessGrants
    .filter(
      (item) =>
        item.status === 'active' && new Date(item.starts_at).getTime() <= now && new Date(item.ends_at).getTime() > now,
    )
    .reduce((total, item) => total + Number(item.credits_remaining ?? 0), 0);
  const totalCredits = monthlyCredits + purchasedCredits + promotionalCredits + adminGrantCredits + accessGrantCredits;
  const monthlyAllocation = plan === 'free' ? 0 : best.creditsGranted || allocationByPlan[plan];
  const monthlyUsed = Math.max(0, monthlyAllocation - best.creditsRemaining);
  const accessUntil = plan === 'free' ? null : best.endsAt;

  return {
    plan,
    source,
    trial_ends_at:
      plan === 'trial_basic'
        ? accessUntil
        : paidSubscription?.subscription_status === 'trialing'
          ? (wallet?.trial_ends_at ?? null)
          : null,
    monthly_credits: monthlyCredits,
    purchased_credits: purchasedCredits,
    promotional_credits: promotionalCredits,
    adminGrantCredits,
    monthly_credits_expire_at: monthlyCreditsValid ? (wallet?.monthly_credits_expire_at ?? null) : null,
    totalCredits,
    monthlyAllocation,
    monthlyUsed,
    usagePercent: monthlyAllocation ? Math.min(100, Math.round((monthlyUsed / monthlyAllocation) * 100)) : 0,
    subscriptionId: paidSubscription?.subscription_id ?? latestSubscription?.subscription_id ?? null,
    subscriptionStatus: paidSubscription?.subscription_status ?? latestSubscription?.subscription_status ?? null,
    subscriptionAccessUntil: paidSubscription?.access_until ?? latestSubscription?.access_until ?? null,
    adminGrantId: grant?.id ?? null,
    adminGrantEndsAt: grant?.ends_at ?? null,
    accessGrantId: accessGrant?.id ?? null,
    accessGrantCredits,
    accessUntil,
    hasPaidAccess: plan !== 'free' && Boolean(accessUntil && new Date(accessUntil).getTime() > now),
  };
}

function planForPriceId(priceId?: string | null): EffectivePlan {
  return tierForPriceId(priceId)?.entitlementPlan ?? 'free';
}
