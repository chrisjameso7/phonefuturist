import type { SimulationInput, SimulationResult } from './types';

export const SIMULATION_SNAPSHOT_VERSION = 'simulation-snapshot-0.1.0';

export type SimulationSnapshotVisibility = 'private' | 'unlisted' | 'public';

export interface SimulationSnapshot {
  version: string;
  id: string;
  title: string;
  createdAt: string;
  visibility: SimulationSnapshotVisibility;
  engineVersion: string;
  corpusVersion?: string;
  input: SimulationInput;
  result: SimulationResult;
  tags?: string[];
  parentSnapshotId?: string;
}

export interface SimulationSnapshotSummary {
  id: string;
  title: string;
  createdAt: string;
  engineVersion: string;
  corpusVersion?: string;
  batteryMah?: number;
  cameraCount: number;
  formFactor: SimulationInput['formFactor'];
  parentSnapshotId?: string;
}

function totalBatteryMah(input: SimulationInput) {
  const cells = input.battery?.cells ?? [];
  if (!cells.length || cells.some((cell) => !Number.isFinite(cell.capacityMah))) {
    return undefined;
  }

  return cells.reduce((sum, cell) => sum + (cell.capacityMah ?? 0), 0);
}

export function summarizeSimulationSnapshot(
  snapshot: SimulationSnapshot,
): SimulationSnapshotSummary {
  return {
    id: snapshot.id,
    title: snapshot.title,
    createdAt: snapshot.createdAt,
    engineVersion: snapshot.engineVersion,
    ...(snapshot.corpusVersion ? { corpusVersion: snapshot.corpusVersion } : {}),
    ...(totalBatteryMah(snapshot.input) !== undefined
      ? { batteryMah: totalBatteryMah(snapshot.input) }
      : {}),
    cameraCount: snapshot.input.cameras?.length ?? 0,
    formFactor: snapshot.input.formFactor,
    ...(snapshot.parentSnapshotId
      ? { parentSnapshotId: snapshot.parentSnapshotId }
      : {}),
  };
}

export function forkSimulationSnapshot(
  snapshot: SimulationSnapshot,
  next: Omit<SimulationSnapshot, 'parentSnapshotId' | 'version'>,
): SimulationSnapshot {
  return {
    ...next,
    version: SIMULATION_SNAPSHOT_VERSION,
    parentSnapshotId: snapshot.id,
  };
}
