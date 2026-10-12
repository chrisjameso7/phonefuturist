import { describe, expect, it } from 'vitest';
import { SIMPLE_USAGE_SCENARIOS } from '../src/lib/simulation/simple-usage-scenarios';

describe('simple usage profiles', () => {
  it('offers increasingly demanding active use without implying population averages', () => {
    const minutes = (preset: keyof typeof SIMPLE_USAGE_SCENARIOS) => {
      const scenario = SIMPLE_USAGE_SCENARIOS[preset];
      return 60 * (Number(scenario.webHours) + Number(scenario.videoHours) + Number(scenario.gamingHours));
    };
    expect(minutes('Light')).toBeLessThan(minutes('Typical'));
    expect(minutes('Typical')).toBeLessThan(minutes('Heavy'));
    for (const scenario of Object.values(SIMPLE_USAGE_SCENARIOS)) {
      expect(scenario.disclaimer).toMatch(/illustrative/i);
    }
  });
});
