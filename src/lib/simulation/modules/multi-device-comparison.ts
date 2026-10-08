import type { DeviceCorpus, DeviceCorpusRecord } from './device-corpus';
import type { SimulationSnapshot } from '../simulation-snapshot';
import {
  compareSimulationExperienceToReleasedDevice,
  type ExperienceComparison,
} from './experience-comparison';
import { findDeviceByName } from './device-lookup';

export const MULTI_DEVICE_COMPARISON_VERSION = 'multi-device-comparison-0.1.0';

export interface ComparisonTarget {
  query: string;
  label?: string;
}

export interface MultiDeviceComparison {
  version: string;
  simulatedId: string;
  comparisons: ExperienceComparison[];
  unresolved: Array<{
    query: string;
    status: 'ambiguous' | 'unresolved';
    note?: string;
  }>;
}

export function compareSimulationAgainstDevices(
  corpus: DeviceCorpus,
  snapshot: SimulationSnapshot,
  targets: ComparisonTarget[],
): MultiDeviceComparison {
  const comparisons: ExperienceComparison[] = [];
  const unresolved: MultiDeviceComparison['unresolved'] = [];

  const seen = new Set<string>();

  for (const target of targets) {
    const key = target.query.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const comparison = compareSimulationExperienceToReleasedDevice(
      corpus,
      snapshot,
      target.query,
    );

    if (comparison.status === 'resolved') {
      comparisons.push(comparison);
    } else {
      unresolved.push({
        query: target.query,
        status: comparison.status,
        note: comparison.note,
      });
    }
  }

  return {
    version: MULTI_DEVICE_COMPARISON_VERSION,
    simulatedId: snapshot.id,
    comparisons,
    unresolved,
  };
}

function modelNumberFromName(name: string) {
  const match = name.match(/\b([A-Za-z]+)?\s*(\d{1,3})\b/);
  if (!match) return undefined;
  return {
    prefix: (match[1] ?? '').toLowerCase(),
    generation: Number(match[2]),
  };
}

function sameSeries(a: DeviceCorpusRecord, b: DeviceCorpusRecord) {
  const ai = a.variant.identity;
  const bi = b.variant.identity;

  return (
    ai.manufacturer.toLowerCase() === bi.manufacturer.toLowerCase() &&
    ai.family.toLowerCase() === bi.family.toLowerCase()
  );
}

export function findPreviousGenerationDevice(
  corpus: DeviceCorpus,
  currentName: string,
): DeviceCorpusRecord | undefined {
  const parsed = modelNumberFromName(currentName);
  if (!parsed || !Number.isFinite(parsed.generation)) return undefined;

  const currentMatches = findDeviceByName(corpus, currentName, 8);
  const current = currentMatches[0]?.device;

  const targetGeneration = parsed.generation - 1;

  const candidates = corpus.devices.filter((device) => {
    const parsedCandidate = modelNumberFromName(
      device.variant.identity.modelName,
    );
    if (!parsedCandidate) return false;

    const manufacturerMatches = current
      ? sameSeries(current, device)
      : device.variant.identity.modelName
          .toLowerCase()
          .includes(parsed.prefix);

    return (
      manufacturerMatches &&
      parsedCandidate.generation === targetGeneration
    );
  });

  return candidates.sort((a, b) => {
    const aDate = Date.parse(a.releaseDate ?? '') || 0;
    const bDate = Date.parse(b.releaseDate ?? '') || 0;
    return bDate - aDate;
  })[0];
}

export function compareSimulationToPreviousGeneration(
  corpus: DeviceCorpus,
  snapshot: SimulationSnapshot,
): ExperienceComparison {
  const currentName = snapshot.input.name ?? snapshot.title;
  const previous = findPreviousGenerationDevice(corpus, currentName);

  if (!previous) {
    return {
      version: 'experience-comparison-0.1.0',
      status: 'unresolved',
      releasedQuery: 'previous generation',
      deltas: [],
      note:
        'No previous-generation device could be resolved confidently from the corpus.',
    };
  }

  return compareSimulationExperienceToReleasedDevice(
    corpus,
    snapshot,
    `${previous.variant.identity.manufacturer} ${previous.variant.identity.modelName}`,
  );
}
