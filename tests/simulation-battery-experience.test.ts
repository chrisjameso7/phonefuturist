import { describe, expect, it } from 'vitest';

import {
  compareBatteryExperience,
  simulateBatteryExperience,
} from '../src/lib/simulation/modules/battery-experience';

import {
  calculateBatteryPack,
} from '../src/lib/simulation/modules/battery';

describe('battery experience module (v0.5)', () => {
  // ---------------------------------------------------------
  // Deterministic runtime
  // ---------------------------------------------------------

  it('produces deterministic runtime from exact energy and power with provenance', () => {
    const calculation = simulateBatteryExperience({
      energy: {
        totalEnergyWh: {
          value: 20,
          provenance: { kind: 'reported' },
        },
        usablePercent: {
          value: 80,
          provenance: { kind: 'user' },
        },
      },
      workloads: {
        web_browsing: {
          subsystems: {
            display: {
              value: 2,
              provenance: { kind: 'measured' },
            },
            compute: {
              value: 1,
              provenance: { kind: 'modeled' },
            },
          },
        },
      },
    });

    const result = calculation.result;

    expect(result.status).toBe('resolved');
    expect(result.unresolved).toBeUndefined();

    // Usable energy: 20 Wh × 80% = 16 Wh.
    expect(result.estimate?.usableEnergyWh).toEqual({
      min: 16,
      max: 16,
    });

    // Power: 2 W + 1 W = 3 W.
    expect(result.estimate?.workloads[0].averagePowerW).toEqual({
      min: 3,
      max: 3,
    });

    // Runtime: 16 Wh / 3 W ≈ 5.333333 h.
    expect(
      result.estimate?.workloads[0].runtimeHours?.min,
    ).toBeCloseTo(5.333333, 6);

    expect(
      result.estimate?.workloads[0].runtimeHours?.max,
    ).toBeCloseTo(5.333333, 6);

    expect(result.confidence).toBe('deterministic');

    expect(
      result.confidenceNotes?.some((note) =>
        note.startsWith(
          'All energy and power inputs were supplied as exact positive values',
        ),
      ),
    ).toBe(true);
  });

  it('derives usable energy from a deterministic battery pack calculation', () => {
    const battery = calculateBatteryPack({
      cells: [
        {
          capacityMah: 5000,
          nominalVoltageV: 3.85,
        },
      ],
    });

    const totalEnergyWh = battery.result.totalEnergyWh;

    expect(totalEnergyWh).toBeDefined();

    const calculation = simulateBatteryExperience({
      energy: {
        totalEnergyWh: totalEnergyWh!,
        usablePercent: 85,
      },
      workloads: {
        video_playback: {
          subsystems: {
            display: 1.5,
            compute: 0.5,
          },
        },
      },
    });

    // 19.25 Wh × 85% = 16.3625 Wh usable.
    expect(
      calculation.result.estimate?.usableEnergyWh?.min,
    ).toBeCloseTo(16.3625, 6);

    // 16.3625 Wh / 2 W = 8.18125 h.
    expect(
      calculation.result.estimate?.workloads[0].runtimeHours?.min,
    ).toBeCloseTo(8.18125, 6);
  });

  // ---------------------------------------------------------
  // Ranges
  // ---------------------------------------------------------

  it('produces runtime ranges when power is supplied as a range', () => {
    const calculation = simulateBatteryExperience({
      energy: {
        totalEnergyWh: 20,
        usablePercent: 75,
      },
      workloads: {
        gaming: {
          subsystems: {
            display: {
              range: { min: 1.5, max: 2.5 },
              provenance: { kind: 'measured' },
            },
            compute: {
              range: { min: 2, max: 6 },
              provenance: { kind: 'modeled' },
            },
          },
        },
      },
    });

    const result = calculation.result;
    const workload = result.estimate?.workloads[0];

    // Power range: 3.5–8.5 W.
    expect(workload?.averagePowerW).toEqual({ min: 3.5, max: 8.5 });

    // Usable energy: 15 Wh.
    expect(result.estimate?.usableEnergyWh).toEqual({ min: 15, max: 15 });

    // Runtime: worst 15/8.5 ≈ 1.764706 h, best 15/3.5 ≈ 4.285714 h.
    expect(workload?.runtimeHours?.min).toBeCloseTo(1.764706, 6);
    expect(workload?.runtimeHours?.max).toBeCloseTo(4.285714, 6);

    expect(result.confidence).toBe('moderate');
  });

  it('combines multiple subsystem ranges into a wider runtime range', () => {
    const calculation = simulateBatteryExperience({
      energy: {
        totalEnergyWh: { range: { min: 18, max: 22 } },
      },
      workloads: {
        mixed_use: {
          subsystems: {
            display: { range: { min: 0.8, max: 1.2 } },
            compute: { range: { min: 0.9, max: 1.8 } },
            connectivity: { range: { min: 0.2, max: 0.5 } },
          },
        },
      },
    });

    const workload = calculation.result.estimate?.workloads[0];

    // Power: 1.9–3.5 W (0.8+0.9+0.2 and 1.2+1.8+0.5; the min
    // accumulates floating-point noise from the three-way sum).
    expect(workload?.averagePowerW?.min).toBeCloseTo(1.9, 6);
    expect(workload?.averagePowerW?.max).toBeCloseTo(3.5, 6);

    // Runtime worst: 18/3.5 ≈ 5.142857 h.
    expect(workload?.runtimeHours?.min).toBeCloseTo(5.142857, 6);

    // Runtime best: 22/1.9 ≈ 11.578947 h.
    expect(workload?.runtimeHours?.max).toBeCloseTo(11.578947, 6);
  });

  it('keeps a runtime bound unknown when an input bound is missing', () => {
    const calculation = simulateBatteryExperience({
      energy: {
        totalEnergyWh: { range: { min: 18 } },
      },
      workloads: {
        web_browsing: {
          subsystems: {
            display: { range: { max: 3 } },
            compute: 1,
          },
        },
      },
    });

    const workload = calculation.result.estimate?.workloads[0];

    // Power min unknown (display has no min), max = 4 W.
    expect(workload?.averagePowerW).toEqual({ max: 4 });

    // The worst-case runtime divides the smallest known energy
    // (min bound 18) by the largest known power (max bound 4),
    // giving the min runtime bound 18/4 = 4.5 h. The best-case
    // runtime needs a lower power bound, which is unknown, so
    // the max runtime bound stays unknown.
    expect(workload?.runtimeHours).toEqual({ min: 4.5 });

    expect(calculation.result.confidence).toBe('low');
  });

  // ---------------------------------------------------------
  // Missing information stays unresolved
  // ---------------------------------------------------------

  it('returns an explicit unresolved result when total energy is missing', () => {
    const calculation = simulateBatteryExperience({
      energy: {},
      workloads: {
        web_browsing: {
          subsystems: {
            display: 2,
          },
        },
      },
    });

    const result = calculation.result;

    expect(result.status).toBe('unresolved');
    expect(result.estimate).toBeUndefined();

    expect(result.unresolved?.code).toBe('MISSING_TOTAL_ENERGY');
    expect(result.unresolved?.missing).toEqual([
      'energy.totalEnergyWh',
    ]);

    expect(result.unresolved?.message).toContain(
      'Total battery energy is unknown',
    );
  });

  it('returns unresolved when no workload power is supplied at all', () => {
    const calculation = simulateBatteryExperience({
      energy: {
        totalEnergyWh: 20,
      },
      workloads: {
        standby: {
          subsystems: {},
        },
      },
    });

    const result = calculation.result;

    expect(result.status).toBe('unresolved');
    expect(result.unresolved?.code).toBe('MISSING_WORKLOAD_POWER');
    expect(result.unresolved?.missing).toContain(
      'workloads.standby.subsystems.*',
    );

    expect(result.unresolved?.message).toContain(
      'does not substitute default wattage figures',
    );
  });

  it('returns unresolved when no workloads are supplied', () => {
    const calculation = simulateBatteryExperience({
      energy: {
        totalEnergyWh: 20,
      },
      workloads: {},
    });

    const result = calculation.result;

    expect(result.status).toBe('unresolved');
    expect(result.unresolved?.code).toBe('NO_WORKLOADS_SUPPLIED');
    expect(result.unresolved?.missing).toEqual(['workloads']);
  });

  it('does not invent power for workload_specific components', () => {
    const calculation = simulateBatteryExperience({
      energy: {
        totalEnergyWh: 20,
      },
      workloads: {
        camera_use: {
          subsystems: {
            display: 1,
            workloadSpecific: {},
          },
        },
      },
    });

    // Only display power is known; the estimate still resolves
    // because display power alone is sufficient information.
    expect(calculation.result.status).toBe('resolved');
    expect(calculation.result.estimate?.workloads[0].averagePowerW).toEqual({
      min: 1,
      max: 1,
    });
  });

  // ---------------------------------------------------------
  // Invalid values
  // ---------------------------------------------------------

  it('rejects negative energy and reports invalid input', () => {
    const calculation = simulateBatteryExperience({
      energy: {
        totalEnergyWh: -20,
      },
      workloads: {
        web_browsing: {
          subsystems: {
            display: 2,
          },
        },
      },
    });

    const result = calculation.result;

    expect(result.status).toBe('unresolved');
    expect(result.unresolved?.code).toBe('INVALID_ENERGY_INPUT');

    expect(result.unresolved?.message).toContain(
      'must be a positive finite value',
    );
  });

  it('rejects non-finite power values', () => {
    const calculation = simulateBatteryExperience({
      energy: {
        totalEnergyWh: 20,
      },
      workloads: {
        gaming: {
          subsystems: {
            display: Number.POSITIVE_INFINITY,
            compute: 2,
          },
        },
      },
    });

    const result = calculation.result;

    expect(result.status).toBe('unresolved');
    expect(result.unresolved?.code).toBe('INVALID_WORKLOAD_POWER');
    expect(result.unresolved?.missing).toContain(
      'workloads.*.subsystems.* (invalid values)',
    );

    expect(calculation.warnings).toContainEqual({
      code: 'INVALID_WORKLOAD_POWER',
      message:
        'Display power must be a positive finite value or a range with at least one positive finite bound.',
    });
  });

  it('rejects an inverted power range', () => {
    const calculation = simulateBatteryExperience({
      energy: {
        totalEnergyWh: 20,
      },
      workloads: {
        gaming: {
          subsystems: {
            display: { range: { min: 3, max: 1 } },
            compute: 1,
          },
        },
      },
    });

    expect(calculation.result.status).toBe('unresolved');
    expect(calculation.result.unresolved?.code).toBe(
      'INVALID_WORKLOAD_POWER',
    );

    expect(calculation.warnings).toContainEqual({
      code: 'INVALID_WORKLOAD_POWER',
      message:
        'Display power range minimum must not exceed its maximum.',
    });
  });

  it('fails closed on zero, negative, NaN, and infinite workload weights', () => {
    for (const weight of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const calculation = simulateBatteryExperience({
        energy: {
          totalEnergyWh: 20,
        },
        workloads: {
          web_browsing: {
            subsystems: { display: 2 },
            weight,
          },
          video_playback: {
            subsystems: { display: 1 },
            weight: 1,
          },
        },
      });

      const result = calculation.result;

      expect(result.status).toBe('unresolved');
      expect(result.estimate).toBeUndefined();
      expect(result.unresolved?.code).toBe('INVALID_WORKLOAD_WEIGHT');
      expect(result.unresolved?.missing).toContain(
        'workloads.web_browsing.weight',
      );

      // The warning identifies the workload and the invalid value.
      expect(
        calculation.warnings.some(
          (warning) =>
            warning.code === 'INVALID_WORKLOAD_WEIGHT' &&
            warning.message.includes('web_browsing') &&
            warning.message.includes(String(weight)),
        ),
      ).toBe(true);
    }
  });

  it('rejects a usable percent above 100 instead of retaining it', () => {
    const calculation = simulateBatteryExperience({
      energy: {
        totalEnergyWh: 20,
        usablePercent: 110,
      },
      workloads: {
        web_browsing: {
          subsystems: { display: 2 },
        },
      },
    });

    const result = calculation.result;

    expect(result.status).toBe('unresolved');
    expect(result.estimate).toBeUndefined();
    expect(result.unresolved?.code).toBe('INVALID_ENERGY_INPUT');
    expect(result.unresolved?.missing).toEqual(['energy.usablePercent']);
    expect(result.unresolved?.message).toContain(
      'greater than 0 and at most 100',
    );
  });

  // ---------------------------------------------------------
  // Provenance and unknowns
  // ---------------------------------------------------------

  it('preserves provenance kinds on parameters', () => {
    const calculation = simulateBatteryExperience({
      energy: {
        totalEnergyWh: {
          value: 20,
          provenance: { kind: 'reported', note: 'FCC filing' },
        },
        usablePercent: {
          value: 80,
          provenance: { kind: 'user' },
        },
      },
      workloads: {
        web_browsing: {
          subsystems: {
            display: {
              value: 2,
              provenance: { kind: 'measured' },
            },
            compute: {
              value: 1,
              provenance: { kind: 'modeled' },
            },
          },
        },
      },
    });

    const parameters = calculation.result.estimate?.parameters ?? [];

    const find = (name: string) =>
      parameters.find((record) => record.parameter === name);

    expect(find('energy.totalEnergyWh')?.provenance?.kind).toBe(
      'reported',
    );
    expect(find('energy.totalEnergyWh')?.provenance?.note).toBe(
      'FCC filing',
    );

    expect(find('energy.usablePercent')?.provenance?.kind).toBe('user');
    expect(
      find('workloads.web_browsing.subsystems.display')?.provenance?.kind,
    ).toBe('measured');

    expect(
      find('workloads.web_browsing.subsystems.compute')?.provenance?.kind,
    ).toBe('modeled');
  });

  it('records unattributed parameters as modeled with an explanatory note', () => {
    const calculation = simulateBatteryExperience({
      energy: {
        totalEnergyWh: 20,
      },
      workloads: {
        web_browsing: {
          subsystems: {
            display: 2,
          },
        },
      },
    });

    const parameters = calculation.result.estimate?.parameters ?? [];

    const total = parameters.find(
      (record) => record.parameter === 'energy.totalEnergyWh',
    );

    expect(total?.provenance?.kind).toBe('modeled');
    expect(total?.provenance?.note).toContain(
      'Provenance not supplied',
    );

    // Structured provenance state: the fallback is flagged, not
    // inferred from note wording.
    expect(total?.provenanceRecorded).toBe(false);

    expect(calculation.result.confidence).toBe('moderate');
    expect(
      calculation.result.confidenceNotes?.some((note) =>
        note.includes('carry no explicit provenance'),
      ),
    ).toBe(true);
  });

  it('keeps unknown values unknown instead of substituting defaults', () => {
    const calculation = simulateBatteryExperience({
      energy: {
        totalEnergyWh: 20,
      },
      workloads: {
        gaming: {
          subsystems: {
            // connectivity absent: stays unknown, never zero.
            display: 2,
            compute: 4,
          },
        },
      },
    });

    const parameters = calculation.result.estimate?.parameters ?? [];

    expect(
      parameters.some((record) =>
        record.parameter.includes('connectivity'),
      ),
    ).toBe(false);

    expect(calculation.result.estimate?.workloads[0].averagePowerW).toEqual({
      min: 6,
      max: 6,
    });
  });

  it('issues the no-derating assumption when usable percent is absent', () => {
    const calculation = simulateBatteryExperience({
      energy: {
        totalEnergyWh: 20,
      },
      workloads: {
        web_browsing: {
          subsystems: { display: 2 },
        },
      },
    });

    const assumptions = calculation.result.estimate?.assumptions ?? [];

    expect(assumptions).toHaveLength(1);
    expect(assumptions[0].code).toBe('NO_USABLE_PERCENT_SUPPLIED');
    expect(assumptions[0].message).toContain(
      'the full rated pack energy was treated as usable',
    );
    expect(assumptions[0].provenance?.kind).toBe('modeled');
  });

  // ---------------------------------------------------------
  // Workload selection and composition
  // ---------------------------------------------------------

  it('honors explicit workload order', () => {
    const calculation = simulateBatteryExperience({
      energy: {
        totalEnergyWh: 20,
      },
      workloads: {
        standby: {
          subsystems: { memory_platform: 0.05 },
        },
        gaming: {
          subsystems: { display: 2, compute: 6 },
        },
      },
      workloadOrder: ['gaming', 'standby'],
    });

    const workloads = calculation.result.estimate?.workloads ?? [];

    expect(workloads.map((entry) => entry.workload)).toEqual([
      'gaming',
      'standby',
    ]);
  });

  it('normalizes weighted workloads into one average power', () => {
    const calculation = simulateBatteryExperience({
      energy: {
        totalEnergyWh: 20,
        usablePercent: 100,
      },
      workloads: {
        web_browsing: {
          subsystems: { display: 2, compute: 1 },
          weight: 3,
        },
        gaming: {
          subsystems: { display: 2, compute: 6 },
          weight: 1,
        },
      },
    });

    // Web: 3 W × 3/4 = 2.25; Gaming: 8 W × 1/4 = 2; total 4.25 W.
    expect(
      calculation.result.estimate?.workloads,
    ).toHaveLength(2);

    expect(
      calculation.result.comparisonReady?.averagePowerW,
    ).toEqual({ min: 4.25, max: 4.25 });
  });

  it('excludes unknown workloads named in workloadOrder', () => {
    const calculation = simulateBatteryExperience({
      energy: {
        totalEnergyWh: 20,
      },
      workloads: {
        web_browsing: {
          subsystems: { display: 2 },
        },
      },
      workloadOrder: ['web_browsing', 'gaming'],
    });

    expect(
      calculation.result.estimate?.workloads.map(
        (entry) => entry.workload,
      ),
    ).toEqual(['web_browsing']);
  });

  // ---------------------------------------------------------
  // Usable-energy adjustment
  // ---------------------------------------------------------

  it('applies a usable-percent range to an energy point', () => {
    const calculation = simulateBatteryExperience({
      energy: {
        totalEnergyWh: 20,
        usablePercent: { range: { min: 70, max: 90 } },
      },
      workloads: {
        video_playback: {
          subsystems: { display: 1, compute: 1 },
        },
      },
    });

    // Usable energy: 14–18 Wh; power 2 W.
    expect(calculation.result.estimate?.usableEnergyWh).toEqual({
      min: 14,
      max: 18,
    });

    const workload = calculation.result.estimate?.workloads[0];

    expect(workload?.runtimeHours?.min).toBeCloseTo(7, 6);
    expect(workload?.runtimeHours?.max).toBeCloseTo(9, 6);
  });

  it('leaves a usable-energy bound unknown when a percent bound is missing', () => {
    const calculation = simulateBatteryExperience({
      energy: {
        totalEnergyWh: 20,
        usablePercent: { range: { min: 70 } },
      },
      workloads: {
        video_playback: {
          subsystems: { display: 2 },
        },
      },
    });

    expect(calculation.result.estimate?.usableEnergyWh).toEqual({
      min: 14,
    });

    // Runtime max unknown because the best-case energy is unknown.
    expect(
      calculation.result.estimate?.workloads[0].runtimeHours,
    ).toEqual({ min: 7 });
  });

  // ---------------------------------------------------------
  // Contributors
  // ---------------------------------------------------------

  it('computes contributor shares for a single deterministic workload', () => {
    const calculation = simulateBatteryExperience({
      energy: {
        totalEnergyWh: 20,
        usablePercent: 100,
      },
      workloads: {
        gaming: {
          subsystems: {
            display: 3,
            compute: 4,
            workloadSpecific: {
              haptics: 1,
            },
          },
        },
      },
    });

    const contributors = calculation.result.estimate?.contributors ?? [];

    expect(contributors).toHaveLength(3);

    const display = contributors.find(
      (entry) => entry.subsystem === 'display',
    );

    expect(display?.powerW).toEqual({ min: 3, max: 3 });
    expect(display?.sharePercent).toBeCloseTo(37.5, 6);

    const compute = contributors.find(
      (entry) => entry.subsystem === 'compute',
    );

    expect(compute?.sharePercent).toBeCloseTo(50, 6);

    const haptics = contributors.find(
      (entry) =>
        entry.subsystem === 'workload_specific' &&
        entry.component === 'haptics',
    );

    expect(haptics?.powerW).toEqual({ min: 1, max: 1 });
    expect(haptics?.sharePercent).toBeCloseTo(12.5, 6);
  });

  it('scales contributors by workload weight in a mixed profile', () => {
    const calculation = simulateBatteryExperience({
      energy: {
        totalEnergyWh: 20,
        usablePercent: 100,
      },
      workloads: {
        web_browsing: {
          subsystems: { display: 2 },
          weight: 3,
        },
        gaming: {
          subsystems: { display: 2 },
          weight: 1,
        },
      },
    });

    const contributors = calculation.result.estimate?.contributors ?? [];

    // Web display: 2 × 3/4 = 1.5 W (75% of 2 W total).
    const webDisplay = contributors.find(
      (entry) => entry.workload === 'web_browsing',
    );

    expect(webDisplay?.powerW).toEqual({ min: 1.5, max: 1.5 });
    expect(webDisplay?.sharePercent).toBeCloseTo(75, 6);

    // Gaming display: 2 × 1/4 = 0.5 W (25%).
    const gamingDisplay = contributors.find(
      (entry) => entry.workload === 'gaming',
    );

    expect(gamingDisplay?.powerW).toEqual({ min: 0.5, max: 0.5 });
    expect(gamingDisplay?.sharePercent).toBeCloseTo(25, 6);
  });

  it('marks contributor shares as midpoint-based for ranged inputs', () => {
    const calculation = simulateBatteryExperience({
      energy: {
        totalEnergyWh: 20,
        usablePercent: 100,
      },
      workloads: {
        gaming: {
          subsystems: {
            display: { range: { min: 2, max: 4 } },
            compute: 2,
          },
        },
      },
    });

    const contributors = calculation.result.estimate?.contributors ?? [];

    // Total power midpoint: (2+2) + 2 = 5 W; display midpoint 3 W
    // → 60%.
    const display = contributors.find(
      (entry) => entry.subsystem === 'display',
    );

    expect(display?.sharePercent).toBeCloseTo(60, 6);
  });

  // ---------------------------------------------------------
  // Comparison architecture
  // ---------------------------------------------------------

  it('compares a candidate against a baseline with runtime and power deltas', () => {
    const baseline = simulateBatteryExperience({
      energy: {
        totalEnergyWh: 20,
        usablePercent: 80,
      },
      workloads: {
        video_playback: {
          subsystems: { display: 2, compute: 1 },
        },
      },
    }).result;

    const candidate = simulateBatteryExperience({
      energy: {
        totalEnergyWh: 20,
        usablePercent: 80,
      },
      workloads: {
        video_playback: {
          subsystems: { display: 1.5, compute: 1 },
        },
      },
    }).result;

    const comparison = compareBatteryExperience(
      'Prior hypothetical device',
      baseline,
      'New hypothetical device',
      candidate,
    );

    expect(comparison).toBeDefined();

    // Baseline: 16/3 ≈ 5.333333 h; candidate: 16/2.5 = 6.4 h.
    // Runtime is compared at the profile level.
    expect(comparison?.baseline.runtimeHours?.min).toBeCloseTo(5.333333, 6);
    expect(comparison?.candidate.runtimeHours?.min).toBeCloseTo(6.4, 6);

    expect(comparison?.runtimeHours?.min).toBeCloseTo(1.066667, 6);
    expect(comparison?.runtimeHours?.max).toBeCloseTo(1.066667, 6);

    expect(comparison?.deltas[0].averagePowerW).toEqual({
      min: -0.5,
      max: -0.5,
    });

    // Per-workload deltas carry power only — no runtime.
    expect(comparison?.deltas[0]).not.toHaveProperty('runtimeHours');
  });

  it('returns undefined for comparisons involving unresolved results', () => {
    const unresolved = simulateBatteryExperience({
      energy: {},
      workloads: {
        web_browsing: {
          subsystems: { display: 2 },
        },
      },
    }).result;

    const resolved = simulateBatteryExperience({
      energy: {
        totalEnergyWh: 20,
      },
      workloads: {
        web_browsing: {
          subsystems: { display: 2 },
        },
      },
    }).result;

    expect(
      compareBatteryExperience('a', unresolved, 'b', resolved),
    ).toBeUndefined();

    expect(
      compareBatteryExperience('a', resolved, 'b', unresolved),
    ).toBeUndefined();
  });

  // ---------------------------------------------------------
  // v0.5.1 corrections
  // ---------------------------------------------------------

  it('reports one profile-level runtime without per-workload runtimes for multi-workload profiles', () => {
    const calculation = simulateBatteryExperience({
      energy: {
        totalEnergyWh: 20,
        usablePercent: 100,
      },
      workloads: {
        web_browsing: {
          subsystems: { display: 2, compute: 1 },
          weight: 3,
        },
        gaming: {
          subsystems: { display: 2, compute: 6 },
          weight: 1,
        },
      },
    });

    const estimate = calculation.result.estimate;

    // Profile power: 3 × 3/4 + 8 × 1/4 = 4.25 W → 20/4.25 ≈ 4.705882 h.
    expect(estimate?.runtimeHours?.min).toBeCloseTo(4.705882, 6);
    expect(estimate?.runtimeHours?.max).toBeCloseTo(4.705882, 6);

    const workloads = estimate?.workloads ?? [];

    expect(workloads).toHaveLength(2);

    for (const entry of workloads) {
      expect(entry.runtimeHours).toBeUndefined();
    }
  });

  it('exposes weighted power and weight share for each workload', () => {
    const calculation = simulateBatteryExperience({
      energy: {
        totalEnergyWh: 20,
        usablePercent: 100,
      },
      workloads: {
        web_browsing: {
          subsystems: { display: 2, compute: 1 },
          weight: 3,
        },
        gaming: {
          subsystems: { display: 2, compute: 6 },
          weight: 1,
        },
      },
    });

    const workloads = calculation.result.estimate?.workloads ?? [];

    const web = workloads.find((entry) => entry.workload === 'web_browsing');

    expect(web?.averagePowerW).toEqual({ min: 3, max: 3 });
    expect(web?.weightedPowerW).toEqual({ min: 2.25, max: 2.25 });
    expect(web?.weightShare).toBeCloseTo(0.75, 6);

    const gaming = workloads.find((entry) => entry.workload === 'gaming');

    expect(gaming?.averagePowerW).toEqual({ min: 8, max: 8 });
    expect(gaming?.weightedPowerW).toEqual({ min: 2, max: 2 });
    expect(gaming?.weightShare).toBeCloseTo(0.25, 6);
  });

  it('reports standalone runtime on the workload entry only when it is the complete profile', () => {
    const calculation = simulateBatteryExperience({
      energy: {
        totalEnergyWh: 20,
        usablePercent: 100,
      },
      workloads: {
        web_browsing: {
          subsystems: { display: 2, compute: 1 },
        },
      },
    });

    const estimate = calculation.result.estimate;

    // 20 Wh / 3 W ≈ 6.666667 h, reported at profile level and on
    // the workload entry (single workload = complete profile).
    expect(estimate?.runtimeHours?.min).toBeCloseTo(6.666667, 6);
    expect(estimate?.workloads[0].runtimeHours?.min).toBeCloseTo(
      6.666667,
      6,
    );
  });

  it('compares multi-workload profiles at the profile level without per-workload runtime deltas', () => {
    const baseline = simulateBatteryExperience({
      energy: {
        totalEnergyWh: 20,
        usablePercent: 100,
      },
      workloads: {
        web_browsing: {
          subsystems: { display: 2, compute: 1 },
          weight: 3,
        },
        gaming: {
          subsystems: { display: 2, compute: 6 },
          weight: 1,
        },
      },
    }).result;

    const candidate = simulateBatteryExperience({
      energy: {
        totalEnergyWh: 20,
        usablePercent: 100,
      },
      workloads: {
        web_browsing: {
          subsystems: { display: 2, compute: 1 },
          weight: 3,
        },
        gaming: {
          subsystems: { display: 2, compute: 5 },
          weight: 1,
        },
      },
    }).result;

    const comparison = compareBatteryExperience(
      'Baseline device',
      baseline,
      'Candidate device',
      candidate,
    );

    expect(comparison).toBeDefined();

    // Baseline profile: 20/4.25 ≈ 4.705882 h; candidate: 20/4 = 5 h.
    expect(comparison?.baseline.runtimeHours?.min).toBeCloseTo(4.705882, 6);
    expect(comparison?.candidate.runtimeHours?.min).toBeCloseTo(5, 6);

    expect(comparison?.runtimeHours?.min).toBeCloseTo(0.294118, 6);

    // Per-workload deltas carry power only.
    const gamingDelta = comparison?.deltas.find(
      (entry) => entry.workload === 'gaming',
    );

    expect(gamingDelta?.averagePowerW).toEqual({ min: -1, max: -1 });
    expect(gamingDelta).not.toHaveProperty('runtimeHours');
  });

  it('rejects a usable percent of zero, negative, NaN, and infinity', () => {
    for (const percent of [0, -10, Number.NaN, Number.POSITIVE_INFINITY]) {
      const calculation = simulateBatteryExperience({
        energy: {
          totalEnergyWh: 20,
          usablePercent: percent,
        },
        workloads: {
          web_browsing: {
            subsystems: { display: 2 },
          },
        },
      });

      expect(calculation.result.status).toBe('unresolved');
      expect(calculation.result.estimate).toBeUndefined();
      expect(calculation.result.unresolved?.code).toBe(
        'INVALID_ENERGY_INPUT',
      );
      expect(calculation.result.unresolved?.missing).toEqual([
        'energy.usablePercent',
      ]);
    }
  });

  it('accepts a usable percent of exactly 100', () => {
    const calculation = simulateBatteryExperience({
      energy: {
        totalEnergyWh: 20,
        usablePercent: 100,
      },
      workloads: {
        web_browsing: {
          subsystems: { display: 2 },
        },
      },
    });

    expect(calculation.result.status).toBe('resolved');
    expect(calculation.result.estimate?.usableEnergyWh).toEqual({
      min: 20,
      max: 20,
    });
  });

  it('rejects a usable percent range with an out-of-range bound', () => {
    const above = simulateBatteryExperience({
      energy: {
        totalEnergyWh: 20,
        usablePercent: { range: { min: 50, max: 150 } },
      },
      workloads: {
        web_browsing: {
          subsystems: { display: 2 },
        },
      },
    });

    expect(above.result.status).toBe('unresolved');
    expect(above.result.unresolved?.code).toBe('INVALID_ENERGY_INPUT');

    const zeroBound = simulateBatteryExperience({
      energy: {
        totalEnergyWh: 20,
        usablePercent: { range: { min: 0, max: 50 } },
      },
      workloads: {
        web_browsing: {
          subsystems: { display: 2 },
        },
      },
    });

    expect(zeroBound.result.status).toBe('unresolved');
    expect(zeroBound.result.unresolved?.code).toBe('INVALID_ENERGY_INPUT');
  });

  it('rejects an inverted usable percent range', () => {
    const calculation = simulateBatteryExperience({
      energy: {
        totalEnergyWh: 20,
        usablePercent: { range: { min: 90, max: 70 } },
      },
      workloads: {
        web_browsing: {
          subsystems: { display: 2 },
        },
      },
    });

    expect(calculation.result.status).toBe('unresolved');
    expect(calculation.result.unresolved?.code).toBe('INVALID_ENERGY_INPUT');
    expect(calculation.result.unresolved?.message).toContain(
      'range minimum must not exceed its maximum',
    );
  });

  it('rejects energy input supplying both a point value and a range', () => {
    const calculation = simulateBatteryExperience({
      energy: {
        totalEnergyWh: { value: 20, range: { min: 18, max: 22 } },
      },
      workloads: {
        web_browsing: {
          subsystems: { display: 2 },
        },
      },
    });

    expect(calculation.result.status).toBe('unresolved');
    expect(calculation.result.unresolved?.code).toBe('INVALID_ENERGY_INPUT');
    expect(calculation.result.unresolved?.message).toContain(
      'both a point value and a range',
    );
  });

  it('rejects subsystem power supplying both a point value and a range', () => {
    const calculation = simulateBatteryExperience({
      energy: {
        totalEnergyWh: 20,
      },
      workloads: {
        web_browsing: {
          subsystems: {
            display: { value: 2, range: { min: 1.5, max: 2.5 } },
          },
        },
      },
    });

    expect(calculation.result.status).toBe('unresolved');
    expect(calculation.result.unresolved?.code).toBe(
      'INVALID_WORKLOAD_POWER',
    );
    expect(
      calculation.warnings.some((warning) =>
        warning.message.includes('both a point value and a range'),
      ),
    ).toBe(true);
  });

  it('treats an empty energy parameter as missing rather than present-but-unknown', () => {
    const calculation = simulateBatteryExperience({
      energy: {
        totalEnergyWh: {},
      },
      workloads: {
        web_browsing: {
          subsystems: { display: 2 },
        },
      },
    });

    expect(calculation.result.status).toBe('unresolved');
    expect(calculation.result.unresolved?.code).toBe('MISSING_TOTAL_ENERGY');
    expect(calculation.result.unresolved?.missing).toEqual([
      'energy.totalEnergyWh',
    ]);
  });

  it('records provenance state structurally instead of by note wording', () => {
    const calculation = simulateBatteryExperience({
      energy: {
        totalEnergyWh: {
          value: 20,
          provenance: {
            kind: 'reported',
            note: 'Provenance not supplied; treated as modeled.',
          },
        },
        usablePercent: {
          value: 80,
          provenance: { kind: 'user' },
        },
      },
      workloads: {
        web_browsing: {
          subsystems: {
            display: {
              value: 2,
              provenance: { kind: 'measured' },
            },
            compute: {
              value: 1,
              provenance: { kind: 'modeled' },
            },
          },
        },
      },
    });

    const parameters = calculation.result.estimate?.parameters ?? [];

    expect(parameters).toHaveLength(4);

    for (const record of parameters) {
      expect(record.provenanceRecorded).toBe(true);
    }

    // The note coincides with the legacy sentinel text, yet the
    // grade is deterministic: grading must not depend on wording.
    expect(calculation.result.confidence).toBe('deterministic');
  });

  it('grades bounded ranged inputs with recorded provenance as high', () => {
    const calculation = simulateBatteryExperience({
      energy: {
        totalEnergyWh: {
          range: { min: 18, max: 22 },
          provenance: { kind: 'reported' },
        },
        usablePercent: {
          range: { min: 80, max: 90 },
          provenance: { kind: 'user' },
        },
      },
      workloads: {
        web_browsing: {
          subsystems: {
            display: {
              range: { min: 1.5, max: 2.5 },
              provenance: { kind: 'measured' },
            },
            compute: {
              range: { min: 1, max: 2 },
              provenance: { kind: 'modeled' },
            },
          },
        },
      },
    });

    const estimate = calculation.result.estimate;

    // Usable energy: 18 × 0.8 = 14.4 → 22 × 0.9 = 19.8 Wh.
    expect(estimate?.usableEnergyWh?.min).toBeCloseTo(14.4, 6);
    expect(estimate?.usableEnergyWh?.max).toBeCloseTo(19.8, 6);

    expect(calculation.result.confidence).toBe('high');
    expect(
      calculation.result.confidenceNotes?.some((note) =>
        note.includes(
          'the result is a range, not a single measured figure',
        ),
      ),
    ).toBe(true);
  });

  it('grades numerically complete ranged inputs with unrecorded provenance as moderate', () => {
    const calculation = simulateBatteryExperience({
      energy: {
        totalEnergyWh: { range: { min: 18, max: 22 } },
      },
      workloads: {
        web_browsing: {
          subsystems: {
            display: { range: { min: 1.5, max: 2.5 } },
          },
        },
      },
    });

    expect(calculation.result.status).toBe('resolved');
    expect(calculation.result.confidence).toBe('moderate');
    expect(
      calculation.result.confidenceNotes?.some((note) =>
        note.includes('carry no explicit provenance'),
      ),
    ).toBe(true);
  });

  it('returns independent warning arrays for the calculation and the estimate', () => {
    const calculation = simulateBatteryExperience({
      energy: {
        totalEnergyWh: 20,
        usablePercent: 100,
      },
      workloads: {
        web_browsing: {
          subsystems: { display: 2 },
        },
      },
    });

    const estimateWarnings = calculation.result.estimate?.warnings;

    expect(estimateWarnings).toBeDefined();
    expect(calculation.warnings).not.toBe(estimateWarnings);

    calculation.warnings.push({ code: 'TEST', message: 'mutated' });

    expect(estimateWarnings).toHaveLength(0);
  });

  // ---------------------------------------------------------
  // Backwards compatibility with v0.4
  // ---------------------------------------------------------

  it('leaves the v0.4 deterministic battery module untouched', () => {
    const calculation = calculateBatteryPack({
      cells: [
        {
          capacityMah: 5000,
          nominalVoltageV: 3.85,
          widthMm: 60,
          heightMm: 80,
          thicknessMm: 5,
          weightG: 70,
        },
      ],
    });

    expect(calculation.result.totalEnergyWh).toBeCloseTo(19.25, 6);
    expect(calculation.result.totalVolumeMm3).toBe(24000);
    expect(calculation.warnings).toEqual([]);
  });

  it('does not alter the v0.4 engine API surface', async () => {
    const { simulateDevice, SIMULATION_ENGINE_VERSION } =
      await import('../src/lib/simulation/engine');

    expect(SIMULATION_ENGINE_VERSION).toBe('0.5.1');

    const result = simulateDevice({
      formFactor: 'phone',
      displays: { primary: {} },
      battery: {
        cells: [
          {
            capacityMah: 5000,
            nominalVoltageV: 3.85,
          },
        ],
      },
    });

    expect(result.engineVersion).toBe('0.5.1');
    expect(result.battery?.totalEnergyWh).toBeCloseTo(19.25, 6);
    expect(result).not.toHaveProperty('batteryExperience');
  });
});

it('keeps mixed runtime separate from each workload and treats workloadOrder only as ordering', () => {
  const result=simulateBatteryExperience({energy:{totalEnergyWh:20,usablePercent:100},workloads:{web_browsing:{subsystems:{compute:2},weight:1},gaming:{subsystems:{compute:8},weight:1}},workloadOrder:['gaming','gaming']}).result;
  expect(result.engineVersion).toBe('0.5.1-battery.1');
  expect(result.estimate?.runtimeHours).toEqual({min:4,max:4});
  expect(result.estimate?.workloads).toHaveLength(2);
  expect(result.estimate?.workloads.find(w=>w.workload==='gaming')?.runtimeHours).toBeUndefined();
  expect(result.estimate?.workloads.find(w=>w.workload==='web_browsing')?.runtimeHours).toBeUndefined();
});
