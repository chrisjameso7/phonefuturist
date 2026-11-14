import type { BuildView, BuildViewMode } from './view-types';
import { SUBSYSTEMS, type Subsystem } from './schema';

export type { BuildView, BuildViewMode };
export const DEFAULT_VIEW: BuildView = { mode: 'assembled', subsystem: 'all', xrayDepth: 1, selected: null };

export const VIEW_MODES: Record<BuildViewMode, { label: string; description: string }> = {
  assembled: { label: 'Assembled', description: 'The finished phone. Rotate it to inspect the frame, buttons, ports and camera housing.' },
  exploded: { label: 'Exploded', description: 'Layers separate along the direction they are installed in. Choose a subsystem to separate only its parts.' },
  xray: { label: 'X-ray', description: 'The shell turns translucent while internal parts stay solid. Look under shields to see the chips beneath their metal lids.' },
  inspect: { label: 'Inspect', description: 'One part stays solid and everything else fades. Choose a part in the view or the parts list.' },
};
export const LAYOUT_NOTICE = 'Representative layout: generic part classes in a typical arrangement, not the internals of a real phone.';

export function subsystemOptions(): Array<{ value: Subsystem | 'all'; label: string }> {
  return [{ value: 'all', label: 'All subsystems' }, ...(Object.entries(SUBSYSTEMS) as Array<[Subsystem, string]>).map(([value, label]) => ({ value, label }))];
}

/** One sentence describing the current view, for the caption and screen readers. */
export function describeView(view: BuildView, partName?: string | null): string {
  const scope = view.subsystem === 'all' ? '' : ` · ${SUBSYSTEMS[view.subsystem]}`;
  if (view.mode === 'inspect') return partName ? `Inspecting ${partName}.` : 'Inspect mode. Choose a part to isolate it.';
  if (view.mode === 'xray') return `X-ray view${scope}${view.xrayDepth === 2 ? ', looking under shields and covers' : ''}.`;
  if (view.mode === 'exploded') return `Exploded view${scope}.`;
  return `Assembled view${scope}.`;
}

/** Applies a view change with the rules the UI relies on. */
export function nextView(current: BuildView, change: Partial<BuildView>): BuildView {
  const next = { ...current, ...change };
  if (change.mode && change.mode !== 'inspect' && change.selected === undefined && current.mode === 'inspect') next.selected = current.selected;
  if (next.mode !== 'xray') next.xrayDepth = change.xrayDepth ?? current.xrayDepth;
  return next;
}
