/** Curated SoC choices. Add future chips only after documenting credible public evidence. */
export const SOC_MODELS: Record<string, { released: string[]; preview: string[] }> = {
  Qualcomm: { released: ['Snapdragon 8 Elite Gen 6', 'Snapdragon 8 Elite Extreme Gen 6', 'Snapdragon 8 Elite Gen 5', 'Snapdragon 8 Elite', 'Snapdragon 8 Gen 5', 'Snapdragon 8 Gen 3', 'Snapdragon 8 Gen 2'], preview: [] },
  Samsung: { released: ['Exynos 2600', 'Exynos 2500', 'Exynos 2400', 'Exynos 2200'], preview: ['Exynos 2700'] },
  MediaTek: { released: ['Dimensity 9500', 'Dimensity 9400', 'Dimensity 9300', 'Dimensity 9200'], preview: ['Dimensity 9600', 'Dimensity 9600 Pro'] },
  Apple: { released: ['A20 Pro', 'A19 Pro', 'A19', 'A18 Pro', 'A18', 'A17 Pro'], preview: [] },
  Google: { released: ['Tensor G5', 'Tensor G4', 'Tensor G3'], preview: [] },
  Huawei: { released: ['Kirin 9030', 'Kirin 9020', 'Kirin 9010'], preview: [] },
  Unisoc: { released: [], preview: [] },
  other: { released: [], preview: [] },
};

/** Reject arbitrary future model strings; imported legacy names are not valid new selections. */
export function isSelectableSoc(vendor: string, model: string): boolean {
  if (!model) return true;
  const group = SOC_MODELS[vendor];
  return !!group && [...group.released, ...group.preview].includes(model);
}


/** A future chip with no device battery tests cannot borrow vendor efficiency gains. */
export function batterySocEvidenceContext(vendor?: string, model?: string) {
  const experimental = !!model && Object.values(SOC_MODELS).some(group => group.preview.includes(model));
  return {
    experimental,
    socVendor: experimental ? undefined : vendor,
    socName: experimental ? undefined : model,
  };
}

/**
 * Explicit sandbox power-draw assumptions relative to a neutral reference.
 * These are NOT measured chip efficiency rankings. Keep differences deliberately
 * modest until controlled measurements support stronger claims.
 */
export function projectedSocPowerFactor(model?: string): number {
  if (!model) return 1;
  const name = model.trim().toLowerCase();
  const overrides: Record<string, number> = {
    'exynos 2700': 1.02,
    'exynos 2600': 1.03,
    'exynos 2500': 1.05,
    'exynos 2400': 1.06,
    'snapdragon 8 elite gen 6': 0.98,
    'snapdragon 8 elite extreme gen 6': 1.01,
    'snapdragon 8 elite gen 5': 1,
    'snapdragon 8 elite': 1.02,
    'dimensity 9600': 0.99,
    'dimensity 9600 pro': 1.01,
    'dimensity 9500': 1,
  };
  return overrides[name] ?? 1;
}
