/**
 * Shared modeling primitives for Interactive Leaks modeled
 * (non-deterministic) subsystems.
 *
 * These primitives exist so that modeled modules can:
 *
 * - carry provenance (measured / reported / modeled / user)
 * - carry uncertainty as ranges instead of fake precision
 * - leave values unknown instead of inventing defaults
 *
 * A parameter without a value or range is unknown and stays
 * unknown. No helper in this file ever substitutes a default.
 */

/**
 * Origin of a modeled value.
 *
 * 'calibrated' is a value derived by a recorded division or fit from
 * measured evidence, never a measurement itself. 'reference' is carried
 * across from another device. 'estimated' is a model output with no direct
 * evidence behind it. A value with no provenance at all is reported as
 * unrecorded with unknown origin, which is distinct from all of these.
 */
export type ModelProvenanceKind =
  | 'measured'
  | 'calibrated'
  | 'reference'
  | 'estimated'
  | 'reported'
  | 'modeled'
  | 'user';

export interface ModelProvenance {
  kind: ModelProvenanceKind;
  note?: string;
}

/**
 * An uncertainty band. A missing bound remains unknown; it is
 * never filled in.
 */
export interface ModelRange {
  min?: number;
  max?: number;

  provenance?: ModelProvenance;
}

/**
 * A modeled parameter: an optional point value, an optional
 * uncertainty range, and optional provenance.
 *
 * Supplying both a point value and a range is ambiguous for
 * v0.5.x — the type does not yet distinguish a central estimate
 * from an uncertainty band — and is rejected fail-closed by
 * resolution instead of silently preferring the point.
 */
export interface ModelParameter {
  value?: number;

  range?: ModelRange;

  provenance?: ModelProvenance;
}

/**
 * Accepted shape for modeled parameters in module inputs:
 * a raw number (provenance then stays unknown) or a full
 * ModelParameter carrying provenance and/or a range.
 */
export type ModelParameterInput = number | ModelParameter;

export function toModelParameter(
  input: ModelParameterInput | undefined,
): ModelParameter | undefined {
  if (input === undefined) {
    return undefined;
  }

  return typeof input === 'number'
    ? { value: input }
    : input;
}

export function isPositiveFinite(
  value: number | undefined,
): value is number {
  return (
    value !== undefined &&
    Number.isFinite(value) &&
    value > 0
  );
}

/**
 * A quantity after validation: either an exact point or a
 * range with at least one known bound.
 */
export type ResolvedQuantity =
  | { kind: 'point'; value: number }
  | { kind: 'range'; min?: number; max?: number };

export interface ResolutionIssue {
  code: string;
  message: string;
}

export interface Resolution {
  quantity?: ResolvedQuantity;
  issue?: ResolutionIssue;
}

/**
 * Resolves a modeled parameter that must be positive.
 *
 * - A valid point value wins when both value and range exist.
 * - An invalid point value produces an issue.
 * - Range bounds are validated individually; a bound that is
 *   missing, non-finite, or non-positive is dropped. A range
 *   whose min exceeds its max is rejected entirely.
 */
export function resolvePositiveParameter(
  parameter: ModelParameter | undefined,
  issue: {
    code: string;
    describe: (label: string) => string;
  },
  label: string,
): Resolution {
  if (parameter === undefined) {
    return {};
  }

  if (parameter.value !== undefined) {
    if (parameter.range !== undefined) {
      // A point value plus a range is ambiguous: the parameter
      // type does not yet represent a central estimate plus
      // uncertainty, so fail closed rather than silently
      // preferring the point and discarding the range.
      return {
        issue: {
          code: issue.code,
          message: `${label} supplied both a point value and a range; these are ambiguous, so supply one or the other.`,
        },
      };
    }

    if (isPositiveFinite(parameter.value)) {
      return { quantity: { kind: 'point', value: parameter.value } };
    }

    return {
      issue: {
        code: issue.code,
        message: issue.describe(label),
      },
    };
  }

  const range = parameter.range;

  if (range === undefined) {
    // Present parameter with neither value nor range: unknown.
    return {};
  }

  const min = isPositiveFinite(range.min) ? range.min : undefined;
  const max = isPositiveFinite(range.max) ? range.max : undefined;

  if (min === undefined && max === undefined) {
    return {
      issue: {
        code: issue.code,
        message: issue.describe(label),
      },
    };
  }

  if (min !== undefined && max !== undefined && min > max) {
    return {
      issue: {
        code: issue.code,
        message: `${label} range minimum must not exceed its maximum.`,
      },
    };
  }

  return {
    quantity: {
      kind: 'range',
      ...(min !== undefined ? { min } : {}),
      ...(max !== undefined ? { max } : {}),
    },
  };
}

export function scaleQuantity(
  quantity: ResolvedQuantity,
  factor: number,
): ResolvedQuantity {
  if (quantity.kind === 'point') {
    return { kind: 'point', value: quantity.value * factor };
  }

  return {
    kind: 'range',
    ...(quantity.min !== undefined
      ? { min: quantity.min * factor }
      : {}),
    ...(quantity.max !== undefined
      ? { max: quantity.max * factor }
      : {}),
  };
}

/**
 * Sums quantities. Mixed point and range inputs produce a
 * range; a bound is unknown when any summed quantity lacks
 * that bound. Returns undefined when nothing is known.
 */
export function sumQuantities(
  quantities: ResolvedQuantity[],
): ResolvedQuantity | undefined {
  if (quantities.length === 0) {
    return undefined;
  }

  let allPoints = true;
  let point = 0;
  let min = 0;
  let max = 0;
  let minKnown = true;
  let maxKnown = true;

  for (const quantity of quantities) {
    if (quantity.kind === 'point') {
      point += quantity.value;
      min += quantity.value;
      max += quantity.value;
    } else {
      allPoints = false;

      if (quantity.min !== undefined) {
        min += quantity.min;
      } else {
        minKnown = false;
      }

      if (quantity.max !== undefined) {
        max += quantity.max;
      } else {
        maxKnown = false;
      }
    }
  }

  if (allPoints) {
    return { kind: 'point', value: point };
  }

  return {
    kind: 'range',
    ...(minKnown ? { min } : {}),
    ...(maxKnown ? { max } : {}),
  };
}

/**
 * Runtime (hours) from usable energy (Wh) divided by average
 * power (W). Worst-case runtime uses the lowest energy and
 * highest power; best-case uses the highest energy and lowest
 * power. Unknown bounds propagate; a zero or unknown divisor
 * bound leaves the corresponding runtime bound unknown.
 */
export function divideEnergyByPower(
  energy: ResolvedQuantity,
  power: ResolvedQuantity,
): ResolvedQuantity | undefined {
  const energyMin =
    energy.kind === 'point' ? energy.value : energy.min;
  const energyMax =
    energy.kind === 'point' ? energy.value : energy.max;
  const powerMin =
    power.kind === 'point' ? power.value : power.min;
  const powerMax =
    power.kind === 'point' ? power.value : power.max;

  const hasEnergy = energyMin !== undefined || energyMax !== undefined;
  const hasPower = powerMin !== undefined || powerMax !== undefined;

  if (!hasEnergy || !hasPower) {
    return undefined;
  }

  const worst = (() => {
    if (energyMin === undefined || powerMax === undefined) {
      return undefined;
    }

    return powerMax > 0 ? energyMin / powerMax : undefined;
  })();

  const best = (() => {
    if (energyMax === undefined || powerMin === undefined) {
      return undefined;
    }

    return powerMin > 0 ? energyMax / powerMin : undefined;
  })();

  if (worst === undefined && best === undefined) {
    return undefined;
  }

  if (
    worst !== undefined &&
    best !== undefined &&
    energy.kind === 'point' &&
    power.kind === 'point'
  ) {
    return { kind: 'point', value: worst };
  }

  return {
    kind: 'range',
    ...(worst !== undefined ? { min: worst } : {}),
    ...(best !== undefined ? { max: best } : {}),
  };
}

/**
 * Midpoint of a quantity for contributor-share reporting.
 * Returns undefined when neither bound of a range is known.
 * The basis is reported so partial precision stays visible.
 */
export function quantityMidpoint(
  quantity: ResolvedQuantity,
): { value: number; basis: 'point' | 'range_midpoint' } | undefined {
  if (quantity.kind === 'point') {
    return { value: quantity.value, basis: 'point' };
  }

  if (quantity.min !== undefined && quantity.max !== undefined) {
    return {
      value: (quantity.min + quantity.max) / 2,
      basis: 'range_midpoint',
    };
  }

  if (quantity.min !== undefined) {
    return { value: quantity.min, basis: 'range_midpoint' };
  }

  if (quantity.max !== undefined) {
    return { value: quantity.max, basis: 'range_midpoint' };
  }

  return undefined;
}
