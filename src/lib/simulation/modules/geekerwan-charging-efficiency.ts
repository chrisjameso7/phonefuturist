import type {
  DeviceCorpus,
} from './device-corpus';
import {
  linkDeviceIdentities,
} from './device-identity-linker';

export const GEEKERWAN_CHARGING_EFFICIENCY_VERSION =
  'geekerwan-charging-efficiency-0.1.0';

export interface GeekerwanChargingEfficiencyRow {
  canonicalDeviceId: string;
  linkedDeviceIds: string[];
  manufacturer: string;
  model: string;
  batteryEnergyWh: number;
  wallInputEnergyWh: number;
  fullChargeMinutes: number;
  chargerPowerW: number;
  averageWallInputPowerW: number;
  cellToWallEnergyRatio: number;
  wallToCellOverheadPercent: number;
  averageChargerUtilizationFraction: number;
  averageChargerUtilizationPercent: number;
  sourceIds: string[];
}

export interface GeekerwanChargingEfficiencyResult {
  version: string;
  rows: GeekerwanChargingEfficiencyRow[];
  pairedDeviceCount: number;
  note: string;
}

function positive(
  value: unknown,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0
  );
}

export function buildGeekerwanChargingEfficiencyRows(
  corpus: DeviceCorpus,
): GeekerwanChargingEfficiencyResult {
  const deviceById =
    new Map(
      corpus.devices.map(
        (device) => [
          device.variant.id,
          device,
        ],
      ),
    );

  const canonicalById =
    new Map<string, string>();

  for (
    const link of
    linkDeviceIdentities(corpus)
  ) {
    for (
      const id of
      link.linkedDeviceIds
    ) {
      canonicalById.set(
        id,
        link.canonicalDeviceId,
      );
    }
  }

  const canonical = (
    id: string,
  ) =>
    canonicalById.get(id) ?? id;

  const groups =
    new Map<
      string,
      {
        ids: Set<string>;
        batteryEnergyWh?: number;
        wallInputEnergyWh?: number;
        fullChargeMinutes?: number;
        chargerPowerW?: number;
        averageWallInputPowerW?: number;
        sourceIds: Set<string>;
      }
    >();

  for (
    const measurement of
    corpus.measurements
  ) {
    if (
      measurement.metric !==
        'geekerwan_published_battery_energy_wh' &&
      measurement.metric !==
        'geekerwan_wall_input_energy_curve_end_wh' &&
      measurement.metric !==
        'geekerwan_wall_input_curve_end_minutes' &&
      measurement.metric !==
        'geekerwan_average_wall_input_power_w'
    ) {
      continue;
    }

    const id =
      canonical(
        measurement.deviceVariantId,
      );

    const group =
      groups.get(id) ?? {
        ids: new Set<string>(),
        sourceIds: new Set<string>(),
      };

    group.ids.add(
      measurement.deviceVariantId,
    );
    group.sourceIds.add(
      measurement.sourceId,
    );

    if (
      measurement.metric ===
      'geekerwan_published_battery_energy_wh'
    ) {
      group.batteryEnergyWh =
        measurement.value;
    } else if (
      measurement.metric ===
      'geekerwan_wall_input_energy_curve_end_wh'
    ) {
      group.wallInputEnergyWh =
        measurement.value;
    } else if (
      measurement.metric ===
      'geekerwan_wall_input_curve_end_minutes'
    ) {
      group.fullChargeMinutes =
        measurement.value;

      if (
        positive(
          measurement.testChargerWatts,
        )
      ) {
        group.chargerPowerW =
          measurement.testChargerWatts;
      }
    } else if (
      measurement.metric ===
      'geekerwan_average_wall_input_power_w'
    ) {
      group.averageWallInputPowerW =
        measurement.value;

      if (
        positive(
          measurement.testChargerWatts,
        )
      ) {
        group.chargerPowerW =
          measurement.testChargerWatts;
      }
    }

    groups.set(id, group);
  }

  const rows:
    GeekerwanChargingEfficiencyRow[] =
    [];

  for (
    const [
      canonicalDeviceId,
      group,
    ] of groups
  ) {
    if (
      !positive(
        group.batteryEnergyWh,
      ) ||
      !positive(
        group.wallInputEnergyWh,
      ) ||
      !positive(
        group.fullChargeMinutes,
      ) ||
      !positive(
        group.chargerPowerW,
      ) ||
      !positive(
        group.averageWallInputPowerW,
      )
    ) {
      continue;
    }

    const device =
      deviceById.get(
        canonicalDeviceId,
      ) ??
      [...group.ids]
        .map(
          (id) =>
            deviceById.get(id),
        )
        .find(Boolean);

    if (!device) continue;

    const cellToWallEnergyRatio =
      group.batteryEnergyWh /
      group.wallInputEnergyWh;

    const averageChargerUtilizationFraction =
      group.averageWallInputPowerW /
      group.chargerPowerW;

    rows.push({
      canonicalDeviceId,
      linkedDeviceIds:
        [...group.ids],
      manufacturer:
        device.variant.identity
          .manufacturer,
      model:
        device.variant.identity
          .modelName,
      batteryEnergyWh:
        group.batteryEnergyWh,
      wallInputEnergyWh:
        group.wallInputEnergyWh,
      fullChargeMinutes:
        group.fullChargeMinutes,
      chargerPowerW:
        group.chargerPowerW,
      averageWallInputPowerW:
        group.averageWallInputPowerW,
      cellToWallEnergyRatio,
      wallToCellOverheadPercent:
        (
          group.wallInputEnergyWh /
          group.batteryEnergyWh -
          1
        ) *
        100,
      averageChargerUtilizationFraction,
      averageChargerUtilizationPercent:
        averageChargerUtilizationFraction *
        100,
      sourceIds:
        [...group.sourceIds],
    });
  }

  return {
    version:
      GEEKERWAN_CHARGING_EFFICIENCY_VERSION,
    rows,
    pairedDeviceCount:
      rows.length,
    note:
      'Pairs Geekerwan Battery Life 5.0 published cell energy with Geekerwan/SOCPK wall-input charging energy for the same canonical phone. Wall-input overhead includes charger, conversion and circuit losses. Ratios are measured device outcomes, not universal chemistry constants.',
  };
}
