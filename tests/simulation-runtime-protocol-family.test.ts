import { describe, expect, it } from 'vitest';
import { buildCalibrationRegistry } from '../src/lib/simulation/modules/calibration-registry';

describe('current PhoneArena runtime protocol family', () => {
  it('keeps current-generation PhoneArena runtime evidence in one canonical protocol', () => {
    const registry = buildCalibrationRegistry();

    const phoneArenaRuntimeSources = new Set(
      registry.measurements
        .filter(
          (measurement) =>
            ['web_browsing', 'video_playback', 'gaming'].includes(
              measurement.workload,
            ) &&
            measurement.unit === 'hours',
        )
        .map((measurement) =>
          registry.sources.find(
            (source) =>
              source.id === measurement.sourceId,
          ),
        )
        .filter(
          (source) =>
            source?.publisher === 'PhoneArena',
        )
        .map((source) => source!.protocol),
    );

    expect(phoneArenaRuntimeSources).toContain(
      'PhoneArena battery benchmark',
    );

    expect(
      [...phoneArenaRuntimeSources].filter(Boolean),
    ).not.toContain(
      'Battery estimate + browsing + video + gaming',
    );
    expect(
      [...phoneArenaRuntimeSources].filter(Boolean),
    ).not.toContain(
      'PhoneArena battery benchmark table',
    );
  });
});
