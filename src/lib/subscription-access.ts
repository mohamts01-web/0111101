export type PaidAccessStatus = 'active' | 'trialing' | 'canceled' | 'paused' | 'past_due' | string;

export function subscriptionGrantsPaidAccess(
  status: PaidAccessStatus | null | undefined,
  _accessUntil?: string | Date | null,
): boolean {
  void _accessUntil;
  return status === 'active' || status === 'trialing';
}
