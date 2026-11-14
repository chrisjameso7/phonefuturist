import type { DeviceParameters } from './types';
export function object(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new Error('Expected an object.');
    return value as Record<string, unknown>;
}
export function number(value: unknown, min: number, max: number, integer = false): number {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value)))
        throw new Error('Enter a number between ' + min + ' and ' + max + '.');
    return value;
}
function choice<T extends string>(value: unknown, values: readonly T[]): T {
    if (typeof value !== 'string' || !values.includes(value as T))
        throw new Error('Choose a supported specification.');
    return value as T;
}
function boolean(value: unknown): boolean { if (typeof value !== 'boolean')
    throw new Error('Expected true or false.'); return value; }
export function deviceParameters(value: unknown): DeviceParameters {
    const p = object(value), soc = object(p.soc), ram = object(p.ram), storage = object(p.storage), display = object(p.display);
    if (!Array.isArray(p.cameras) || p.cameras.length > 8)
        throw new Error('Use up to eight camera modules.');
    return {
        soc: { nodeNm: number(soc.nodeNm, 2, 14), foundry: choice(soc.foundry, ['tsmc', 'samsung', 'other']), dieAreaMm2: number(soc.dieAreaMm2, 20, 800), packaging: choice(soc.packaging, ['standard', 'advanced']) },
        ram: { type: choice(ram.type, ['LPDDR4X', 'LPDDR5', 'LPDDR5X', 'DDR5']), capacityGb: number(ram.capacityGb, 0, 256) },
        storage: { type: choice(storage.type, ['eMMC', 'UFS', 'NVMe']), capacityGb: number(storage.capacityGb, 0, 16384) },
        display: { panel: choice(display.panel, ['LCD', 'OLED', 'LTPO', 'tandem']), diagonalInches: number(display.diagonalInches, 3, 24), widthPx: number(display.widthPx, 320, 10000, true), heightPx: number(display.heightPx, 320, 10000, true), refreshHz: number(display.refreshHz, 30, 480) },
        cameras: p.cameras.map(raw => { const c = object(raw); return { sensorAreaMm2: number(c.sensorAreaMm2, 1, 150), megapixels: number(c.megapixels, 1, 300), periscope: boolean(c.periscope) }; }),
        chassis: choice(p.chassis, ['plastic', 'aluminum', 'titanium', 'ceramic', 'steel']), retailMultiplier: number(p.retailMultiplier, 1, 5), unreleased: boolean(p.unreleased),
    };
}
