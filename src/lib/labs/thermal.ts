import { simulateTwoNodeThermals } from '../simulation/modules/two-node-thermal';
export const WORKLOADS = { gaming: { name: 'Ray-tracing gaming', power: 12, fps: 60 }, video: { name: '4K 120fps video', power: 9, fps: 120 }, benchmark: { name: 'Synthetic benchmark', power: 14, fps: 90 } } as const;
export type ThermalScenario = {
    vaporChamber: number;
    graphite: number;
    fan: boolean;
    ambient: number;
    workload: keyof typeof WORKLOADS;
};
export const DEFAULT_THERMAL: ThermalScenario = { vaporChamber: 4000, graphite: 2, fan: false, ambient: 25, workload: 'gaming' };
/** Educational cooling scenario. Reuses the existing engine without changing its coefficients.
 * Scenario-to-input mappings are illustrative, not measured cooling-system specifications. */
export function runThermalScenario(input: ThermalScenario) {
    if (!Number.isFinite(input.vaporChamber) || input.vaporChamber < 500 || input.vaporChamber > 10000 || !Number.isInteger(input.graphite) || input.graphite < 0 || input.graphite > 6 || !Number.isFinite(input.ambient) || input.ambient < 20 || input.ambient > 45 || !(input.workload in WORKLOADS) || typeof input.fan !== 'boolean')
        throw new Error('Invalid thermal scenario.');
    const workload = WORKLOADS[input.workload];
    const result = simulateTwoNodeThermals({ targetPowerW: workload.power, ambientTemperatureC: input.ambient, socToChassisResistanceCPerW: 3.8 / (1 + input.vaporChamber / 3500 + input.graphite * 0.12), chassisToAmbientResistanceCPerW: input.fan ? 1.8 : 5.5, socThermalMassJPerC: 8, chassisThermalMassJPerC: 65 + input.vaporChamber / 180, socThrottleTemperatureC: 85, durationSeconds: 900, stepSeconds: 1 });
    if (!result)
        throw new Error('Unable to simulate this configuration.');
    return { ...result, points: result.points.map(point => ({ ...point, fps: workload.fps * point.performancePercent / 100 })), throttleLimit: 85, baseFps: workload.fps };
}
