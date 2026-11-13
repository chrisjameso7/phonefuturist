/**
 * PhoneFuturist paid-access policy.
 * This module is intentionally payment-provider independent.
 * SECURITY: call resolveEntitlement only with trusted server-side billing state.
 * Never accept a client-provided plan or checkout redirect as proof of payment.
 */
export const PRO_PRICING = {
  currency: 'USD',
  monthlyCents: 499,
  annualCents: 3999,
} as const;

export const PRO_TRIAL_DAYS = 14;

export type Plan = 'free' | 'pro';
export type PaidFeature =
  | 'advanced-simulations'
  | 'soc-efficiency-reports'
  | 'expanded-comparisons'
  | 'camera-deep-analysis'
  | 'detailed-report-export';

export const FREE_COMPARISON_LIMIT = 2;
export const PRO_COMPARISON_LIMIT = 5;

export interface TrustedSubscription {
  userId: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'incomplete_expired' | 'paused';
  currentPeriodEnd?: string | null;
  trialStart?: string | null;
  trialEnd?: string | null;
}

/** Grant access only with trusted, unexpired billing or trial timestamps. */
export function resolveEntitlement(subscription: TrustedSubscription | null, userId: string, now = new Date()): Plan {
  if (!subscription || !userId || subscription.userId !== userId) return 'free';
  if (subscription.status !== 'active' && subscription.status !== 'trialing') return 'free';
  if (subscription.status === 'trialing') {
    // A trial must have trusted start/end timestamps, never just a trialing flag.
    if (!subscription.trialStart || !subscription.trialEnd) return 'free';
    const start = new Date(subscription.trialStart);
    const end = new Date(subscription.trialEnd);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return 'free';
    if (start.getTime() > now.getTime() || end.getTime() <= now.getTime()) return 'free';
    if (end.getTime() - start.getTime() > PRO_TRIAL_DAYS * 86400000) return 'free';
  }
  if (subscription.status === 'active' && !subscription.currentPeriodEnd) return 'free';
  if (subscription.currentPeriodEnd) {
    const end = new Date(subscription.currentPeriodEnd);
    if (!Number.isFinite(end.getTime()) || end.getTime() <= now.getTime()) return 'free';
  }
  return 'pro';
}

export function hasPaidFeature(plan: Plan, _feature: PaidFeature): boolean {
  return plan === 'pro';
}

export function comparisonLimit(plan: Plan): number {
  return plan === 'pro' ? PRO_COMPARISON_LIMIT : FREE_COMPARISON_LIMIT;
}

/** Fail closed. Payment collection is deliberately disabled until verified billing is wired up. */
export const CHECKOUT_ENABLED = false;
