export const FRAME_FINISHES = {
  plastic: { label: 'Matte plastic', metalness: 0, roughness: .72 },
  steel: { label: 'Polished stainless steel', metalness: 1, roughness: .09 },
  matteAluminium: { label: 'Matte aluminium', metalness: .85, roughness: .55 },
  glossyAluminium: { label: 'Glossy aluminium', metalness: .95, roughness: .16 },
  brushedTitanium: { label: 'Brushed titanium', metalness: .9, roughness: .32 },
  glossyTitanium: { label: 'Gloss titanium', metalness: .9, roughness: .14 },
} as const;
export const BACK_FINISHES = {
  frostedGlass: { label: 'Frosted glass', metalness: 0, roughness: .76, clearcoat: .1 },
  frostedPlastic: { label: 'Frosted plastic', metalness: 0, roughness: .88, clearcoat: 0 },
  glossyGlass: { label: 'Glossy glass', metalness: 0, roughness: .12, clearcoat: 1 },
  ceramic: { label: 'Matte ceramic', metalness: 0, roughness: .78, clearcoat: .08 },
  titanium: { label: 'Brushed titanium', metalness: .9, roughness: .3, clearcoat: .1 },
  steel: { label: 'Polished steel', metalness: 1, roughness: .09, clearcoat: .35 },
} as const;
export const FRONT_FINISHES = {
  antiReflective: { label: 'Anti-reflective glass', roughness: .32, clearcoat: .08 },
  nanoTexture: { label: 'Nano-texture glass', roughness: .68, clearcoat: 0 },
  glossy: { label: 'Glossy cover glass', roughness: .08, clearcoat: 1 },
} as const;
export type FrameFinish = keyof typeof FRAME_FINISHES;
export type BackFinish = keyof typeof BACK_FINISHES;
export type FrontFinish = keyof typeof FRONT_FINISHES;
