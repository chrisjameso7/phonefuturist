export const WALLPAPERS = { none:'Screen off', aurora:'Aurora', dusk:'Sunset dunes', ocean:'Ocean waves', graphite:'Graphite folds' } as const;
export type Wallpaper = keyof typeof WALLPAPERS;
