import { it, expect } from 'vitest';
import { analyzeBattery, type BatteryAnalysisInput } from '../src/lib/valuation/battery';
import { getSocEfficiencyCurve } from '../src/lib/simulation/modules/soc-efficiency-registry';
const curve = getSocEfficiencyCurve('Snapdragon 8 Elite', 'geekbench6')!;
const input: BatteryAnalysisInput = { socName: curve.soc, protocol: 'geekbench6', targetBenchmarkScore: curve.points[0].benchmarkScore, activeDutyFraction: .25, inactiveBoardPowerW: .4, displayPowerW: 1, otherPeripheralPowerW: .2, batteryEnergyWh: 20, usableFraction: .95, softwareConsumptionMultiplier: 1 };
it('uses exact processor power and software tuning without multiplying screen power', async () => { const base = await analyzeBattery(input), tuned = await analyzeBattery({ ...input, softwareConsumptionMultiplier: .8 }); expect(base.status).toBe('scenario'); expect(tuned.status).toBe('scenario'); if (base.status === 'scenario' && tuned.status === 'scenario') {
    expect(tuned.runtimeHours).toBeGreaterThan(base.runtimeHours);
    expect(tuned.totalPowerW).toBeCloseTo((base.totalPowerW - 1.2) * .8 + 1.2);
    expect(base.runtimeHours * base.totalPowerW).toBeCloseTo(19);
} });
it('does not invent power for unreleased SoCs or invalid software settings', async () => { expect((await analyzeBattery({ ...input, socName: 'Future Chip 2030' })).status).toBe('unresolved'); await expect(analyzeBattery({ ...input, softwareConsumptionMultiplier: .2 })).rejects.toThrow(); });
it('keeps runtime deterministic when AI fails or attempts a numeric invention', async () => { const base = await analyzeBattery(input); for (const generate of [async () => '{', async () => JSON.stringify({ runtimeHours: 100, summary: 'Battery lasts 100 hours' })])
    expect(await analyzeBattery(input, generate)).toEqual(base); });

it('distinguishes measured processors at matched performance with identical battery capacity', async () => {
 const other=getSocEfficiencyCurve('Snapdragon 8 Gen 3','geekbench6')!;
 const low=Math.max(Math.min(...curve.points.map(p=>p.benchmarkScore)),Math.min(...other.points.map(p=>p.benchmarkScore)));
 const high=Math.min(Math.max(...curve.points.map(p=>p.benchmarkScore)),Math.max(...other.points.map(p=>p.benchmarkScore)));
 expect(high).toBeGreaterThan(low);
 const score=(low+high)/2;
 const first=await analyzeBattery({...input,targetBenchmarkScore:score}),second=await analyzeBattery({...input,socName:other.soc,targetBenchmarkScore:score});
 expect(first.status).toBe('scenario');expect(second.status).toBe('scenario');
 if(first.status==='scenario'&&second.status==='scenario')expect(first.runtimeHours).not.toBeCloseTo(second.runtimeHours,4);
});
