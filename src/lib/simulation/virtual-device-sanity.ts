import type { VirtualDeviceModel, VirtualParameter } from './virtual-device';
import { sameConditions } from './virtual-device-evidence';

type Known = Exclude<VirtualParameter, { status: 'unknown' }>;
/** Necessary consistency checks, not a claim of calibrated accuracy or a test runner. */
export function validateVirtualEngineering(model: VirtualDeviceModel): string[] {
  const known = model.parameters.filter((p): p is Known => p.status !== 'unknown');
  const issues: string[] = [];
  const peers = (p: Known, key: Known['key']) => known.filter(q => q.key === key && sameConditions(p.conditions, q.conditions));
  const chargePeers = (p: Known, key: Known['key']) => known.filter(q => q.key === key && sameConditions({ ...p.conditions, stateOfCharge: undefined }, { ...q.conditions, stateOfCharge: undefined }));
  const disjoint = (a: {min:number;max:number}, b: {min:number;max:number}) => a.max < b.min - 1e-9 || b.max < a.min - 1e-9;
  for (const p of known) {
    if (p.key === 'battery.energy') for (const capacity of peers(p, 'battery.capacity')) for (const voltage of peers(p, 'battery.nominalVoltage')) {
      if (disjoint(p.range, { min: capacity.range.min * voltage.range.min / 1000, max: capacity.range.max * voltage.range.max / 1000 })) issues.push('Battery pack energy contradicts capacity and voltage.');
    }
    if (p.key === 'battery.averagePower') {
      for (const component of [...peers(p, 'cpu.power'), ...peers(p, 'gpu.power')]) {
        if (component.range.min > p.range.max) issues.push('Component power exceeds whole-device power at the same operating point.');
      }
      for (const cpu of peers(p, 'cpu.power')) for (const gpu of peers(p, 'gpu.power')) {
        if (cpu.range.min + gpu.range.min > p.range.max) issues.push('Combined CPU/GPU power exceeds whole-device power.');
      }
    }
    if (p.key === 'cpu.multiCore') for (const single of peers(p, 'cpu.singleCore')) {
      if (p.range.max < single.range.min) issues.push('Multi-core performance is below single-core performance under identical benchmark conditions.');
    }
    if (p.key === 'charging.acceptedPower') for (const peak of chargePeers(p, 'charging.peakPower')) for (const efficiency of chargePeers(p, 'charging.efficiency')) {
      if (p.range.min > peak.range.max * efficiency.range.max) issues.push('Accepted battery charging power exceeds input power after conversion efficiency.');
    }
    if (p.key === 'thermal.sustainedPower' && p.conditions.ambientC !== undefined) {
      for (const resistance of peers(p, 'thermal.resistance')) for (const throttle of peers(p, 'thermal.throttleTemperature')) {
        if (p.conditions.ambientC + p.range.min * resistance.range.min > throttle.range.max) issues.push('Sustained thermal power cannot remain below the stated throttle temperature.');
      }
    }
  }
  return [...new Set(issues)];
}
