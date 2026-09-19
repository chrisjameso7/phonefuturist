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

  it('warns on a non-positive workload weight and treats it as 1', () => {
    const calculation = simulateBatteryExperience({
      energy: {
        totalEnergyWh: 20,
        usablePercent: 100,
      },
      workloads: {
        web_browsing: {
          subsystems: { display: 2 },
          weight: -1,
        },
        video_playback: {
          subsystems: { display: 1 },
          weight: 1,
        },
      },
    });

    expect(calculation.warnings).toContainEqual({
      code: 'INVALID_WORKLOAD_WEIGHT',
      message:
        'Workload web_browsing weight must be a positive finite value. The workload was weighted as 1.',
    });
  });

  it('warns when usable percent exceeds 100 but keeps the value', () => {
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

    expect(calculation.warnings).toContainEqual({
      code: 'INVALID_USABLE_PERCENT',
      message:
        'Usable battery percentage should not exceed 100. The supplied value was kept, but it likely misstates the pack reserve.',
    });

    expect(calculation.result.estimate?.usableEnergyWh?.min).toBeCloseTo(
      22,
      6,
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
    expect(
      comparison?.deltas[0].runtimeHours?.min,
    ).toBeCloseTo(1.066667, 6);

    expect(comparison?.deltas[0].averagePowerW).toEqual({
      min: -0.5,
      max: -0.5,
    });
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

    expect(SIMULATION_ENGINE_VERSION).toBe('0.4.0');

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

    expect(result.engineVersion).toBe('0.4.0');
    expect(result.battery?.totalEnergyWh).toBeCloseTo(19.25, 6);
    expect(result).not.toHaveProperty('batteryExperience');
  });
});
