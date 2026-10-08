export const DEVICE_VARIANT_MODEL_VERSION = 'device-variant-0.1.0';

export type SimConfiguration =
  | 'esim_only'
  | 'nano_sim_plus_esim'
  | 'dual_nano_sim'
  | 'other';

export type SocVendor =
  | 'Apple'
  | 'Qualcomm'
  | 'Samsung'
  | 'MediaTek'
  | 'Google'
  | 'Huawei'
  | 'Unisoc'
  | 'other';

export interface DeviceVariantIdentity {
  manufacturer: string;
  family: string;
  modelName: string;
  modelNumber?: string;
  sku?: string;
  region?: string;
  market?: string;
}

export interface BatteryVariant {
  capacityMah?: number;
  typicalCapacityMah?: number;
  ratedCapacityMah?: number;
  nominalVoltageV?: number;
  cellCount?: number;
  chemistry?: string;
  configurationLabel?: string;
}

export interface SocVariant {
  vendor: SocVendor;
  name: string;
  modem?: string;
  fabricationNode?: string;
}

export interface DeviceVariantRecord {
  id: string;
  identity: DeviceVariantIdentity;
  simConfiguration?: SimConfiguration;
  battery?: BatteryVariant;
  soc?: SocVariant;
  softwareBuild?: string;
  notes?: string[];
}

/**
 * Canonical identity key for measurement joins.
 *
 * Marketing name alone is intentionally insufficient because one phone
 * family may ship with different SoCs, battery packs, SIM layouts, RF
 * hardware, or regional configurations.
 */
export function deviceVariantKey(record: DeviceVariantRecord): string {
  const parts = [
    record.identity.manufacturer,
    record.identity.family,
    record.identity.modelName,
    record.identity.modelNumber,
    record.identity.sku,
    record.identity.region,
    record.identity.market,
    record.soc?.name,
    record.battery?.capacityMah,
    record.simConfiguration,
  ];

  return parts
    .filter((value) => value !== undefined && value !== '')
    .map((value) => String(value).trim().toLowerCase())
    .join('|');
}
