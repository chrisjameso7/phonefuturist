import { describe, expect, it } from 'vitest';
import {
  GEEKERWAN_EFFICIENCY_REFERENCES,
  GEEKERWAN_GB6_MULTI_REFERENCES,
  GEEKERWAN_SOURCES,
} from '../src/lib/simulation/modules/geekerwan-soc-reference';

describe('Geekerwan SoC evidence', () => {
  it('stores the Geekbench 6 multicore ranking as a separate protocol metric', () => {
    expect(
      GEEKERWAN_GB6_MULTI_REFERENCES.length,
    ).toBeGreaterThanOrEqual(35);

    const snapdragon =
      GEEKERWAN_GB6_MULTI_REFERENCES.find(
        (reference) =>
          reference.socName ===
          'Snapdragon 8 Elite Gen 5',
      );

    expect(snapdragon?.value).toBe(12352);
    expect(snapdragon?.metric).toBe(
      'geekerwan_geekbench_6_multi_core',
    );
  });

  it('does not label Geekerwan Geekbench 6 as Notebookcheck Geekbench 6.7', () => {
    expect(
      GEEKERWAN_GB6_MULTI_REFERENCES.every(
        (reference) =>
          reference.metric !==
          ('geekbench_6_7_multi_core' as string),
      ),
    ).toBe(true);
  });

  it('keeps efficiency pages as protocol metadata until numerical curve points are captured', () => {
    expect(
      GEEKERWAN_EFFICIENCY_REFERENCES.length,
    ).toBeGreaterThanOrEqual(15);
    expect(
      GEEKERWAN_EFFICIENCY_REFERENCES.every(
        (reference) =>
          reference.note ===
          'protocol-metadata-only',
      ),
    ).toBe(true);
  });

  it('preserves Geekerwan source URLs and protocol descriptions', () => {
    expect(GEEKERWAN_SOURCES).toHaveLength(3);
    expect(
      GEEKERWAN_SOURCES.some(
        (source) =>
          source.protocol.includes(
            'dummy battery',
          ),
      ),
    ).toBe(true);
  });
});
