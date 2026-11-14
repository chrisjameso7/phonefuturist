import type { Subsystem } from './schema';

export type BuildViewMode = 'assembled' | 'exploded' | 'xray' | 'inspect';
export type BuildView = { mode: BuildViewMode; subsystem: Subsystem | 'all'; xrayDepth: 1 | 2; selected: string | null };
