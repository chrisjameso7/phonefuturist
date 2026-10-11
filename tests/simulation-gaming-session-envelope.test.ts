import { describe, expect, it } from 'vitest';
import {
  calculateGamingSessionEnvelope,
} from '../src/lib/simulation/modules/gaming-session-envelope';

describe('gaming session thermal envelope', () => {
  it('classifies early thermal throttling within a gaming session', () => {
    const result =
      calculateGamingSessionEnvelope({
        sessionDurationMinutes: 30,
        throttleStartSecond: 180,
        sustainedPerformancePercent: 70,
      });

    expect(result.status).toBe('resolved');
    expect(result.thermalState).toBe(
      'early-throttle',
    );
    expect(
      result.percentOfSessionBeforeThrottle,
    ).toBeCloseTo(10, 8);
    expect(
      result.minutesBeforeThrottle,
    ).toBeCloseTo(3, 8);
  });

  it('marks throttling after the session as not observed within the session', () => {
    const result =
      calculateGamingSessionEnvelope({
        sessionDurationMinutes: 20,
        throttleStartSecond: 1800,
      });

    expect(result.thermalState).toBe(
      'no-throttle-observed',
    );
    expect(
      result.percentOfSessionBeforeThrottle,
    ).toBe(100);
  });

  it('does not convert sustained percentage into FPS', () => {
    const result =
      calculateGamingSessionEnvelope({
        sessionDurationMinutes: 45,
        sustainedPerformancePercent: 55,
      });

    expect(result.status).toBe('resolved');
    expect(result.note).toContain(
      'does not convert sustained-performance percentage directly into FPS',
    );
  });
});
