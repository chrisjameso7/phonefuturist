import { describe, expect, it } from 'vitest';
import {
  buildCrossLabBatteryContext,
} from '../src/lib/simulation/modules/cross-lab-battery-context';

describe('cross-lab battery context', () => {
  it('preserves Geekerwan and PhoneArena as separate protocols for the same phone', () => {
    const result =
      buildCrossLabBatteryContext(
        'Samsung',
        'Galaxy S26 Ultra',
      );

    expect(result.status).toBe('resolved');
    expect(result.evidenceCount).toBe(2);
    expect(result.geekerwan).toBeDefined();
    expect(result.phoneArena).toBeDefined();
    expect(result.labAgreement).toBe(
      'cross-lab-context',
    );
    expect(
      result.warnings.some(
        (warning) =>
          warning.includes(
            'must not be averaged',
          ),
      ),
    ).toBe(true);
  });

  it('keeps a single-lab result partial rather than inventing agreement', () => {
    const result =
      buildCrossLabBatteryContext(
        'Xiaomi',
        'Redmi Note 17 Pro Max 5G',
      );

    expect(
      result.phoneArena,
    ).toBeDefined();
    expect(result.status).toBe('partial');
    expect(result.labAgreement).toBe(
      'single-lab',
    );
  });

  it('fails closed when neither lab has the exact device', () => {
    const result =
      buildCrossLabBatteryContext(
        'Example',
        'Future Phone 3000',
      );

    expect(result.status).toBe(
      'unresolved',
    );
    expect(result.evidenceCount).toBe(0);
  });
});
