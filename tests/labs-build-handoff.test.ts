import { describe, expect, it } from 'vitest';
import { addSaved, checkBuild, compareBuilds, defaultBuild, HANDOFF_FIELDS, parseSaved, readHandoff, replaceComponent, resolveBuild, toSimulatorHandoff, MAX_SAVED } from '../src/lib/labs/build';
import { DEFAULT_DESIGN, DEVICE_PRESETS, type DeviceDesign } from '../src/lib/labs/device-design';

const studio: DeviceDesign = { ...DEFAULT_DESIGN, family: 'plateau', cameraWidth: 68, cameraHeight: 44, frameFinish: 'brushedTitanium', backFinish: 'glossyGlass', frontFinish: 'antiReflective', name: 'Test concept' };
const handoff = (build = defaultBuild(studio)) => toSimulatorHandoff(resolveBuild(build));

describe('Build a Phone hand-off to Interactive Leaks', () => {
  it('maps the build onto the simulator vocabulary with provenance for every field', () => {
    const h = handoff();
    expect(h.form).toMatchObject({ name: 'Test concept', widthMm: '76', heightMm: '163', thicknessMm: '8.5', panelTechnology: 'LTPO OLED', batteryVoltageV: '3.87', cellArchitecture: 'single-cell', chargingStandard: 'USB PD', coolingClass: 'large-vapor-chamber', wirelessChargingStandard: 'Qi' });
    expect(Number(h.form.batteryCapacityMah)).toBeGreaterThan(3000);
    expect(Number(h.form.diagonalInches)).toBeGreaterThan(6.5); expect(Number(h.form.diagonalInches)).toBeLessThan(7.2);
    for (const key of Object.keys(h.form)) expect(h.provenance[key as keyof typeof h.provenance]).toBeTruthy();
    expect(h.provenance.widthMm).toBe('user'); expect(h.provenance.batteryCapacityMah).toBe('estimated'); expect(h.provenance.weightG).toBe('estimated');
    expect(h.cameras.map(c => c.type)).toEqual(['wide', 'ultrawide', 'telephoto', 'front']);
    expect(h.cameras[0]).toMatchObject({ sensorFormatDenominator: '1.3', equivalentFocalLengthMm: '24' });
    expect(h.cameras[2].equivalentFocalLengthMm).toBe('72');
    expect(h.notSet.join(' ')).toContain('processor');
  });
  it('maps cooling, chemistry, cells, periscopes and fast charging', () => {
    const h = handoff([['battery', 'cell-dual-6000-sic'], ['charging-ic', 'charger-120'], ['vapor-chamber', null], ['camera-tele', 'cam-tele-peri-5x'], ['wireless-coil', 'coil-25']].reduce((b, [s, c]) => replaceComponent(b, s as string, c as string | null), defaultBuild(studio)));
    expect(h.form).toMatchObject({ batteryChemistry: 'silicon-carbon', cellArchitecture: 'dual-cell', chargingStandard: 'Proprietary / other', coolingClass: 'passive-graphite', wirelessChargingStandard: 'Qi2 Magnetic Power Profile' });
    expect(h.cameras.find(c => c.type === 'periscope')!.equivalentFocalLengthMm).toBe('120');
  });
  it('survives a JSON round trip and only uses whitelisted simulator fields', () => {
    const h = handoff(), back = readHandoff(JSON.parse(JSON.stringify(h)))!;
    expect(back.form).toEqual(h.form); expect(back.cameras).toEqual(h.cameras);
    for (const key of Object.keys(back.form)) expect(HANDOFF_FIELDS).toContain(key);
  });
  it('rejects tampered or malformed hand-offs', () => {
    const h = handoff();
    expect(readHandoff(null)).toBeNull(); expect(readHandoff('x')).toBeNull(); expect(readHandoff([])).toBeNull();
    expect(readHandoff({ ...h, version: 2 })).toBeNull();
    expect(readHandoff({ ...h, form: { ...h.form, socName: 'X' } })).toBeNull();
    expect(readHandoff({ ...h, form: { ...h.form, widthMm: '<script>' } })).toBeNull();
    expect(readHandoff({ ...h, form: { ...h.form, coolingClass: 'liquid-nitrogen' } })).toBeNull();
    expect(readHandoff({ ...h, cameras: [{ ...h.cameras[0], type: 'x' }] })).toBeNull();
    expect(readHandoff({ ...h, cameras: Array(7).fill(h.cameras[0]) })).toBeNull();
    expect(readHandoff({ ...h, provenance: { widthMm: 'certain', evil: 'user' } })!.provenance).toEqual({});
  });
});

describe('Build a Phone saved builds and comparison', () => {
  const entry = (id: string) => ({ id, name: 'Build ' + id, savedAt: new Date(0).toISOString(), build: { design: studio, architecture: 'classic', selections: {}, uninstalled: [] as string[] } });
  it('parses defensively and keeps the newest first, capped', () => {
    expect(parseSaved(null)).toEqual([]); expect(parseSaved('not json')).toEqual([]); expect(parseSaved('{"a":1}')).toEqual([]);
    expect(parseSaved(JSON.stringify([entry('a'), { id: 'bad' }]))).toHaveLength(1);
    let list = [entry('a')];
    for (let i = 0; i < 25; i++) list = addSaved(list, entry(String(i)));
    expect(list).toHaveLength(MAX_SAVED); expect(list[0].id).toBe('24');
    expect(addSaved(list, entry('24')).filter(e => e.id === '24')).toHaveLength(1);
  });
  it('compares two builds figure by figure and marks the better value', () => {
    const a = resolveBuild(defaultBuild(studio)), b = resolveBuild(replaceComponent(defaultBuild({ ...studio, ...DEVICE_PRESETS.compact }), 'charging-ic', 'charger-30'));
    const rows = compareBuilds(a, b, checkBuild), row = (label: string) => rows.find(r => r.label === label)!;
    expect(row('Thickness')).toMatchObject({ a: '8.5 mm', b: '8 mm', better: 'b', confidence: 'user' });
    expect(row('Battery energy').better).toBe('a');
    expect(row('Wired charging')).toMatchObject({ a: '45 W', b: '30 W', better: 'a' });
    expect(row('Estimated mass').confidence).toBe('estimated');
    expect(rows.find(r => r.label === 'Processor')!.better).toBeUndefined();
  });
});
