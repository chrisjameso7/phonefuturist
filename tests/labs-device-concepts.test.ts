import { it, expect } from 'vitest';
import { CONCEPT_PRESETS, calculateDeviceConcept } from '../src/lib/labs/device-concepts';
it('runs both foldable styles and tablet/laptop concepts through the existing physical engine', () => {
    for (const family of Object.values(CONCEPT_PRESETS))
        for (const concept of family) {
            const output = calculateDeviceConcept(concept);
            expect(output.result.formFactor).toBe(concept.formFactor);
            expect(output.result.battery?.totalEnergyWh).toBeCloseTo(concept.energyWh);
            expect(output.activeDisplay.ppi).toBeGreaterThan(100);
            expect(output.result.warnings).toEqual([]);
            expect(output.runtimeHours).toBeGreaterThan(0);
        }
});
it('keeps inner and cover displays separate and uses the selected power draw', () => {
    const concept = CONCEPT_PRESETS.foldables[0], inner = calculateDeviceConcept(concept), cover = calculateDeviceConcept(concept, true);
    expect(cover.activeDisplay).toEqual(cover.result.displays.cover);
    expect(cover.activeDisplay.areaMm2).toBeLessThan(inner.activeDisplay.areaMm2!);
    expect(cover.runtimeHours).toBeGreaterThan(inner.runtimeHours);
    expect(cover.energyWh).toBe(inner.energyWh);
});
it('uses energy in Wh across device classes and rejects invalid scenarios', () => {
    const laptop = CONCEPT_PRESETS.laptops[0], before = calculateDeviceConcept(laptop), double = calculateDeviceConcept({ ...laptop, energyWh: laptop.energyWh * 2 });
    expect(double.runtimeHours).toBeCloseTo(before.runtimeHours * 2);
    expect(double.idealChargeMinutes).toBeCloseTo(before.idealChargeMinutes * 2);
    for (const patch of [{ energyWh: 0 }, { powerW: Infinity }, { chargeEfficiency: NaN }, { usablePercent: 101 }, { diagonal: 31 }])
        expect(() => calculateDeviceConcept({ ...laptop, ...patch })).toThrow();
    expect(() => calculateDeviceConcept({ ...CONCEPT_PRESETS.foldables[0], coverPowerW: 0 }, true)).toThrow();
});
