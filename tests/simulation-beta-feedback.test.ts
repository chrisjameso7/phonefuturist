import { describe, expect, it } from 'vitest';
import {
  canTriageBetaFeedback,
  createBetaFeedbackReference,
  isBetaFeedbackStatus,
  validateBetaFeedbackSubmission,
} from '../src/lib/simulation/beta-feedback';

describe('beta feedback payload validation', () => {
  it('accepts a reproducible simulator report', () => {
    const result =
      validateBetaFeedbackSubmission({
        category: 'wrong-result',
        message: 'Charging time looks too slow.',
        expectedBehavior:
          'I expected the 60 W result to be closer to comparable phones.',
        simulatorMode: 'advanced',
        versions: {
          simulatorVersion: '0.6.0',
          engineVersion: '0.6.0',
          corpusVersion: 'registry-1',
        },
        snapshot: {
          batteryMah: 5700,
          wiredChargingWatts: 60,
        },
      });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value.category).toBe(
        'wrong-result',
      );
      expect(result.value.message).toBe(
        'Charging time looks too slow.',
      );
      expect(result.value.snapshot).toEqual({
        batteryMah: 5700,
        wiredChargingWatts: 60,
      });
    }
  });

  it('rejects missing notes and invalid categories', () => {
    expect(
      validateBetaFeedbackSubmission({
        category: 'nonsense',
        message: 'Test',
        simulatorMode: 'simple',
        versions: {},
        snapshot: {},
      }).ok,
    ).toBe(false);

    expect(
      validateBetaFeedbackSubmission({
        category: 'broken',
        message: '   ',
        simulatorMode: 'simple',
        versions: {},
        snapshot: {},
      }).ok,
    ).toBe(false);
  });

  it('caps text fields and rejects oversized snapshots', () => {
    const longMessage = 'x'.repeat(5000);

    const accepted =
      validateBetaFeedbackSubmission({
        category: 'other',
        message: longMessage,
        expectedBehavior: longMessage,
        simulatorMode: 'simple',
        versions: {},
        snapshot: { ok: true },
      });

    expect(accepted.ok).toBe(true);

    if (accepted.ok) {
      expect(accepted.value.message).toHaveLength(
        4000,
      );
      expect(
        accepted.value.expectedBehavior,
      ).toHaveLength(4000);
    }

    const rejected =
      validateBetaFeedbackSubmission({
        category: 'other',
        message: 'Large snapshot',
        simulatorMode: 'simple',
        versions: {},
        snapshot: {
          payload: 'x'.repeat(120_001),
        },
      });

    expect(rejected.ok).toBe(false);
  });

  it('creates stable beta references from report IDs', () => {
    const result = createBetaFeedbackReference(
      '12345678-1234-1234-1234-123456789abc',
    );

    expect(result).toEqual({
      id: '12345678-1234-1234-1234-123456789abc',
      reference: 'PF-BETA-12345678',
    });
  });
});


describe('beta feedback triage helpers', () => {
  it('recognizes only supported report statuses', () => {
    expect(isBetaFeedbackStatus('new')).toBe(true);
    expect(isBetaFeedbackStatus('reviewing')).toBe(true);
    expect(isBetaFeedbackStatus('planned')).toBe(true);
    expect(isBetaFeedbackStatus('fixed')).toBe(true);
    expect(isBetaFeedbackStatus('wont_fix')).toBe(true);
    expect(isBetaFeedbackStatus('deleted')).toBe(false);
  });

  it('allows verified editorial staff and denies ordinary accounts', () => {
    expect(
      canTriageBetaFeedback({
        active: true,
        verified: true,
        roles: ['editor'],
        mfa_required: false,
        aal: 'aal1',
      }),
    ).toBe(true);

    expect(
      canTriageBetaFeedback({
        active: true,
        verified: true,
        roles: [],
        mfa_required: false,
        aal: 'aal1',
      }),
    ).toBe(false);
  });

  it('requires aal2 whenever the access state says MFA is required', () => {
    expect(
      canTriageBetaFeedback({
        active: true,
        verified: true,
        roles: ['admin'],
        mfa_required: true,
        aal: 'aal1',
      }),
    ).toBe(false);

    expect(
      canTriageBetaFeedback({
        active: true,
        verified: true,
        roles: ['admin'],
        mfa_required: true,
        aal: 'aal2',
      }),
    ).toBe(true);
  });
});
