import { BOM_GROUPS, type BomDevice } from './bom-catalog';
export { BOM_GROUPS, BOM_OPTION_COUNT } from './bom-catalog';
export const BOM_OPTIONS = Object.fromEntries(BOM_GROUPS.map(group => [group.id, group.options])) as Record<string, typeof BOM_GROUPS[number]['options']>;
export type BomInput = {
    sensor: string;
    display: string;
    chassis: string;
    silicon: string;
    resolution: number;
    refresh: number;
    multiplier: number;
    retail: number;
    name?: string;
    device?: BomDevice;
    components?: Record<string, string>;
    quantities?: Record<string, number>;
};
export const DEFAULT_BOM: BomInput = {
    sensor: 'lyt900', display: 'm16', chassis: 'titanium', silicon: 'flagship',
    resolution: 1440, refresh: 120, multiplier: 2.5, retail: 1300, device: 'phone', name: '',
    components: { ram: '12-gb-lpddr5x', storage: '256-gb-ufs-4-0', board: '10-layer-hdi-pcb', battery: '5000-mah-li-ion', charging: '65-w-usb-pd', pmic: 'phone-pmic-set', cooling: 'large-vapor-chamber', glass: 'strengthened-flagship-glass', speakers: 'stereo-phone-speakers', haptics: 'x-axis-linear-actuator', wifi: 'wi-fi-6e-bluetooth-module', rf: '5g-sub-6-rf-front-end', assembly: 'phone-assembly' },
};
export function bomPreset(device: BomDevice): BomInput {
    if (device === 'phone')
        return structuredClone(DEFAULT_BOM);
    const components = { ...DEFAULT_BOM.components };
    let primary: Partial<BomInput>;
    if (device === 'foldable') {
        Object.assign(components, { hinge: 'book-teardrop-hinge', coverDisplay: '6-3-inch-cover-oled', battery: 'foldable-dual-cell-5000-mah', board: 'foldable-split-mainboard', glass: 'ultra-thin-foldable-glass', assembly: 'foldable-assembly' });
        primary = { display: '8-inch-folding-oled', chassis: 'foldable-reinforced-aluminum', retail: 1800 };
    }
    else if (device === 'tablet') {
        Object.assign(components, { battery: 'tablet-40-wh', board: 'tablet-logic-board', speakers: 'four-speaker-tablet-array', rf: 'wi-fi-antenna-set', assembly: 'tablet-assembly' });
        primary = { display: '11-inch-oled-tablet-panel', chassis: 'tablet-aluminum-unibody', sensor: 'imx890', retail: 1000 };
    }
    else {
        Object.assign(components, { ram: 'memory-included-in-processor-package', storage: '1-tb-nvme-gen-4', battery: 'laptop-70-wh', board: 'laptop-motherboard', keyboard: 'backlit-scissor-keyboard', touchpad: 'glass-precision-touchpad', hinge: 'laptop-friction-hinge-pair', frontCamera: '1080p-laptop-webcam', rf: 'wi-fi-antenna-set', wifi: 'laptop-wi-fi-7-card', assembly: 'laptop-assembly', cooling: 'laptop-heatpipe-and-fan', pmic: 'laptop-multiphase-power-stage', glass: 'laptop-cover-glass' });
        primary = { display: '14-inch-oled-laptop-panel', silicon: 'intel-core-ultra-7-258v-package', chassis: 'laptop-aluminum-unibody', sensor: 'none', retail: 1800, resolution: 1440 };
    }
    return { ...DEFAULT_BOM, ...primary, device, components, quantities: {} };
}
export function selectedBomId(input: BomInput, id: string) {
    return ['sensor', 'display', 'chassis', 'silicon'].includes(id) ? input[id as 'sensor' | 'display' | 'chassis' | 'silicon'] : input.components?.[id];
}
export function bomUnitPrice(input: Pick<BomInput, 'resolution' | 'refresh'>, group: string, cost: number) {
    const value = group === 'display' ? cost * (input.resolution / 1080) ** 0.35 * (1 + (input.refresh - 60) / 600) : cost;
    return Math.round(value * 100) / 100;
}
export function calculateBom(input: BomInput) {
    if (![1080, 1440, 2160].includes(input.resolution) || ![60, 90, 120, 144, 165, 240].includes(input.refresh) || !Number.isFinite(input.multiplier) || input.multiplier < 1 || input.multiplier > 5 || !Number.isFinite(input.retail) || input.retail < 1 || input.retail > 20000)
        throw new Error('Invalid pricing scenario.');
    const items: Array<{
        id: string;
        label: string;
        name: string;
        unitPrice: number;
        quantity: number;
        cost: number;
    }> = [];
    const ordered = ['sensor', 'display', 'chassis', 'silicon', ...BOM_GROUPS.map(g => g.id).filter(id => !['sensor', 'display', 'chassis', 'silicon'].includes(id))];
    for (const id of ordered) {
        const selected = selectedBomId(input, id);
        if (!selected)
            continue;
        const group = BOM_GROUPS.find(g => g.id === id)!;
        const option = group.options.find(o => o.id === selected);
        if (!option)
            throw new Error('Unknown component.');
        const unitPrice = option.cost;
        const quantity = input.quantities?.[id] ?? 1;
        if (!Number.isFinite(unitPrice) || unitPrice < 0 || unitPrice > 10000 || !Number.isInteger(quantity) || quantity < 0 || quantity > 8)
            throw new Error('Invalid component price or quantity.');
        // Preserve existing fixed panel scaling for each resolution and refresh configuration.
        const price = bomUnitPrice(input, id, unitPrice);
        if (quantity > 0)
            items.push({ id, label: group.label, name: option.name, unitPrice: price, quantity, cost: price * quantity });
    }
    const total = Math.round(items.reduce((sum, item) => sum + item.cost, 0) * 100) / 100, msrp = input.retail;
    return { items, total, msrp, grossProfit: input.retail - total, grossMargin: (input.retail - total) / input.retail * 100 };
}
