import { describe, expect, it } from 'vitest';
import { CHECKOUT_ENABLED, PRO_PRICING, PRO_TRIAL_DAYS, comparisonLimit, hasPaidFeature, resolveEntitlement } from '../src/lib/billing/entitlements';

describe('Pro entitlements', () => {
  const now = new Date('2026-10-13T12:00:00Z');
  const subscription = { userId: 'user-1', status: 'active' as const, currentPeriodEnd: '2026-11-13T00:00:00Z' };
  it('uses fixed USD pricing and does not enable payment collection prematurely', () => {
    expect(PRO_PRICING).toEqual({currency:'USD', monthlyCents:499, annualCents:3999});
    expect(CHECKOUT_ENABLED).toBe(false);
  });
  it('grants Pro only to the server-verified account', () => {
    expect(resolveEntitlement(subscription, 'user-1', now)).toBe('pro');
    expect(resolveEntitlement(subscription, 'other-user', now)).toBe('free');
    expect(resolveEntitlement(null, 'user-1', now)).toBe('free');
  });
  it('fails closed for unpaid, expired, or invalid states', () => {
    expect(resolveEntitlement({...subscription,status:'past_due'}, 'user-1', now)).toBe('free');
    expect(resolveEntitlement({...subscription,status:'canceled'}, 'user-1', now)).toBe('free');
    expect(resolveEntitlement({...subscription,currentPeriodEnd:'2026-10-01T00:00:00Z'}, 'user-1', now)).toBe('free');
    expect(resolveEntitlement({...subscription,currentPeriodEnd:'invalid'}, 'user-1', now)).toBe('free');
  });
  it('grants exactly 14 days of trial access from trusted timestamps', () => {
    const trial = {
      userId: 'user-1',
      status: 'trialing' as const,
      trialStart: '2026-10-13T12:00:00Z',
      trialEnd: '2026-10-27T12:00:00Z',
    };
    expect(PRO_TRIAL_DAYS).toBe(14);
    expect(resolveEntitlement(trial, 'user-1', now)).toBe('pro');
    expect(resolveEntitlement(trial, 'user-1', new Date('2026-10-27T11:59:59Z'))).toBe('pro');
    expect(resolveEntitlement(trial, 'user-1', new Date('2026-10-27T12:00:00Z'))).toBe('free');
    expect(resolveEntitlement(trial, 'other-user', now)).toBe('free');
    expect(resolveEntitlement({...trial, trialEnd:'2026-11-13T12:00:00Z'}, 'user-1', now)).toBe('free');
    expect(resolveEntitlement({...trial, trialEnd:'invalid'}, 'user-1', now)).toBe('free');
    expect(resolveEntitlement({...trial, trialStart:undefined}, 'user-1', now)).toBe('free');
    expect(resolveEntitlement({...trial, trialStart:'2026-10-14T12:00:00Z'}, 'user-1', now)).toBe('free');
  });
  it('keeps advanced access and expanded comparison limits behind Pro', () => {
    expect(hasPaidFeature('free','advanced-simulations')).toBe(false);
    expect(hasPaidFeature('pro','advanced-simulations')).toBe(true);
    expect(comparisonLimit('free')).toBe(2);
    expect(comparisonLimit('pro')).toBe(5);
  });
});
