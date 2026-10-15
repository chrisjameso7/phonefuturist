/**
 * Repeatable phone battery test profiles.
 * These are TEST CONDITIONS, not inferred device performance or interchangeable
 * with PhoneArena, GSMArena, DXOMARK or Geekerwan measurements.
 */
export type BatteryTestWorkload = 'web_browsing' | 'video_playback' | 'gaming' | 'standby';
export type BatteryTestProfile = {
  id: string;
  workload: BatteryTestWorkload;
  screenOn: boolean;
  network: 'wifi' | 'cellular' | 'airplane';
  brightnessNits: number;
  refreshRateHz: number;
  audio: 'muted' | 'fixed';
  /** Defined by the test operator, rather than assumed by the estimator. */
  procedure: string;
};
export const PHONEFUTURIST_BATTERY_PROFILES: Readonly<Record<BatteryTestWorkload, BatteryTestProfile>> = {
  web_browsing: {
    id: 'pf-web-wifi-200nit-60hz-v1', workload: 'web_browsing',
    screenOn: true, network: 'wifi', brightnessNits: 200, refreshRateHz: 60,
    audio: 'muted', procedure: 'Repeat the same scripted page sequence and scroll schedule until depletion.',
  },
  video_playback: {
    id: 'pf-video-wifi-200nit-60hz-v1', workload: 'video_playback',
    screenOn: true, network: 'wifi', brightnessNits: 200, refreshRateHz: 60,
    audio: 'fixed', procedure: 'Loop an identical locally cached video at the same codec, resolution and fixed volume.',
  },
  gaming: {
    id: 'pf-game-wifi-200nit-60hz-v1', workload: 'gaming',
    screenOn: true, network: 'wifi', brightnessNits: 200, refreshRateHz: 60,
    audio: 'fixed', procedure: 'Replay an identical game scene with matched graphics settings, frame cap and duration.',
  },
  standby: {
    id: 'pf-standby-wifi-v1', workload: 'standby',
    screenOn: false, network: 'wifi', brightnessNits: 0, refreshRateHz: 0,
    audio: 'muted', procedure: 'Record screen-off energy drain over a known interval, with sync and radios documented.',
  },
};
export type BatteryTestObservation = {
  profileId: string;
  deviceId: string;
  durationHours: number;
  energyConsumedWh: number;
  /** Source-owned measurement: never derive it from other reviewers' incompatible tests. */
  source: string;
};
export function normalizeBatteryTestObservation(observation: BatteryTestObservation) {
  if (!observation.profileId || !observation.deviceId || !observation.source.trim() ||
    !Number.isFinite(observation.durationHours) || observation.durationHours <= 0 ||
    !Number.isFinite(observation.energyConsumedWh) || observation.energyConsumedWh <= 0)
    return {status:'unresolved' as const, reason:'Valid source, elapsed time and measured energy are required.'};
  if (!Object.values(PHONEFUTURIST_BATTERY_PROFILES).some(profile => profile.id === observation.profileId))
    return {status:'unresolved' as const, reason:'Unknown or incompatible measurement protocol.'};
  return {status:'resolved' as const, averagePowerW:observation.energyConsumedWh / observation.durationHours,
    profileId:observation.profileId, deviceId:observation.deviceId, source:observation.source};
}
