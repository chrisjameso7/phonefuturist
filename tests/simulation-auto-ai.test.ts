import { describe, expect, it } from 'vitest';
import { autoModelPrompt, validateAutoModel, type AutoModelRequest } from '../src/lib/simulation/auto-ai';

const request: AutoModelRequest = {
  deviceKey: 'future-phone',
  deviceName: 'Future Phone',
  intent: 'balanced',
  evidence: [
    { id: 'e1', kind: 'leak', claim: 'Battery is being evaluated around 5700 mAh.' },
    { id: 'e2', kind: 'historical', claim: 'Prior generation used a 5000 mAh pack.' },
  ],
};

describe('Auto AI model boundary', () => {
  it('preserves evidence-linked inference and rejects out-of-bounds values', () => {
    const model = validateAutoModel(request, {
      battery: {
        capacityMah: { min: 5600, max: 5800, mostLikely: 5700, confidence: 0.72, evidenceIds: ['e1'] },
        nominalVoltageV: { mostLikely: 99, confidence: 1, evidenceIds: ['e1'] },
      },
    });

    expect(model.mode).toBe('auto');
    expect(model.battery.capacityMah).toMatchObject({
      value: 5700,
      range: { min: 5600, max: 5800 },
      confidence: 0.72,
      sourceId: 'e1',
    });
    expect(model.battery.nominalVoltageV).toBeUndefined();
  });

  it('clamps confidence but never repairs an invalid reversed range', () => {
    const model = validateAutoModel(request, {
      display: {
        refreshRateHz: { min: 165, max: 120, confidence: 2 },
        brightnessNits: { mostLikely: 3000, confidence: 2 },
      },
    });
    expect(model.display.refreshRateHz).toBeUndefined();
    expect(model.display.brightnessNits?.confidence).toBe(1);
  });

  it('explicitly tells the model not to use memorized target outcomes', () => {
    const prompt = autoModelPrompt(request);
    expect(prompt).toContain('Do not use memorized final benchmark or battery-test answers');
    expect(prompt).toContain('[e1] leak');
    expect(prompt).toContain('OMIT it');
  });
});
