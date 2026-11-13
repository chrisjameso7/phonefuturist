import { describe, expect, it } from 'vitest';
import { usagePresetDrainFactor } from './usage-preset-drain';

describe('usage preset workload intensity', () => {
  it('keeps corpus baseline unchanged without a scenario', () => {
    expect(usagePresetDrainFactor(undefined, 'gaming')).toBe(1);
    expect(usagePresetDrainFactor('Typical', 'web_browsing')).toBe(1);
  });
  it('does not charge browsing and video for gaming-level stress', () => {
    const browsing = usagePresetDrainFactor('Heavy', 'web_browsing');
    const video = usagePresetDrainFactor('Heavy', 'video_playback');
    const gaming = usagePresetDrainFactor('Heavy', 'gaming');
    expect(browsing).toBeLessThan(gaming);
    expect(video).toBeLessThan(gaming);
    expect(gaming).toBeLessThan(1.4);
  });
  it('maintains sensible ordering for each workload', () => {
    for (const workload of ['web_browsing', 'video_playback', 'gaming'] as const) {
      expect(usagePresetDrainFactor('Light', workload)).toBeLessThan(1);
      expect(usagePresetDrainFactor('Heavy', workload)).toBeGreaterThan(1);
    }
  });
});
