/**
 * Scenario-only 0–100% charging model. Not a measurement or a vendor-specific
 * charging curve. Integrates an illustrative constant-power to taper profile.
 */
export function projectTaperedChargingMinutes(input: {
  energyWh: number;
  ratedWatts: number;
  efficiency?: number;
}): number | undefined {
  const { energyWh, ratedWatts } = input;
  if (!Number.isFinite(energyWh) || !Number.isFinite(ratedWatts) || energyWh <= 0 || ratedWatts <= 0) return undefined;
  const efficiency = input.efficiency ?? 0.85;
  if (!(efficiency > 0 && efficiency <= 1)) return undefined;
  let hours = 0;
  for (let percent = 0; percent < 100; percent++) {
    const stateOfCharge = (percent + 0.5) / 100;
    // A conservative average power assumption with progressive high-SoC taper.
    const fraction = stateOfCharge < 0.55 ? 0.70
      : stateOfCharge < 0.80 ? 0.70 - (stateOfCharge - 0.55) * 1.12
      : 0.42 - (stateOfCharge - 0.80) * 1.35;
    const effectiveW = ratedWatts * Math.max(0.15, fraction) * efficiency;
    hours += (energyWh / 100) / effectiveW;
  }
  return Math.round(hours * 60);
}
