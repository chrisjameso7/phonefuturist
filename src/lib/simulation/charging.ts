import chargingJson from '../../../data/calibration/battery/charging-runtimes.json';

export const CHARGING_MODEL_VERSION = '0.6.0';

export interface ChargingInput {
  deviceName?: string;
  batteryCapacityMah?: number;
  wiredChargerW?: number;
}

export interface ChargingReference {
  id: string;
  manufacturer: string;
  model: string;
  release_date: string;
  battery_capacity_mah: number;
  wired_charger_w: number;
  full_charge_minutes: number;
  charge_30m_percent: number;
}

export interface ChargingEstimate {
  version: string;
  status: 'resolved' | 'unresolved';
  unresolved?: {
    code:
      | 'MISSING_CAPACITY'
      | 'MISSING_CHARGER_POWER'
      | 'INVALID_INPUT'
      | 'NO_REFERENCES';
    message: string;
    missing: string[];
  };
  estimate?: {
    basis: 'matched-reference' | 'reference-cohort';
    matchedReference?: {
      id: string;
      label: string;
      charge30mPercent: number;
      fullChargeMinutes: number;
    };
    referenceCount: number;
    charge30mPercent: { min: number; max: number };
    timeTo50Minutes: { min: number; max: number };
    timeTo80Minutes: { min: number; max: number };
    timeTo100Minutes: { min: number; max: number };
    neighborIds: string[];
    note: string;
  };
}

const refs = (
  chargingJson as unknown as { references: ChargingReference[] }
).references;

function positive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function exactNameMatch(name: string | undefined, reference: ChargingReference) {
  const normalized = name?.trim().toLowerCase();
  if (!normalized) return false;

  const model = reference.model.toLowerCase();
  const full = `${reference.manufacturer} ${reference.model}`.toLowerCase();

  return normalized === model || normalized === full;
}

function curveTime(
  targetPercent: number,
  percentAt30: number,
  fullMinutes: number,
): number {
  const p30 = clamp(percentAt30, 0.1, 100);
  const full = Math.max(fullMinutes, 1);

  if (full <= 30 || p30 >= 99.9) {
    return full * (targetPercent / 100);
  }

  if (targetPercent <= p30) {
    return 30 * (targetPercent / p30);
  }

  return (
    30 +
    (full - 30) *
      ((targetPercent - p30) / (100 - p30))
  );
}

function predictionFromReference(
  inputCapacityMah: number,
  reference: ChargingReference,
) {
  const earlyMahPerMinute =
    (reference.battery_capacity_mah *
      (reference.charge_30m_percent / 100)) /
    30;

  const fullMahPerMinute =
    reference.battery_capacity_mah /
    reference.full_charge_minutes;

  const fullMinutes = inputCapacityMah / fullMahPerMinute;

  const p30 =
    fullMinutes <= 30
      ? 100
      : clamp(
          (earlyMahPerMinute * 30 * 100) /
            inputCapacityMah,
          1,
          99.9,
        );

  return {
    charge30mPercent: p30,
    timeTo50Minutes: curveTime(50, p30, fullMinutes),
    timeTo80Minutes: curveTime(80, p30, fullMinutes),
    timeTo100Minutes: fullMinutes,
  };
}

const BRAND_FAMILIES: Record<string, string> = {
  samsung: 'conservative',
  google: 'conservative',
  apple: 'conservative',
  oneplus: 'bbk',
  oppo: 'bbk',
  realme: 'bbk',
  vivo: 'bbk',
  iqoo: 'bbk',
  xiaomi: 'xiaomi',
  poco: 'xiaomi',
  redmi: 'xiaomi',
  honor: 'huawei-honor',
  huawei: 'huawei-honor',
  motorola: 'motorola',
  redmagic: 'gaming',
  'zte nubia': 'gaming',
  asus: 'gaming',
};

function inferBrand(name: string | undefined): string | undefined {
  const normalized = name?.trim().toLowerCase();
  if (!normalized) return undefined;

  const manufacturers = [...new Set(
    refs.map((reference) => reference.manufacturer.toLowerCase()),
  )].sort((a, b) => b.length - a.length);

  return manufacturers.find(
    (manufacturer) =>
      normalized === manufacturer ||
      normalized.startsWith(`${manufacturer} `) ||
      normalized.includes(` ${manufacturer} `),
  );
}

function brandFamily(manufacturer: string): string | undefined {
  return BRAND_FAMILIES[manufacturer.toLowerCase()];
}

function scoreReference(
  capacityMah: number,
  wiredChargerW: number,
  reference: ChargingReference,
  inferredBrand?: string,
): number {
  const capacityDistance = Math.abs(
    Math.log(capacityMah / reference.battery_capacity_mah),
  );

  const chargerDistance = Math.abs(
    Math.log(wiredChargerW / reference.wired_charger_w),
  );

  let brandAdjustment = 0;

  if (inferredBrand) {
    const referenceBrand = reference.manufacturer.toLowerCase();

    if (referenceBrand === inferredBrand) {
      // Same-brand charging control, taper strategy and thermal limits are
      // often more predictive than raw advertised wattage alone.
      brandAdjustment = -0.9;
    } else {
      const inputFamily = brandFamily(inferredBrand);
      const referenceFamily = brandFamily(referenceBrand);

      if (
        inputFamily !== undefined &&
        referenceFamily !== undefined &&
        inputFamily === referenceFamily
      ) {
        brandAdjustment = -0.35;
      } else {
        brandAdjustment = 0.15;
      }
    }
  }

  return (
    chargerDistance * 1.6 +
    capacityDistance +
    brandAdjustment
  );
}

function bounds(values: number[]): { min: number; max: number } {
  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

export function simulateCharging(
  input: ChargingInput,
): ChargingEstimate {
  const capacity = input.batteryCapacityMah;
  const chargerW = input.wiredChargerW;

  if (!positive(capacity)) {
    return {
      version: CHARGING_MODEL_VERSION,
      status: 'unresolved',
      unresolved: {
        code: 'MISSING_CAPACITY',
        message:
          'Battery capacity is required to estimate charging.',
        missing: ['batteryCapacityMah'],
      },
    };
  }

  if (!positive(chargerW)) {
    return {
      version: CHARGING_MODEL_VERSION,
      status: 'unresolved',
      unresolved: {
        code: 'MISSING_CHARGER_POWER',
        message:
          'Enter the phone’s supported wired charging wattage.',
        missing: ['wiredChargerW'],
      },
    };
  }

  if (capacity > 20000 || chargerW > 300) {
    return {
      version: CHARGING_MODEL_VERSION,
      status: 'unresolved',
      unresolved: {
        code: 'INVALID_INPUT',
        message:
          'Battery capacity or charger power is outside the supported phone range.',
        missing: [],
      },
    };
  }

  if (!refs.length) {
    return {
      version: CHARGING_MODEL_VERSION,
      status: 'unresolved',
      unresolved: {
        code: 'NO_REFERENCES',
        message:
          'No charging calibration references are available.',
        missing: ['charging references'],
      },
    };
  }

  const matched = refs.find(
    (reference) =>
      exactNameMatch(input.deviceName, reference) &&
      Math.abs(reference.battery_capacity_mah - capacity) /
        reference.battery_capacity_mah <=
        0.18 &&
      Math.abs(reference.wired_charger_w - chargerW) /
        reference.wired_charger_w <=
        0.25,
  );

  if (matched) {
    const prediction = predictionFromReference(capacity, matched);

    return {
      version: CHARGING_MODEL_VERSION,
      status: 'resolved',
      estimate: {
        basis: 'matched-reference',
        matchedReference: {
          id: matched.id,
          label: `${matched.manufacturer} ${matched.model}`,
          charge30mPercent: matched.charge_30m_percent,
          fullChargeMinutes: matched.full_charge_minutes,
        },
        referenceCount: 1,
        charge30mPercent: {
          min: matched.charge_30m_percent,
          max: matched.charge_30m_percent,
        },
        timeTo50Minutes: {
          min: prediction.timeTo50Minutes,
          max: prediction.timeTo50Minutes,
        },
        timeTo80Minutes: {
          min: prediction.timeTo80Minutes,
          max: prediction.timeTo80Minutes,
        },
        timeTo100Minutes: {
          min: matched.full_charge_minutes,
          max: matched.full_charge_minutes,
        },
        neighborIds: [matched.id],
        note:
          '30-minute and full-charge values come from the matched lab reference. 50% and 80% times are interpolated from that measured charging curve.',
      },
    };
  }

  const inferredBrand = inferBrand(input.deviceName);

  const neighbors = refs
    .map((reference) => ({
      reference,
      score: scoreReference(
        capacity,
        chargerW,
        reference,
        inferredBrand,
      ),
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 7);

  const predictions = neighbors.map(({ reference }) =>
    predictionFromReference(capacity, reference),
  );

  return {
    version: CHARGING_MODEL_VERSION,
    status: 'resolved',
    estimate: {
      basis: 'reference-cohort',
      referenceCount: neighbors.length,
      charge30mPercent: bounds(
        predictions.map((prediction) => prediction.charge30mPercent),
      ),
      timeTo50Minutes: bounds(
        predictions.map((prediction) => prediction.timeTo50Minutes),
      ),
      timeTo80Minutes: bounds(
        predictions.map((prediction) => prediction.timeTo80Minutes),
      ),
      timeTo100Minutes: bounds(
        predictions.map((prediction) => prediction.timeTo100Minutes),
      ),
      neighborIds: neighbors.map(({ reference }) => reference.id),
      note:
        inferredBrand
          ? 'Estimate uses the seven closest released-phone references by charger power and battery capacity, with extra weight for the same manufacturer and a smaller weight for closely related charging families. This helps future devices follow the brand’s real charging behavior instead of treating every 60 W phone alike.'
          : 'Estimate uses the seven closest released-phone references by charger power and battery capacity. It preserves real charging taper by deriving the curve from each reference phone’s measured 30-minute and full-charge observations instead of assuming charger wattage is sustained.',
    },
  };
}

export const CHARGING_REFERENCE_COUNT = refs.length;
