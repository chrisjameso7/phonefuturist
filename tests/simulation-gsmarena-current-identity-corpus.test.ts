import { describe, expect, it } from 'vitest';
import {
  buildGsmArenaCurrentIdentityCorpus,
} from '../src/lib/simulation/modules/gsmarena-current-identity-corpus';

describe('current bulk identity expansion', () => {
  it('keeps at least one thousand sourced device identities in the expansion corpus', () => {
    const corpus =
      buildGsmArenaCurrentIdentityCorpus();

    expect(
      corpus.devices.length,
    ).toBeGreaterThanOrEqual(1000);
    expect(
      corpus.measurements,
    ).toEqual([]);
  });

  it('keeps catalog identities measurement-free until lab or official evidence is attached', () => {
    const corpus =
      buildGsmArenaCurrentIdentityCorpus();

    expect(
      corpus.measurements.length,
    ).toBe(0);

    expect(
      corpus.devices.every(
        (device) =>
          (device.sourceIds?.length ??
            0) >
          0,
      ),
    ).toBe(true);
  });
});
