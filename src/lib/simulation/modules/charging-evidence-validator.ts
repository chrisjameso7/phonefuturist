import type { DeviceCorpus } from './device-corpus';

export const CHARGING_EVIDENCE_VALIDATOR_VERSION =
  'charging-evidence-validator-0.1.0';

export interface ChargingEvidenceIssue {
  deviceVariantId: string;
  code:
    | 'NON_MONOTONIC_MILESTONES'
    | 'IMPOSSIBLE_PERCENT'
    | 'NON_POSITIVE_TIME'
    | 'PERCENT_TIME_CONFLICT';
  message: string;
  measurementIds: string[];
}

function metricKind(metric: string) {
  const m = metric.toLowerCase();

  if (
    ['timetofullminutes', 'wiredfullchargeminutes', 'fullchargeminutes', 'timeto100minutes']
      .some((name) => m.includes(name.toLowerCase()))
  ) return 't100';

  if (m.includes('timeto80') || m.includes('charge80minutes')) return 't80';
  if (m.includes('timeto50') || m.includes('charge50minutes')) return 't50';
  if (
    m.includes('charge30mpercent') ||
    m.includes('thirtyminutepercent') ||
    m.includes('wiredthirtyminutepercent')
  ) return 'p30';

  return undefined;
}

export function validateChargingEvidence(
  corpus: DeviceCorpus,
): ChargingEvidenceIssue[] {
  const issues: ChargingEvidenceIssue[] = [];

  for (const device of corpus.devices) {
    const measurements = corpus.measurements.filter(
      (m) =>
        m.deviceVariantId === device.variant.id &&
        m.workload === 'charging',
    );

    const bySource = new Map<string, typeof measurements>();
    for (const measurement of measurements) {
      const list = bySource.get(measurement.sourceId) ?? [];
      list.push(measurement);
      bySource.set(measurement.sourceId, list);
    }

    for (const group of bySource.values()) {
      const values = new Map<
        't50' | 't80' | 't100' | 'p30',
        (typeof group)[number]
      >();

      for (const measurement of group) {
        const kind = metricKind(measurement.metric);
        if (!kind) continue;
        values.set(kind, measurement);

        if (
          kind === 'p30' &&
          (measurement.value < 0 || measurement.value > 100)
        ) {
          issues.push({
            deviceVariantId: device.variant.id,
            code: 'IMPOSSIBLE_PERCENT',
            message: '30-minute charge percentage must be between 0 and 100.',
            measurementIds: [measurement.id],
          });
        }

        if (
          kind !== 'p30' &&
          measurement.value <= 0
        ) {
          issues.push({
            deviceVariantId: device.variant.id,
            code: 'NON_POSITIVE_TIME',
            message: 'Charging milestone time must be positive.',
            measurementIds: [measurement.id],
          });
        }
      }

      const t50 = values.get('t50');
      const t80 = values.get('t80');
      const t100 = values.get('t100');

      if (
        (t50 && t80 && t50.value >= t80.value) ||
        (t80 && t100 && t80.value >= t100.value) ||
        (t50 && t100 && t50.value >= t100.value)
      ) {
        issues.push({
          deviceVariantId: device.variant.id,
          code: 'NON_MONOTONIC_MILESTONES',
          message:
            'Charging milestones must increase from 50% to 80% to 100%.',
          measurementIds: [t50, t80, t100]
            .filter(Boolean)
            .map((m) => m!.id),
        });
      }

      const p30 = values.get('p30');
      if (p30 && t50 && p30.value >= 50 && t50.value > 30) {
        issues.push({
          deviceVariantId: device.variant.id,
          code: 'PERCENT_TIME_CONFLICT',
          message:
            'A device reported at or above 50% after 30 minutes cannot also take longer than 30 minutes to reach 50% under the same source protocol.',
          measurementIds: [p30.id, t50.id],
        });
      }

      if (p30 && t80 && p30.value >= 80 && t80.value > 30) {
        issues.push({
          deviceVariantId: device.variant.id,
          code: 'PERCENT_TIME_CONFLICT',
          message:
            'A device reported at or above 80% after 30 minutes cannot also take longer than 30 minutes to reach 80% under the same source protocol.',
          measurementIds: [p30.id, t80.id],
        });
      }
    }
  }

  return issues;
}
