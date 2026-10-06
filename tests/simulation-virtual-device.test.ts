import { describe, expect, it } from 'vitest';
import { restoreAutoParameter, withUserOverride, type VirtualParameter } from '../src/lib/simulation/virtual-device';

describe('virtual device parameter ownership', () => {
  it('marks a live user adjustment as user provenance while retaining Auto state', () => {
    const auto: VirtualParameter = {
      range: { min: 5600, max: 5800 },
      provenance: { kind: 'modeled', note: 'Evidence-derived capacity range' },
      confidence: 0.72,
      sourceId: 'battery-evidence-1',
    };
    const overridden = withUserOverride(auto, 5750);
    expect(overridden.value).toBe(5750);
    expect(overridden.provenance.kind).toBe('user');
    expect(overridden.overriddenFrom).toMatchObject({
      confidence: 0.72,
      sourceId: 'battery-evidence-1',
    });
  });

  it('restores the Auto parameter without keeping user provenance', () => {
    const auto: VirtualParameter = {
      value: 5700,
      provenance: { kind: 'reported' },
    };
    const restored = restoreAutoParameter(withUserOverride(auto, 5850));
    expect(restored).toEqual(auto);
  });

  it('rejects non-finite overrides rather than contaminating a simulation', () => {
    expect(() => withUserOverride(undefined, Number.NaN)).toThrow();
  });
});
