import { it, expect } from 'vitest';
import { BOM_GROUPS, BOM_BASE_OPTION_COUNT, BOM_ADDED_CONFIGURATION_COUNT, BOM_OPTION_COUNT } from '../src/lib/labs/bom-catalog';
import { DEFAULT_BOM, bomPreset, calculateBom } from '../src/lib/labs/bom';
it('offers over 1000 additional distinct priced configurations and broad camera coverage', () => {
    expect(BOM_BASE_OPTION_COUNT).toBeGreaterThan(300);
    expect(BOM_ADDED_CONFIGURATION_COUNT).toBeGreaterThanOrEqual(1000);
    expect(BOM_OPTION_COUNT).toBeGreaterThan(1300);
    for (const group of BOM_GROUPS) {
        expect(new Set(group.options.map(o => o.id)).size).toBe(group.options.length);
        expect(new Set(group.options.map(o => o.name)).size).toBe(group.options.length);
        expect(group.options.every(o => Number.isFinite(o.cost) && o.cost >= 0)).toBe(true);
    }
    expect(BOM_GROUPS.find(g => g.id === 'sensor')!.options.length).toBeGreaterThan(35);
    expect(BOM_GROUPS.find(g => g.id === 'telephoto')!.options.length).toBeGreaterThan(90);
});
it('supports all catalog choices and keeps each fixed catalog cost authoritative', () => {
    for (const group of BOM_GROUPS)
        for (const option of group.options) {
            const input = ['sensor', 'display', 'chassis', 'silicon'].includes(group.id) ? { ...DEFAULT_BOM, [group.id]: option.id } : { ...DEFAULT_BOM, components: { ...DEFAULT_BOM.components, [group.id]: option.id } };
            const result = calculateBom(input);
            expect(Number.isFinite(result.total)).toBe(true);
        }
    const tampered = { ...DEFAULT_BOM, unitPrices: { 'silicon:flagship': 0 } };
    expect(calculateBom(tampered)).toEqual(calculateBom(DEFAULT_BOM));
});
it('prices the requested processors and applies quantities without replacing other selections', () => {
    const chips = BOM_GROUPS.find(g => g.id === 'silicon')!.options;
    expect(chips.find(o => o.name === 'Exynos 2700')?.cost).toBe(260);
    expect(chips.find(o => o.name === 'Snapdragon 8 Elite Extreme Gen 6')?.cost).toBe(300);
    expect(chips.find(o => o.name === 'Snapdragon 8 Elite Gen 6')?.cost).toBe(250);
    const before = calculateBom(DEFAULT_BOM), after = calculateBom({ ...DEFAULT_BOM, quantities: { sensor: 2 } });
    expect(after.total - before.total).toBeCloseTo(48);
    expect(after.items.find(i => i.id === 'silicon')).toEqual(before.items.find(i => i.id === 'silicon'));
    expect(() => calculateBom({ ...DEFAULT_BOM, quantities: { sensor: -1 } })).toThrow();
});
it('has valid independent phone, foldable, tablet and laptop builds', () => {
    for (const family of ['phone', 'foldable', 'tablet', 'laptop'] as const) {
        const input = bomPreset(family), result = calculateBom(input);
        expect(result.total).toBeGreaterThan(0);
        expect(input.device).toBe(family);
    }
    const first = bomPreset('phone'), second = bomPreset('phone');
    first.components!.ram = 'changed';
    expect(second.components!.ram).not.toBe('changed');
});
