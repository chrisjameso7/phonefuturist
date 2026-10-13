/**
 * Scenario-only 0–100% charging model. Not a measurement or a vendor-specific
 * charging curve. Integrates an illustrative constant-power to taper profile.
 */
export function projectTaperedChargingMinutes(input: {
  energyWh: number;
  ratedWatts: number;
  efficiency?: number;
  chargingStandard?: string;
  cellArchitecture?: 'single-cell' | 'dual-cell' | 'tri-cell' | 'quad-cell' | 'unknown';
}): number | undefined {
  const { energyWh, ratedWatts } = input;
  if (!Number.isFinite(energyWh) || !Number.isFinite(ratedWatts) || energyWh <= 0 || ratedWatts <= 0) return undefined;
  const standard = (input.chargingStandard ?? '').toLowerCase();
  const standardizedProfile = /supervooc|hypercharge|flashcharge|supercharge/.test(standard);
  const twoOrMoreCells = input.cellArchitecture === 'dual-cell' || input.cellArchitecture === 'tri-cell' || input.cellArchitecture === 'quad-cell';
  const efficiency = input.efficiency ?? 0.85;
  // Standard labels select illustrative taper profiles, not measured vendor curves.
  const earlyPowerFactor = standardizedProfile && twoOrMoreCells ? 0.79 : standardizedProfile ? 0.74 : 0.70;
  const taperStart = standardizedProfile ? 0.62 : 0.55;
  if (!(efficiency > 0 && efficiency <= 1)) return undefined;
  let hours = 0;
  for (let percent = 0; percent < 100; percent++) {
    const stateOfCharge = (percent + 0.5) / 100;
    // A conservative average power assumption with progressive high-SoC taper.
    const fraction = stateOfCharge < taperStart ? earlyPowerFactor
      : stateOfCharge < 0.80 ? earlyPowerFactor - (stateOfCharge - taperStart) * 1.12
      : Math.max(0.15, earlyPowerFactor - (0.80 - taperStart) * 1.12 - (stateOfCharge - 0.80) * 1.35);
    const effectiveW = ratedWatts * Math.max(0.15, fraction) * efficiency;
    hours += (energyWh / 100) / effectiveW;
  }
  return Math.round(hours * 60);
}
