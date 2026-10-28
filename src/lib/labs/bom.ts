// Illustrative procurement assumptions in USD, not supplier quotations.
export const BOM_OPTIONS = {
    sensor: [{ id: 'lyt900', name: 'Sony LYT-900', cost: 48 }, { id: 'hp2', name: 'ISOCELL HP2', cost: 38 }, { id: 'imx890', name: 'Sony IMX890', cost: 23 }],
    display: [{ id: 'm16', name: 'M16 OLED', cost: 83 }, { id: 'm14', name: 'M14 OLED', cost: 65 }, { id: 'ltpo', name: 'Standard LTPO', cost: 49 }],
    chassis: [{ id: 'titanium', name: 'Titanium Grade 5', cost: 42 }, { id: 'aluminum', name: 'Aerospace aluminum', cost: 21 }, { id: 'ceramic', name: 'Ceramic', cost: 34 }, { id: 'glass', name: 'Glass / plastic', cost: 12 }],
    silicon: [{ id: 'flagship', name: 'Flagship 3nm', cost: 170 }, { id: 'sub', name: 'Sub-flagship', cost: 95 }, { id: 'custom', name: 'Custom silicon', cost: 200 }],
} as const;
export type BomInput = {
    sensor: string;
    display: string;
    chassis: string;
    silicon: string;
    resolution: number;
    refresh: number;
    multiplier: number;
    retail: number;
};
export const DEFAULT_BOM: BomInput = { sensor: 'lyt900', display: 'm16', chassis: 'titanium', silicon: 'flagship', resolution: 1440, refresh: 120, multiplier: 2.5, retail: 1300 };
export function calculateBom(input: BomInput) {
    const cost = (kind: keyof typeof BOM_OPTIONS, id: string) => { const item = BOM_OPTIONS[kind].find(item => item.id === id); if (!item)
        throw new Error('Unknown component.'); return item.cost; };
    if (![1080, 1440, 2160].includes(input.resolution) || ![60, 90, 120, 144].includes(input.refresh) || !Number.isFinite(input.multiplier) || input.multiplier < 1 || input.multiplier > 5 || !Number.isFinite(input.retail) || input.retail < 1 || input.retail > 10000)
        throw new Error('Invalid pricing scenario.');
    const panel = cost('display', input.display) * (input.resolution / 1080) ** 0.35 * (1 + (input.refresh - 60) / 600);
    const items = [{ label: 'Main sensor', cost: cost('sensor', input.sensor) }, { label: 'Display', cost: panel }, { label: 'Chassis', cost: cost('chassis', input.chassis) }, { label: 'Silicon', cost: cost('silicon', input.silicon) }, { label: 'Other components & assembly', cost: 135 }];
    const total = items.reduce((sum, item) => sum + item.cost, 0), msrp = Math.ceil(total * input.multiplier / 10) * 10;
    return { items, total, msrp, grossProfit: input.retail - total, grossMargin: (input.retail - total) / input.retail * 100 };
}
