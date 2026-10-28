import { simulateDevice } from '../simulation/engine';
import type { DeviceFormFactor, SimulationInput } from '../simulation/types';
export type ConceptFamily = 'foldables' | 'tablets' | 'laptops';
export type DeviceConcept = {
    name: string;
    formFactor: Extract<DeviceFormFactor, 'book_foldable' | 'flip_foldable' | 'tablet' | 'laptop'>;
    width: number;
    height: number;
    thickness: number;
    weight: number;
    diagonal: number;
    pixelWidth: number;
    pixelHeight: number;
    refresh: number;
    coverDiagonal: number;
    coverWidth: number;
    coverHeight: number;
    energyWh: number;
    usablePercent: number;
    powerW: number;
    coverPowerW: number;
    chargeW: number;
    chargeEfficiency: number;
};
export const CONCEPT_PRESETS: Record<ConceptFamily, DeviceConcept[]> = {
    foldables: [
        { name: 'Book foldable concept', formFactor: 'book_foldable', width: 145, height: 158, thickness: 5, weight: 230, diagonal: 8, pixelWidth: 2200, pixelHeight: 2480, refresh: 120, coverDiagonal: 6.3, coverWidth: 1080, coverHeight: 2520, energyWh: 20, usablePercent: 95, powerW: 5, coverPowerW: 3, chargeW: 65, chargeEfficiency: 85 },
        { name: 'Flip foldable concept', formFactor: 'flip_foldable', width: 72, height: 166, thickness: 7, weight: 190, diagonal: 6.9, pixelWidth: 1080, pixelHeight: 2640, refresh: 120, coverDiagonal: 4, coverWidth: 1080, coverHeight: 1200, energyWh: 17, usablePercent: 95, powerW: 4, coverPowerW: 1.5, chargeW: 45, chargeEfficiency: 85 },
    ],
    tablets: [
        { name: '11-inch tablet concept', formFactor: 'tablet', width: 178, height: 250, thickness: 6, weight: 470, diagonal: 11, pixelWidth: 1600, pixelHeight: 2560, refresh: 120, coverDiagonal: 0, coverWidth: 0, coverHeight: 0, energyWh: 32, usablePercent: 95, powerW: 5, coverPowerW: 0, chargeW: 45, chargeEfficiency: 85 },
        { name: '13-inch tablet concept', formFactor: 'tablet', width: 215, height: 281, thickness: 6, weight: 620, diagonal: 13, pixelWidth: 2064, pixelHeight: 2752, refresh: 120, coverDiagonal: 0, coverWidth: 0, coverHeight: 0, energyWh: 40, usablePercent: 95, powerW: 7, coverPowerW: 0, chargeW: 65, chargeEfficiency: 85 },
    ],
    laptops: [
        { name: '14-inch laptop concept', formFactor: 'laptop', width: 313, height: 221, thickness: 15, weight: 1400, diagonal: 14, pixelWidth: 2880, pixelHeight: 1800, refresh: 120, coverDiagonal: 0, coverWidth: 0, coverHeight: 0, energyWh: 70, usablePercent: 95, powerW: 12, coverPowerW: 0, chargeW: 100, chargeEfficiency: 90 },
        { name: '16-inch performance concept', formFactor: 'laptop', width: 356, height: 250, thickness: 22, weight: 2200, diagonal: 16, pixelWidth: 3200, pixelHeight: 2000, refresh: 165, coverDiagonal: 0, coverWidth: 0, coverHeight: 0, energyWh: 90, usablePercent: 95, powerW: 35, coverPowerW: 0, chargeW: 140, chargeEfficiency: 90 },
    ],
};
export function calculateDeviceConcept(concept: DeviceConcept, cover = false) {
    if (!['book_foldable', 'flip_foldable', 'tablet', 'laptop'].includes(concept.formFactor))
        throw new Error('Unsupported device family.');
    if (!Number.isFinite(concept.usablePercent) || !Number.isFinite(concept.chargeEfficiency))
        throw new Error('Enter valid charge percentages.');
    for (const key of ['width', 'height', 'thickness', 'weight', 'diagonal', 'pixelWidth', 'pixelHeight', 'refresh', 'energyWh', 'powerW', 'chargeW'] as const)
        if (!Number.isFinite(concept[key]) || concept[key] <= 0)
            throw new Error('Use positive device specifications.');
    if (concept.energyWh > 300 || concept.powerW > 300 || concept.chargeW > 400 || concept.diagonal > 30 || concept.width > 600 || concept.height > 600 || concept.usablePercent < 1 || concept.usablePercent > 100 || concept.chargeEfficiency < 1 || concept.chargeEfficiency > 100)
        throw new Error('Specifications exceed this workspace’s supported range.');
    const foldable = concept.formFactor === 'book_foldable' || concept.formFactor === 'flip_foldable';
    if (foldable && (!Number.isFinite(concept.coverDiagonal) || concept.coverDiagonal <= 0 || !Number.isFinite(concept.coverWidth) || concept.coverWidth <= 0 || !Number.isFinite(concept.coverHeight) || concept.coverHeight <= 0 || !Number.isFinite(concept.coverPowerW) || concept.coverPowerW <= 0))
        throw new Error('Enter valid cover display specifications.');
    const primary = { diagonalInches: concept.diagonal, resolutionWidthPx: concept.pixelWidth, resolutionHeightPx: concept.pixelHeight, aspectWidth: concept.pixelWidth, aspectHeight: concept.pixelHeight, refreshRateHz: concept.refresh };
    const input: SimulationInput = { name: concept.name, formFactor: concept.formFactor, dimensions: { widthMm: concept.width, heightMm: concept.height, thicknessMm: concept.thickness, weightG: concept.weight }, displays: { primary, ...(foldable ? { cover: { diagonalInches: concept.coverDiagonal, resolutionWidthPx: concept.coverWidth, resolutionHeightPx: concept.coverHeight, aspectWidth: concept.coverWidth, aspectHeight: concept.coverHeight } } : {}) }, battery: { cells: [{ capacityMah: concept.energyWh / 3.85 * 1000, nominalVoltageV: 3.85 }] } };
    const result = simulateDevice(input), activeDisplay = cover && foldable ? result.displays.cover! : result.displays.primary;
    const draw = cover && foldable ? concept.coverPowerW : concept.powerW;
    // Scenario energy balance only. No phone benchmark, battery cohort or thermal
    // calibration is borrowed for a larger form factor.
    const runtimeHours = concept.energyWh * concept.usablePercent / 100 / draw;
    const idealChargeMinutes = concept.energyWh / (concept.chargeW * concept.chargeEfficiency / 100) * 60;
    return { result, activeDisplay, runtimeHours, idealChargeMinutes, powerW: draw, energyWh: concept.energyWh };
}
