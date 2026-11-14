import type { CommunityPostInput } from '../community/community-context';
import type { SimulationSnapshot } from './simulation-snapshot';
import { summarizeSimulationSnapshot } from './simulation-snapshot';

export type SimulationAction = 'save' | 'compare' | 'discuss';

export interface SimulationActionDescriptor {
  action: SimulationAction;
  label: string;
  enabled: boolean;
  reason?: string;
}

export function simulationActions(
  snapshot: SimulationSnapshot,
): SimulationActionDescriptor[] {
  const reproducible =
    Boolean(snapshot.engineVersion) &&
    Boolean(snapshot.input) &&
    Boolean(snapshot.result);

  return [
    {
      action: 'save',
      label: 'Save',
      enabled: reproducible,
      ...(!reproducible
        ? { reason: 'Simulation snapshot is incomplete.' }
        : {}),
    },
    {
      action: 'compare',
      label: 'Compare',
      enabled: reproducible,
      ...(!reproducible
        ? { reason: 'Simulation snapshot is incomplete.' }
        : {}),
    },
    {
      action: 'discuss',
      label: 'Discuss',
      enabled: reproducible,
      ...(!reproducible
        ? { reason: 'Simulation snapshot is incomplete.' }
        : {}),
    },
  ];
}

export function buildSimulationDiscussionPost(
  snapshot: SimulationSnapshot,
  authorId: string,
  body: string,
): CommunityPostInput {
  const summary = summarizeSimulationSnapshot(snapshot);

  return {
    id: `discussion-${snapshot.id}`,
    authorId,
    kind: 'simulation_share',
    body,
    contexts: [
      {
        type: 'simulation',
        id: snapshot.id,
        label: snapshot.title,
      },
      ...(snapshot.input.name
        ? [{
            type: 'device' as const,
            id: snapshot.input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            label: snapshot.input.name,
          }]
        : []),
    ],
    simulation: {
      simulationId: snapshot.id,
      title: snapshot.title,
      engineVersion: snapshot.engineVersion,
      corpusVersion: snapshot.corpusVersion,
      summary: {
        formFactor: summary.formFactor,
        cameraCount: summary.cameraCount,
        ...(summary.batteryMah !== undefined
          ? { batteryMah: summary.batteryMah }
          : {}),
      },
    },
    createdAt: new Date().toISOString(),
  };
}
