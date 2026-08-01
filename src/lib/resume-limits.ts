import type { EffectiveEntitlement, EffectivePlan } from '@/lib/effective-entitlement';

export type ResumeExportOperation = 'download' | 'email';

const savedResumeLimitByPlan: Record<EffectivePlan, number | null> = {
  free: null,
  trial_basic: 10,
  basic: 50,
  standard: 50,
  advanced: null,
};

const freeExportAllowanceByPlan: Record<EffectivePlan, number | null> = {
  free: 2,
  trial_basic: 10,
  basic: 50,
  standard: 50,
  advanced: null,
};

export function savedResumeLimit(plan: EffectivePlan) {
  return savedResumeLimitByPlan[plan];
}

export function freeExportAllowance(plan: EffectivePlan) {
  return freeExportAllowanceByPlan[plan];
}

export function resumeExportPeriodKey(entitlement: EffectiveEntitlement) {
  if (entitlement.plan === 'free') return 'free';

  const sourceId =
    entitlement.subscriptionId ??
    entitlement.accessGrantId ??
    entitlement.adminGrantId ??
    entitlement.accessUntil ??
    'active';
  return `${entitlement.plan}:${entitlement.source}:${sourceId}:${entitlement.accessUntil ?? 'active'}`;
}

export function resumeExportOperationKey(operation: ResumeExportOperation) {
  return operation === 'download' ? 'resume_download' : 'resume_email';
}
