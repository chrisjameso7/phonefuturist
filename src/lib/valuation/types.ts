export type DeviceParameters = {
    soc: {
        nodeNm: number;
        foundry: 'tsmc' | 'samsung' | 'other';
        dieAreaMm2: number;
        packaging: 'standard' | 'advanced';
    };
    ram: {
        type: 'LPDDR4X' | 'LPDDR5' | 'LPDDR5X' | 'DDR5';
        capacityGb: number;
    };
    storage: {
        type: 'eMMC' | 'UFS' | 'NVMe';
        capacityGb: number;
    };
    display: {
        panel: 'LCD' | 'OLED' | 'LTPO' | 'tandem';
        diagonalInches: number;
        widthPx: number;
        heightPx: number;
        refreshHz: number;
    };
    cameras: Array<{
        sensorAreaMm2: number;
        megapixels: number;
        periscope: boolean;
    }>;
    chassis: 'plastic' | 'aluminum' | 'titanium' | 'ceramic' | 'steel';
    retailMultiplier: number;
    unreleased: boolean;
};
export type CostLine = {
    id: string;
    label: string;
    costUsd: number;
};
export type Valuation = {
    currency: 'USD';
    designation: 'Estimated BOM';
    components: CostLine[];
    manufacturingOverheadUsd: number;
    totalBomUsd: number;
    retailMarkupMultiplier: number;
    suggestedRetailUsd: number;
    confidenceScore: number;
    summary: string;
};
export type ValuationResponse = {
    valuation: Valuation;
    method: 'ai' | 'baseline';
    notice?: string;
};
export const DEFAULT_PARAMETERS: DeviceParameters = {
    soc: { nodeNm: 3, foundry: 'tsmc', dieAreaMm2: 120, packaging: 'standard' },
    ram: { type: 'LPDDR5X', capacityGb: 12 }, storage: { type: 'UFS', capacityGb: 256 },
    display: { panel: 'LTPO', diagonalInches: 6.7, widthPx: 1440, heightPx: 3200, refreshHz: 120 },
    cameras: [{ sensorAreaMm2: 72, megapixels: 50, periscope: false }], chassis: 'titanium',
    retailMultiplier: 2.5, unreleased: true,
};
