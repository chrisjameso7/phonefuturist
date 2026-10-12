import { describe, expect, it } from 'vitest';
import {
  canPoolEvidenceSources,
  EVIDENCE_SOURCE_POLICIES,
  getEvidenceSourcePolicy,
} from '../src/lib/simulation/modules/evidence-source-registry';

describe('evidence source registry', () => {
  it('keeps incompatible battery protocols separate', () => {
    const phoneArena =
      getEvidenceSourcePolicy(
        'phonearena-battery',
      )!;
    const gsmArena =
      getEvidenceSourcePolicy(
        'gsmarena-battery',
      )!;

    expect(
      canPoolEvidenceSources(
        phoneArena,
        gsmArena,
      ),
    ).toBe(false);
  });

  it('marks TechAPI as catalog evidence rather than lab measurement evidence', () => {
    const techApi =
      getEvidenceSourcePolicy(
        'techapi-open-data',
      )!;

    expect(
      techApi.evidenceClass,
    ).toBe('catalog-spec');
    expect(techApi.domains).toEqual([
      'device-specs',
    ]);
  });

  it('registers Geekerwan performance and battery as separate protocol families', () => {
    const performance =
      getEvidenceSourcePolicy(
        'geekerwan-performance',
      )!;
    const battery =
      getEvidenceSourcePolicy(
        'geekerwan-battery',
      )!;

    expect(
      performance.protocolFamily,
    ).not.toBe(
      battery.protocolFamily,
    );
    expect(
      EVIDENCE_SOURCE_POLICIES.length,
    ).toBeGreaterThanOrEqual(7);
  });
});
