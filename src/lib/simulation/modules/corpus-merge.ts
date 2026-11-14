import type { DeviceCorpus, DeviceCorpusRecord, CorpusMeasurement, CorpusSource } from './device-corpus';

export interface MergeCorpusResult {
  corpus: DeviceCorpus;
  warnings: string[];
}

export function mergeDeviceCorpora(
  corpora: DeviceCorpus[],
  version = 'merged-device-corpus-0.1.0',
): MergeCorpusResult {
  const warnings: string[] = [];
  const sources = new Map<string, CorpusSource>();
  const devices = new Map<string, DeviceCorpusRecord>();
  const measurements = new Map<string, CorpusMeasurement>();

  for (const corpus of corpora) {
    for (const source of corpus.sources) {
      const existing = sources.get(source.id);
      if (existing && existing.url !== source.url) {
        warnings.push(`Source id collision: ${source.id}`);
        continue;
      }
      sources.set(source.id, existing ?? source);
    }

    for (const device of corpus.devices) {
      const id = device.variant.id;
      const existing = devices.get(id);
      if (existing) {
        warnings.push(`Duplicate device variant skipped: ${id}`);
        continue;
      }
      devices.set(id, device);
    }

    for (const measurement of corpus.measurements) {
      const id = measurement.id;
      const existing = measurements.get(id);
      if (existing) {
        warnings.push(`Duplicate measurement skipped: ${id}`);
        continue;
      }
      measurements.set(id, measurement);
    }
  }

  return {
    corpus: {
      version,
      sources: [...sources.values()],
      devices: [...devices.values()],
      measurements: [...measurements.values()],
    },
    warnings,
  };
}
