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
