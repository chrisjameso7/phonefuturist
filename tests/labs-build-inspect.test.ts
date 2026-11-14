import { describe, expect, it } from 'vitest';
import { assembleAll, canLeaveEmpty, defaultBuild, emptyChassis, inSentence, inspectPart, installNextStep, installPartChecked, removePart, replaceComponent, resolveBuild, stepSummaries, SOURCES } from '../src/lib/labs/build';
import { DEFAULT_DESIGN, type DeviceDesign } from '../src/lib/labs/device-design';

const studio: DeviceDesign = { ...DEFAULT_DESIGN, family: 'plateau', cameraWidth: 68, cameraHeight: 44, frameFinish: 'brushedTitanium', backFinish: 'glossyGlass', frontFinish: 'antiReflective' };
const base = () => resolveBuild(defaultBuild(studio));

describe('Build a Phone inspector', () => {
  it('gives every installed part an identity, description, position, connections and sourced figures', () => {
    const assembly = base();
    for (const part of assembly.parts) {
      const info = inspectPart(assembly, part.slot.id)!;
      expect(info.name.length).toBeGreaterThan(3); expect(info.description.length).toBeGreaterThan(40);
      expect(info.position.length).toBeGreaterThan(10); expect(info.location.length).toBeGreaterThan(5);
      expect(info.step).toMatch(/^Step \d+ · /);
      expect(info.connections.length).toBeGreaterThan(0);
      expect(info.figures.length).toBeGreaterThanOrEqual(2);
      for (const f of info.figures) { expect(SOURCES[f.source]).toBeTruthy(); expect(f.value).not.toMatch(/NaN|undefined/); }
      if (part.component.representative) { expect(info.representative).toBe(true); expect(info.manufacturer).toContain('generic'); }
      expect(info.sources.some(s => s.title.includes('representative internal layout'))).toBe(true);
    }
  });
  it('never labels an estimate as documented', () => {
    const info = inspectPart(base(), 'soc')!;
    expect(info.figures.find(f => f.label.startsWith('Sustained heat'))!.confidence).toBe('estimated');
    expect(info.figures.find(f => f.label === 'Planning cost')!.confidence).toBe('estimated');
    const port = inspectPart(base(), 'usb-port')!;
    expect(port.figures.find(f => f.label === 'Receptacle opening')).toMatchObject({ confidence: 'documented', source: 'usb-c-spec' });
    expect(inspectPart(base(), 'frame')!.figures[0].confidence).toBe('user');
  });
  it('resolves connections in both directions and names the carrier', () => {
    const soc = inspectPart(base(), 'soc')!;
    const display = soc.connections.find(c => c.slotId === 'panel')!;
    expect(display.interface).toBe('MIPI DSI'); expect(display.via).toBe('Display flex cable');
    expect(inspectPart(base(), 'ram')!.connections.some(c => c.slotId === 'soc')).toBe(true);
    expect(inspectPart(base(), 'pmic')!.connections.some(c => c.slotId === 'soc')).toBe(true);
  });
  it('lists alternatives with a concrete difference and supports multiples of a part', () => {
    const cell = inspectPart(base(), 'battery')!;
    expect(cell.alternatives.length).toBeGreaterThan(5);
    expect(cell.alternatives.find(a => a.id === 'cell-7000-sic')!.difference).toMatch(/Wh/);
    const capacitors = inspectPart(base(), 'passive-capacitors')!;
    expect(capacitors.figures[0].value).toMatch(/^\d+ shown, 1 × 0\.5 × 0\.5 mm each$/);
    expect(capacitors.position).toMatch(/logic board/);
  });
  it('keeps acronyms when names are used mid-sentence', () => {
    expect(inSentence('Processor shield can')).toBe('processor shield can');
    expect(inSentence('NFC antenna loop')).toBe('NFC antenna loop');
    expect(inSentence('12 GB LPDDR5X memory')).toBe('12 GB LPDDR5X memory');
    expect(inSentence('USB-C port')).toBe('USB-C port');
  });
});

describe('Build a Phone assembly actions', () => {
  it('removes a part with what is mounted on it and explains access', () => {
    const result = removePart(base(), 'soc');
    expect(result.ok).toBe(true);
    expect(result.build.uninstalled).toContain('soc'); expect(result.build.uninstalled).toContain('ram');
    expect(result.message).toContain('processor shield can');
    expect(result.message).toContain('12 GB LPDDR5X memory');
    const board = removePart(base(), 'pcb');
    expect(board.build.uninstalled.length).toBeGreaterThan(20);
    expect(board.message).toMatch(/\d+ parts mounted on it came out too/);
  });
  it('keeps the structure in place and refuses to install a part before its mount', () => {
    expect(removePart(base(), 'frame').ok).toBe(false);
    const noSoc = resolveBuild(removePart(base(), 'soc').build);
    const ram = installPartChecked(noSoc, 'ram');
    expect(ram.ok).toBe(false); expect(ram.message).toContain('application processor');
    const soc = resolveBuild(installPartChecked(noSoc, 'soc').build);
    expect(installPartChecked(soc, 'ram').ok).toBe(true);
  });
  it('strips to the frame and builds back up step by step in order', () => {
    let assembly = resolveBuild(emptyChassis(base()).build);
    expect(stepSummaries(assembly).filter(s => s.complete).map(s => s.step)).toEqual([1]);
    const order: number[] = [];
    for (let i = 0; i < 20; i++) { const r = installNextStep(assembly); if (!r.ok) break; order.push(r.step!); assembly = resolveBuild(r.build); }
    expect(order).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(assembly.totals.installedCount).toBe(assembly.totals.partCount);
    expect(installNextStep(assembly).ok).toBe(false);
    expect(resolveBuild(assembleAll(resolveBuild(emptyChassis(base()).build)).build).totals.installedCount).toBe(assembly.totals.partCount);
  });
  it('only offers to leave optional, non-structural positions empty', () => {
    expect(canLeaveEmpty('wireless-coil')).toBe(true);
    expect(canLeaveEmpty('battery')).toBe(false);
    expect(canLeaveEmpty('rear-cover')).toBe(false);
    const empty = resolveBuild(replaceComponent(defaultBuild(studio), 'wireless-coil', null));
    expect(empty.empty.map(s => s.id)).toContain('wireless-coil');
  });
});
