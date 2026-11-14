import { describe, expect, it } from 'vitest';
import {
  canResolvePredictionReality,
  validatePredictionSnapshotForStorage,
  validateRealitySnapshotForStorage,
} from '../src/lib/simulation/prediction-history';

describe('prediction history persistence validation', () => {
  it('accepts a bounded UUID prediction snapshot', () => {
    const result =
      validatePredictionSnapshotForStorage({
        id: '11111111-1111-4111-8111-111111111111',
        deviceName: 'Future Phone',
        createdAt:
          '2026-10-10T00:00:00.000Z',
        metrics: [
          {
            key: 'battery',
            label: 'Battery',
            value: 5700,
            unit: 'mAh',
          },
        ],
      });

    expect(result.ok).toBe(true);
  });

  it('rejects non-UUID persisted prediction ids and non-finite metrics', () => {
    const badId =
      validatePredictionSnapshotForStorage({
        id: 'prediction-1',
        deviceName: 'Phone',
        createdAt:
          '2026-10-10T00:00:00.000Z',
        metrics: [],
      });

    expect(badId.ok).toBe(false);

    const badValue =
      validatePredictionSnapshotForStorage({
        id: '11111111-1111-4111-8111-111111111111',
        deviceName: 'Phone',
        createdAt:
          '2026-10-10T00:00:00.000Z',
        metrics: [
          {
            key: 'score',
            label: 'Score',
            value: Number.POSITIVE_INFINITY,
            unit: 'points',
          },
        ],
      });

    expect(badValue.ok).toBe(false);
  });

  it('requires reality observations to have measured timestamps and matching UUID-shaped ids', () => {
    const valid =
      validateRealitySnapshotForStorage({
        id: '22222222-2222-4222-8222-222222222222',
        predictionId:
          '11111111-1111-4111-8111-111111111111',
        createdAt:
          '2026-10-10T00:00:00.000Z',
        metrics: [
          {
            key: 'battery',
            value: 5600,
            unit: 'mAh',
            measuredAt:
              '2026-10-09T00:00:00.000Z',
          },
        ],
      });

    expect(valid.ok).toBe(true);

    const missingMeasurementTime =
      validateRealitySnapshotForStorage({
        id: '22222222-2222-4222-8222-222222222222',
        predictionId:
          '11111111-1111-4111-8111-111111111111',
        createdAt:
          '2026-10-10T00:00:00.000Z',
        metrics: [
          {
            key: 'battery',
            value: 5600,
            unit: 'mAh',
          },
        ],
      });

    expect(
      missingMeasurementTime.ok,
    ).toBe(false);
  });

  it('requires editorial roles and MFA when the access state requires it', () => {
    expect(
      canResolvePredictionReality({
        active: true,
        verified: true,
        roles: ['editor'],
        mfa_required: false,
        aal: 'aal1',
      }),
    ).toBe(true);

    expect(
      canResolvePredictionReality({
        active: true,
        verified: true,
        roles: ['publisher'],
        mfa_required: true,
        aal: 'aal1',
      }),
    ).toBe(false);

    expect(
      canResolvePredictionReality({
        active: true,
        verified: true,
        roles: ['publisher'],
        mfa_required: true,
        aal: 'aal2',
      }),
    ).toBe(true);

    expect(
      canResolvePredictionReality({
        active: true,
        verified: true,
        roles: ['writer'],
        mfa_required: false,
        aal: 'aal1',
      }),
    ).toBe(false);
  });
});
