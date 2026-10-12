import { describe, expect, it } from 'vitest';
import {
  buildSimulationDiscussionPost,
  simulationActions,
} from '../src/lib/simulation/simulation-actions';
import {
  compareSimulationSnapshots,
} from '../src/lib/simulation/simulation-compare';
import type { SimulationSnapshot } from '../src/lib/simulation/simulation-snapshot';

const base: SimulationSnapshot = {
  version: 'simulation-snapshot-0.1.0',
  id: 'sim-a',
  title: 'Galaxy S27 Ultra concept',
  createdAt: new Date().toISOString(),
  visibility: 'public',
  engineVersion: '1',
  corpusVersion: 'corpus-1',
  input: {
    formFactor: 'phone',
    name: 'Galaxy S27 Ultra',
    displays: { primary: { diagonalInches: 6.9 } },
    battery: { cells: [{ capacityMah: 5700 }] },
  },
  result: {
    engineVersion: '1',
    formFactor: 'phone',
    displays: { primary: {} },
    battery: {
      cellCount: 1,
      totalCapacityMah: 5700,
      cells: [{ capacityMah: 5700 }],
    },
    warnings: [],
  },
};

describe('simulation product actions', () => {
  it('exposes save, compare and discuss for reproducible snapshots', () => {
    const actions = simulationActions(base);
    expect(actions.map((action) => action.action)).toEqual([
      'save',
      'compare',
      'discuss',
    ]);
    expect(actions.every((action) => action.enabled)).toBe(true);
  });

  it('creates a community post bound to the exact simulation snapshot', () => {
    const post = buildSimulationDiscussionPost(
      base,
      'user-1',
      'What if Samsung actually ships this?',
    );

    expect(post.kind).toBe('simulation_share');
    expect(post.simulation?.simulationId).toBe('sim-a');
    expect(
      post.contexts.some((context) => context.type === 'device'),
    ).toBe(true);
  });

  it('compares snapshots at the actual input/result field level', () => {
    const other: SimulationSnapshot = {
      ...base,
      id: 'sim-b',
      input: {
        ...base.input,
        battery: { cells: [{ capacityMah: 5900 }] },
      },
    };

    const comparison = compareSimulationSnapshots(base, other);
    expect(
      comparison.differences.some(
        (difference) =>
          difference.path === 'input.battery.cells[0].capacityMah',
      ),
    ).toBe(true);
  });
});
