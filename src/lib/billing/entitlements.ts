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
}

/** Current access requires active/trialing server-verified state and an unexpired period when given. */
export function resolveEntitlement(subscription: TrustedSubscription | null, userId: string, now = new Date()): Plan {
  if (!subscription || !userId || subscription.userId !== userId) return 'free';
  if (subscription.status !== 'active' && subscription.status !== 'trialing') return 'free';
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
