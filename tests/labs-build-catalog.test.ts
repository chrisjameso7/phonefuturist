import { describe, expect, it } from 'vitest';
import { BOM_GROUPS } from '../src/lib/labs/bom-catalog';
import { ARCHITECTURES, SLOTS } from '../src/lib/labs/build/architectures';
import { COMPONENT_LIST, COMPONENTS } from '../src/lib/labs/build/catalog';
import { ASSEMBLY_STEPS, CONFIDENCE_LABELS, SUBSYSTEMS, weakestConfidence } from '../src/lib/labs/build/schema';
import { SOURCES } from '../src/lib/labs/build/sources';

describe('Build a Phone component catalogue integrity', () => {
  it('gives every component a unique id, an identity, a description and a known subsystem', () => {
    expect(new Set(COMPONENT_LIST.map(c => c.id)).size).toBe(COMPONENT_LIST.length);
    for (const c of COMPONENT_LIST) {
      expect(c.name.length).toBeGreaterThan(3);
      expect(c.description.length).toBeGreaterThan(40);
      expect(Object.hasOwn(SUBSYSTEMS, c.subsystem)).toBe(true);
      expect(c.materials.length).toBeGreaterThan(0);
      expect(c.interfaces.length).toBeGreaterThan(0);
      expect(c.dimensions.every(n => Number.isFinite(n) && n >= 0)).toBe(true);
      expect(c.weightG).toBeGreaterThanOrEqual(0);
    }
  });
  it('covers all ten subsystems and every assembly step', () => {
    for (const subsystem of Object.keys(SUBSYSTEMS)) expect(COMPONENT_LIST.some(c => c.subsystem === subsystem)).toBe(true);
    for (let step = 1; step <= ASSEMBLY_STEPS.length; step++) expect(SLOTS.some(s => s.step === step)).toBe(true);
  });
  it('never presents a representative part as a named product', () => {
    for (const c of COMPONENT_LIST) {
      expect(c.representative).toBe(c.manufacturer === null);
      if (c.representative) { expect(c.model).toBeNull(); expect(c.sources).toContain('pf-representative'); }
      else expect(c.sources.some(id => SOURCES[id].kind === 'teardown' || SOURCES[id].kind === 'standard')).toBe(true);
    }
    // No teardown references exist yet, so no part may claim Level 3 fidelity or measured data.
    expect(COMPONENT_LIST.every(c => c.asset.level < 3)).toBe(true);
    expect(COMPONENT_LIST.flatMap(c => c.specs).every(s => s.confidence !== 'measured')).toBe(true);
  });
  it('cites a registered source and a valid confidence class for every value', () => {
    for (const c of COMPONENT_LIST) {
      for (const id of c.sources) expect(SOURCES[id]).toBeTruthy();
      expect(SOURCES[c.dimensionBasis.source]).toBeTruthy();
      for (const spec of c.specs) { expect(SOURCES[spec.source]).toBeTruthy(); expect(Object.hasOwn(CONFIDENCE_LABELS, spec.confidence)).toBe(true); }
      if (c.electrical) expect(SOURCES[c.electrical.source]).toBeTruthy();
    }
    // A documented value must cite a standard, a physical principle or the definition of the part itself.
    for (const spec of COMPONENT_LIST.flatMap(c => c.specs).filter(s => s.confidence === 'documented' && s.source !== 'pf-representative'))
      expect(['standard', 'principle']).toContain(SOURCES[spec.source].kind);
    expect(weakestConfidence('documented', 'estimated', 'user')).toBe('estimated');
  });
  it('keeps every cost link pointing at an existing BOM estimate', () => {
    const linked = COMPONENT_LIST.filter(c => c.bom);
    expect(linked.length).toBeGreaterThan(60);
    for (const c of linked) expect(BOM_GROUPS.find(g => g.id === c.bom!.group)?.options.some(o => o.id === c.bom!.option)).toBe(true);
  });
  it('defines consistent slots, connections and architectures', () => {
    expect(new Set(SLOTS.map(s => s.id)).size).toBe(SLOTS.length);
    const ids = new Set(SLOTS.map(s => s.id)), kinds = new Set(SLOTS.map(s => s.kind));
    for (const slot of SLOTS) {
      expect(slot.options.length).toBeGreaterThan(0);
      for (const option of slot.options) expect(COMPONENTS[option].kind).toBe(slot.kind);
      if (slot.initial) expect(slot.options).toContain(slot.initial);
      if (slot.required) expect(slot.initial).not.toBeNull();
      for (const c of slot.connections) { expect(ids.has(c.to)).toBe(true); if (c.via) expect(ids.has(c.via)).toBe(true); expect(c.description.length).toBeGreaterThan(8); }
    }
    for (const c of COMPONENT_LIST) { expect(kinds.has(c.kind)).toBe(true); for (const need of c.requires) expect(kinds.has(need)).toBe(true); }
    for (const arch of Object.values(ARCHITECTURES)) for (const [slot, component] of Object.entries(arch.defaults)) {
      expect(ids.has(slot)).toBe(true);
      if (component) expect(SLOTS.find(s => s.id === slot)!.options).toContain(component);
    }
  });
  it('supports several components of the same type', () => {
    expect(SLOTS.filter(s => s.kind === 'microphone').length).toBe(3);
    expect(SLOTS.filter(s => s.kind === 'camera-tele').length).toBe(2);
    expect(SLOTS.filter(s => s.kind === 'shield').length).toBe(2);
    expect(SLOTS.filter(s => s.kind.startsWith('antenna')).length).toBeGreaterThanOrEqual(6);
  });
  it('keeps battery figures internally consistent with typical cell ranges', () => {
    for (const cell of COMPONENT_LIST.filter(c => c.kind === 'battery')) {
      const [w, h, d] = cell.dimensions, density = Number(cell.traits.energyWh) / (w * h * d / 1e6);
      expect(density).toBeGreaterThan(550); expect(density).toBeLessThan(830);
      expect(Number(cell.traits.energyWh)).toBeCloseTo(Number(cell.traits.capacityMah) * 3.87 / 1000, 1);
    }
  });
});
