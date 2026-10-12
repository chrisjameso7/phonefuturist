import {
  findGeekerwanBatteryResult,
  type GeekerwanBatteryResult,
} from './geekerwan-socpk-evidence';
import {
  findPhoneArenaBatteryResult,
  phoneArenaBatteryEfficiency,
  type PhoneArenaBatteryResult,
} from './phonearena-battery-evidence';

export const CROSS_LAB_BATTERY_CONTEXT_VERSION =
  'cross-lab-battery-context-0.1.0';

export interface CrossLabBatteryContext {
  version: string;
  status: 'resolved' | 'partial' | 'unresolved';
  manufacturer: string;
  model: string;
  geekerwan?: {
    runtimeMinutes: number;
    ratedEnergyWh?: number;
    averagePowerW?: number;
    minutesPerWh?: number;
    systemVersion: string;
    videoUrl: string;
  };
  phoneArena?: {
    batteryMah: number;
    estimatedMinutes: number;
    browsingMinutes: number;
    videoMinutes: number;
    gamingMinutes: number;
    estimatedMinutesPer1000Mah: number;
    browsingMinutesPer1000Mah: number;
    videoMinutesPer1000Mah: number;
    gamingMinutesPer1000Mah: number;
    url: string;
  };
  evidenceCount: number;
  labAgreement:
    | 'not-comparable'
    | 'single-lab'
    | 'cross-lab-context';
  warnings: string[];
  note: string;
}

function geekerwanView(
  result: GeekerwanBatteryResult,
) {
  return {
    runtimeMinutes:
      result.runtimeMinutes,
    ...(result.ratedEnergyWh !== undefined
      ? {
          ratedEnergyWh:
            result.ratedEnergyWh,
        }
      : {}),
    ...(result.averagePowerW !== undefined
      ? {
          averagePowerW:
            result.averagePowerW,
        }
      : {}),
    ...(result.minutesPerWh !== undefined
      ? {
          minutesPerWh:
            result.minutesPerWh,
        }
      : {}),
    systemVersion:
      result.systemVersion,
    videoUrl:
      result.videoUrl,
  };
}

function phoneArenaView(
  result: PhoneArenaBatteryResult,
) {
  const efficiency =
    phoneArenaBatteryEfficiency(
      result,
    );

  return {
    batteryMah: result.batteryMah,
    estimatedMinutes:
      result.estimatedMinutes,
    browsingMinutes:
      result.browsingMinutes,
    videoMinutes:
      result.videoMinutes,
    gamingMinutes:
      result.gamingMinutes,
    ...efficiency,
    url: result.url,
  };
}

export function buildCrossLabBatteryContext(
  manufacturer: string,
  model: string,
): CrossLabBatteryContext {
  const geekerwan =
    findGeekerwanBatteryResult(
      manufacturer,
      model,
    );
  const phoneArena =
    findPhoneArenaBatteryResult(
      manufacturer,
      model,
    );

  const evidenceCount =
    Number(Boolean(geekerwan)) +
    Number(Boolean(phoneArena));

  if (!evidenceCount) {
    return {
      version:
        CROSS_LAB_BATTERY_CONTEXT_VERSION,
      status: 'unresolved',
      manufacturer,
      model,
      evidenceCount: 0,
      labAgreement:
        'not-comparable',
      warnings: [],
      note:
        'No exact Geekerwan Battery Life 5.0 or PhoneArena battery benchmark result exists for this device.',
    };
  }

  const warnings: string[] = [];

  if (
    geekerwan &&
    phoneArena
  ) {
    warnings.push(
      'Geekerwan Battery Life 5.0 and PhoneArena battery workloads are different protocols. Their raw runtime hours must not be averaged or treated as interchangeable.',
    );

    if (
      geekerwan.ratedEnergyWh !==
      undefined
    ) {
      warnings.push(
        'Geekerwan provides energy-normalized context through rated Wh, while this PhoneArena snapshot exposes mAh. Cross-lab efficiency should therefore be interpreted qualitatively unless an evidence-backed nominal voltage/Wh value is attached to the same PhoneArena device.',
      );
    }
  }

  return {
    version:
      CROSS_LAB_BATTERY_CONTEXT_VERSION,
    status:
      evidenceCount === 2
        ? 'resolved'
        : 'partial',
    manufacturer,
    model,
    ...(geekerwan
      ? {
          geekerwan:
            geekerwanView(
              geekerwan,
            ),
        }
      : {}),
    ...(phoneArena
      ? {
          phoneArena:
            phoneArenaView(
              phoneArena,
            ),
        }
      : {}),
    evidenceCount,
    labAgreement:
      evidenceCount === 2
        ? 'cross-lab-context'
        : 'single-lab',
    warnings,
    note:
      evidenceCount === 2
        ? 'Two independent lab protocols are available for this exact phone. PhoneFuturist preserves them side by side to reveal protocol sensitivity instead of collapsing them into one synthetic runtime.'
        : 'One independent lab protocol is available for this exact phone; no cross-lab agreement claim is made.',
  };
}
