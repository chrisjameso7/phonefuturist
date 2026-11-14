import { describe, expect, it } from 'vitest';
import {
  calculateGamingDisplayEnvelope,
} from '../src/lib/simulation/modules/gaming-display-envelope';

describe('gaming display refresh envelope', () => {
  it('flags a target FPS above operating refresh', () => {
    const result =
      calculateGamingDisplayEnvelope({
        targetFps: 120,
        operatingRefreshRateHz: 60,
        maxRefreshRateHz: 120,
      });

    expect(result.status).toBe('resolved');
    expect(
      result.visibleFrameRateCeilingFps,
    ).toBe(60);
    expect(
      result.targetExceedsOperatingRefresh,
    ).toBe(true);
    expect(
      result.targetExceedsPanelMaximum,
    ).toBe(false);
  });

  it('shows positive refresh headroom when target FPS is below display refresh', () => {
    const result =
      calculateGamingDisplayEnvelope({
        targetFps: 90,
        operatingRefreshRateHz: 120,
      });

    expect(result.refreshHeadroomFps).toBe(30);
    expect(
      result.targetExceedsOperatingRefresh,
    ).toBe(false);
  });

  it('does not claim the GPU can achieve the target FPS', () => {
    const result =
      calculateGamingDisplayEnvelope({
        targetFps: 144,
        maxRefreshRateHz: 165,
      });

    expect(result.status).toBe('resolved');
    expect(result.note).toContain(
      'does not predict whether the GPU can actually achieve',
    );
  });
});
