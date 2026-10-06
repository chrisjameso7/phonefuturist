import type { ModelProvenance, ModelRange } from './modules/modeling';

export type SimulationControlMode = 'auto' | 'manual';

export interface VirtualParameter {
  value?: number;
  range?: ModelRange;
  provenance: ModelProvenance;
  confidence?: number;
  sourceId?: string;
  overriddenFrom?: Omit<VirtualParameter, 'overriddenFrom'>;
}

export interface VirtualBattery {
  capacityMah?: VirtualParameter;
  nominalVoltageV?: VirtualParameter;
  usablePercent?: VirtualParameter;
}

export interface VirtualProcessor {
  key?: string;
  cpuPowerLimitW?: VirtualParameter;
  gpuPowerLimitW?: VirtualParameter;
  sustainedPowerLimitW?: VirtualParameter;
}

export interface VirtualThermals {
  ambientTemperatureC?: VirtualParameter;
  thermalResistanceCPerW?: VirtualParameter;
  thermalMassJPerC?: VirtualParameter;
  skinTemperatureLimitC?: VirtualParameter;
}

export interface VirtualDisplay {
  refreshRateHz?: VirtualParameter;
  brightnessNits?: VirtualParameter;
  averagePowerW?: VirtualParameter;
}

export interface VirtualDevice {
  key: string;
  name: string;
  mode: SimulationControlMode;
  battery: VirtualBattery;
  processor: VirtualProcessor;
  thermals: VirtualThermals;
  display: VirtualDisplay;
}

/**
 * User overrides are explicit and never relabelled as evidence.
 * Auto's prior value is retained for UI comparison and one-tap reset.
 */
export function withUserOverride(
  current: VirtualParameter | undefined,
  value: number,
  note = 'User override',
): VirtualParameter {
  if (!Number.isFinite(value)) throw new Error('Override must be finite.');
  const overriddenFrom = current
    ? {
        ...(current.value !== undefined ? { value: current.value } : {}),
        ...(current.range !== undefined ? { range: current.range } : {}),
        provenance: current.provenance,
        ...(current.confidence !== undefined ? { confidence: current.confidence } : {}),
        ...(current.sourceId !== undefined ? { sourceId: current.sourceId } : {}),
      }
    : undefined;

  return {
    value,
    provenance: { kind: 'user', note },
    ...(overriddenFrom ? { overriddenFrom } : {}),
  };
}

/** Restore the immediately previous Auto/evidence parameter when available. */
export function restoreAutoParameter(
  current: VirtualParameter | undefined,
): VirtualParameter | undefined {
  return current?.overriddenFrom ? { ...current.overriddenFrom } : current;
}
