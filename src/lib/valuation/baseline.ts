import type { DeviceParameters, Valuation, CostLine } from './types';
export const cents = (n: number) => Math.round(n * 100) / 100;
// Editorial planning scenarios, NOT foundry quotations or licensed teardown data.
// Keep economic assumptions server-side; see docs/ai-hardware-valuation.md.
const waferScenarios = [{ node: 2, usd: 28000, yield: .65 }, { node: 3, usd: 20000, yield: .78 }, { node: 4, usd: 16000, yield: .85 }, { node: 5, usd: 14000, yield: .88 }, { node: 7, usd: 9000, yield: .9 }, { node: 14, usd: 5000, yield: .94 }];
export function baselineValuation(p: DeviceParameters): Valuation {
    const lo = [...waferScenarios].reverse().find(s => s.node <= p.soc.nodeNm) ?? waferScenarios[0];
    const hi = waferScenarios.find(s => s.node >= p.soc.nodeNm) ?? waferScenarios.at(-1)!;
    const mix = hi.node === lo.node ? 0 : (p.soc.nodeNm - lo.node) / (hi.node - lo.node);
    const wafer = lo.usd + (hi.usd - lo.usd) * mix, yieldFraction = lo.yield + (hi.yield - lo.yield) * mix;
    // 300mm wafer usable area with edge-loss allowance; package/test and supplier margin separate.
    const grossDies = Math.PI * 150 ** 2 / p.soc.dieAreaMm2 - Math.PI * 300 / Math.sqrt(2 * p.soc.dieAreaMm2);
    const silicon = wafer / (grossDies * yieldFraction);
    const packaging = p.soc.packaging === 'advanced' ? 28 : 12;
    const ramPrice = { LPDDR4X: 2.25, LPDDR5: 2.7, LPDDR5X: 3, DDR5: 2.4 }[p.ram.type];
    const storagePrice = { eMMC: .075, UFS: .11, NVMe: .065 }[p.storage.type];
    const displayBase = { LCD: 22, OLED: 55, LTPO: 70, tandem: 105 }[p.display.panel];
    const components: CostLine[] = [
        { id: 'soc', label: 'Processor package', costUsd: (silicon + packaging) * 2.1 },
        { id: 'ram', label: 'Memory', costUsd: p.ram.capacityGb * ramPrice },
        { id: 'storage', label: 'Storage', costUsd: p.storage.capacityGb * storagePrice },
        { id: 'display', label: 'Display assembly', costUsd: displayBase * (p.display.diagonalInches / 6.7) ** 1.6 * (p.display.widthPx * p.display.heightPx / (1440 * 3200)) ** .15 * (1 + (p.display.refreshHz - 120) / 900) },
        ...p.cameras.map((c, i) => ({ id: 'camera_' + i, label: 'Camera ' + (i + 1), costUsd: 5 + 30 * (c.sensorAreaMm2 / 72) ** .7 * (c.megapixels / 50) ** .1 + (c.periscope ? 22 : 0) })),
        { id: 'chassis', label: 'Chassis', costUsd: { plastic: 12, aluminum: 21, titanium: 42, ceramic: 34, steel: 30 }[p.chassis] * (p.display.diagonalInches / 6.7) ** 1.3 },
        // A complete handset needs the remaining subsystems. This package is explicitly scoped.
        { id: 'rf_power_board', label: 'Radio, mainboard & power electronics', costUsd: 78 },
        { id: 'battery_audio_misc', label: 'Battery, audio, sensors & accessories', costUsd: 44 },
    ].map(row => ({ ...row, costUsd: cents(row.costUsd) }));
    const subtotal = cents(components.reduce((sum, row) => sum + row.costUsd, 0));
    return finalize(components, cents(subtotal * .055 + 8), p.retailMultiplier, p.unreleased ? .35 : .5);
}
export function finalize(components: CostLine[], overhead: number, multiplier: number, confidence: number, summary?: string): Valuation {
    const total = cents(components.reduce((s, c) => s + c.costUsd, 0) + overhead);
    const drivers = [...components].sort((a, b) => b.costUsd - a.costUsd).slice(0, 3).map(c => c.label.toLowerCase());
    return { currency: 'USD', designation: 'Estimated BOM', components, manufacturingOverheadUsd: cents(overhead), totalBomUsd: total, retailMarkupMultiplier: multiplier, suggestedRetailUsd: Math.ceil(total * multiplier / 10) * 10, confidenceScore: confidence, summary: summary ?? 'The main cost drivers are ' + drivers.join(', ') + '. Display specification, memory capacity and processor packaging shape the component balance.' };
}
