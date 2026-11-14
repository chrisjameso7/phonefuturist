import { describe, expect, it } from 'vitest';
import { BASIS_LABELS, checkBuild, defaultBuild, replaceComponent, resolveBuild, thermalBudget, removePart, SOURCES } from '../src/lib/labs/build';
import { ARCHITECTURES } from '../src/lib/labs/build/architectures';
import { DEFAULT_DESIGN, DEVICE_PRESETS, type DeviceDesign } from '../src/lib/labs/device-design';

const studio: DeviceDesign = { ...DEFAULT_DESIGN, family: 'plateau', cameraWidth: 68, cameraHeight: 44, frameFinish: 'brushedTitanium', backFinish: 'glossyGlass', frontFinish: 'antiReflective' };
const check = (build = defaultBuild(studio)) => checkBuild(resolveBuild(build));
const ids = (build = defaultBuild(studio)) => check(build).findings.filter(f => f.level !== 'pass').map(f => f.id);
const swap = (pairs: Array<[string, string | null]>, design = studio) => pairs.reduce((b, [slot, id]) => replaceComponent(b, slot, id), defaultBuild(design));

describe('Build a Phone compatibility', () => {
  it('passes the default build for every architecture with no blockers', () => {
    for (const arch of Object.keys(ARCHITECTURES)) {
      const report = check(defaultBuild(studio, arch));
      expect(report.counts.blocker).toBe(0);
      expect(report.counts.pass).toBeGreaterThan(2);
    }
  });
  it('labels every finding with a basis and registered sources, and never calls an estimate verified', () => {
    const report = check(swap([['panel', 'panel-ips-lcd'], ['fingerprint', 'fp-optical'], ['charging-ic', 'charger-120'], ['soc', 'ap-efficiency']], { ...studio, backFinish: 'titanium' }));
    expect(report.findings.length).toBeGreaterThan(5);
    for (const f of report.findings) {
      expect(Object.hasOwn(BASIS_LABELS, f.basis)).toBe(true);
      for (const id of f.sources) expect(SOURCES[id]).toBeTruthy();
      if (f.basis === 'estimate') { expect(BASIS_LABELS.estimate).toContain('not verified'); expect(f.detail).not.toMatch(/\bguarantee|certified|verified\b/i); }
      if (f.basis === 'standard') expect(f.sources.some(id => SOURCES[id].kind === 'standard')).toBe(true);
      if (f.basis === 'principle') expect(f.sources.some(id => SOURCES[id].kind === 'principle')).toBe(true);
    }
    expect(BASIS_LABELS.layout).toContain('representative');
  });
  it('detects physical impossibilities from physics, not guesses', () => {
    expect(ids(swap([['wireless-coil', 'coil-15']], { ...studio, backFinish: 'titanium' }))).toContain('wpc-shield');
    expect(ids(defaultBuild({ ...studio, backFinish: 'steel' }))).not.toContain('nfc-shield');
    expect(ids(swap([['antenna-nfc', 'antenna-nfc-loop'], ['nfc', 'nfc-controller']], { ...studio, backFinish: 'steel' }))).toContain('nfc-shield');
    expect(check(defaultBuild({ ...studio, backFinish: 'titanium' })).counts.blocker).toBe(0);
    expect(ids(swap([['panel', 'panel-ips-lcd'], ['fingerprint', 'fp-optical']]))).toContain('fp-lcd');
    expect(ids(defaultBuild({ ...studio, antenna: false, frameFinish: 'steel' }))).toContain('antenna-breaks');
    expect(ids(defaultBuild({ ...studio, antenna: false, frameFinish: 'plastic' }))).not.toContain('antenna-breaks');
  });
  it('detects geometry conflicts from the layout', () => {
    const big = check(swap([['battery', 'cell-7000-sic']], { ...studio, ...DEVICE_PRESETS.compact }));
    expect(big.findings.some(f => f.id === 'battery-bay' || f.id === 'battery-depth')).toBe(true);
    expect(big.findings.find(f => f.id === 'battery-bay' || f.id === 'battery-depth')!.basis).toBe('layout');
    const deep = check(swap([['camera-main', 'cam-main-1in']], { ...studio, family: 'stealth', protrusion: .5, thickness: 7 }));
    expect(deep.findings.some(f => f.id === 'cam-depth-camera-main' && f.level === 'blocker')).toBe(true);
  });
  it('detects interface and electrical mismatches', () => {
    expect(ids(swap([['soc', 'ap-efficiency'], ['ram', 'ram-12-lpddr5x']]))).toContain('ram-interface');
    expect(ids(swap([['soc', 'ap-flagship'], ['ram', 'ram-6-lpddr4x']]))).toContain('ram-interface');
    expect(ids(swap([['soc', 'ap-efficiency'], ['storage', 'ufs-512-4.0']]))).toContain('ufs-speed');
    expect(ids(swap([['charging-ic', 'charger-120']]))).toContain('charge-rate');
    expect(ids(swap([['charging-ic', 'charger-120']]))).toContain('pd-range');
    expect(ids(swap([['charging-ic', 'charger-100'], ['battery', 'cell-dual-6000-sic']]))).not.toContain('charge-rate');
    expect(ids(swap([['charging-ic', 'charger-100']]))).toContain('charge-rate');
    expect(ids(swap([['pa-module', 'pa-5g-mmwave']]))).toContain('mmwave-antenna');
    expect(ids(swap([['pa-module', 'pa-5g-mmwave'], ['antenna-mmwave', 'antenna-mmwave-aip']]))).not.toContain('mmwave-antenna');
  });
  it('flags missing required parts and clears them when reinstalled', () => {
    const removed = removePart(resolveBuild(defaultBuild(studio)), 'battery').build;
    expect(check(removed).findings.find(f => f.id === 'missing-battery')!.level).toBe('blocker');
    expect(ids(defaultBuild(studio))).not.toContain('missing-battery');
  });
  it('scales the thermal budget with spreader and chassis, as an estimate', () => {
    const base = thermalBudget(resolveBuild(defaultBuild(studio)));
    const bare = thermalBudget(resolveBuild(swap([['vapor-chamber', null], ['graphite', null]])));
    const big = thermalBudget(resolveBuild(defaultBuild({ ...studio, ...DEVICE_PRESETS.ultra })));
    expect(bare.budgetW).toBeLessThan(base.budgetW); expect(big.budgetW).toBeGreaterThan(base.budgetW);
    expect(base.confidence).toBe('estimated');
    expect(ids(swap([['vapor-chamber', null], ['graphite', null]]))).toContain('thermal');
    expect(thermalBudget(resolveBuild(swap([['soc', 'ap-efficiency']]))).sustainedW).toBeLessThan(base.sustainedW);
  });
  it('orders blockers before warnings, notes and passes', () => {
    const order = { blocker: 0, warning: 1, note: 2, pass: 3 };
    const levels = check(swap([['wireless-coil', 'coil-15'], ['charging-ic', 'charger-120']], { ...studio, backFinish: 'titanium' })).findings.map(f => order[f.level]);
    expect([...levels].sort((a, b) => a - b)).toEqual(levels);
  });
});
