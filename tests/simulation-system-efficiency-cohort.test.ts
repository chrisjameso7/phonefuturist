import { describe, expect, it } from 'vitest';
import cohort from '../data/calibration/system-efficiency/cohort-01.json';

describe('system-efficiency calibration cohort 01', () => {
  it('covers at least six manufacturers and four independent source families', () => {
    const brands = new Set(cohort.cohort.map(device => device.brand));
    const sources = new Set(cohort.sources.map(source => source.id));

    expect(brands.size).toBeGreaterThanOrEqual(6);
    expect(sources.size).toBeGreaterThanOrEqual(4);
    expect(cohort.cohort.length).toBeGreaterThanOrEqual(6);
  });

  it('does not encode brand priors as calibration evidence', () => {
    expect(cohort.rules.no_brand_priors).toBe(true);
    expect(cohort.rules.do_not_average_across_protocols).toBe(true);
    expect(cohort.rules.coefficient_requires_hardware_normalization).toBe(true);
  });

  it('keeps protocol observations raw rather than pretending they are final coefficients', () => {
    expect(cohort.purpose).toContain('not final software coefficients');

    for (const device of cohort.cohort) {
      expect(device.notebookcheck.webHours).toBeGreaterThan(0);
      expect(device.notebookcheck.derivedWebDrainMahPerHour).toBeGreaterThan(0);
    }
  });
});
