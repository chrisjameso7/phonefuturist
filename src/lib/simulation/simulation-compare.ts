import type { SimulationSnapshot } from './simulation-snapshot';

export const SIMULATION_COMPARE_VERSION = 'simulation-compare-0.1.0';

export interface SimulationDifference {
  path: string;
  left?: unknown;
  right?: unknown;
}

export interface SimulationComparison {
  version: string;
  leftId: string;
  rightId: string;
  differences: SimulationDifference[];
}

function scalar(value: unknown) {
  return value === null ||
    ['string', 'number', 'boolean', 'undefined'].includes(typeof value);
}

function diff(
  left: unknown,
  right: unknown,
  path: string,
  out: SimulationDifference[],
) {
  if (Object.is(left, right)) return;

  if (scalar(left) || scalar(right)) {
    out.push({ path, left, right });
    return;
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    const a = Array.isArray(left) ? left : [];
    const b = Array.isArray(right) ? right : [];
    const length = Math.max(a.length, b.length);
    for (let i = 0; i < length; i += 1) {
      diff(a[i], b[i], `${path}[${i}]`, out);
    }
    return;
  }

  const a = (left ?? {}) as Record<string, unknown>;
  const b = (right ?? {}) as Record<string, unknown>;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);

  for (const key of keys) {
    diff(a[key], b[key], path ? `${path}.${key}` : key, out);
  }
}

export function compareSimulationSnapshots(
  left: SimulationSnapshot,
  right: SimulationSnapshot,
): SimulationComparison {
  const differences: SimulationDifference[] = [];

  diff(left.input, right.input, 'input', differences);
  diff(left.result, right.result, 'result', differences);

  return {
    version: SIMULATION_COMPARE_VERSION,
    leftId: left.id,
    rightId: right.id,
    differences,
  };
}
