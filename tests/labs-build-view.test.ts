import { describe, expect, it } from 'vitest';
import { DEFAULT_VIEW, LAYOUT_NOTICE, VIEW_MODES, describeView, nextView, subsystemOptions } from '../src/lib/labs/build/view-options';
import * as lib from '../src/lib/labs/build';
import { SUBSYSTEMS } from '../src/lib/labs/build/schema';

describe('Build a Phone view modes', () => {
  it('offers the four specified modes with explanations', () => {
    expect(Object.keys(VIEW_MODES)).toEqual(['assembled', 'exploded', 'xray', 'inspect']);
    for (const mode of Object.values(VIEW_MODES)) expect(mode.description.length).toBeGreaterThan(40);
    expect(DEFAULT_VIEW).toEqual({ mode: 'assembled', subsystem: 'all', xrayDepth: 1, selected: null });
  });
  it('lists every subsystem plus an all option', () => {
    const options = subsystemOptions();
    expect(options[0].value).toBe('all');
    expect(options.slice(1).map(o => o.value)).toEqual(Object.keys(SUBSYSTEMS));
  });
  it('describes the view for captions and screen readers', () => {
    expect(describeView(DEFAULT_VIEW)).toBe('Assembled view.');
    expect(describeView({ ...DEFAULT_VIEW, mode: 'exploded', subsystem: 'camera' })).toBe('Exploded view · Camera.');
    expect(describeView({ ...DEFAULT_VIEW, mode: 'xray', xrayDepth: 2 })).toContain('under shields');
    expect(describeView({ ...DEFAULT_VIEW, mode: 'inspect' }, 'Battery')).toBe('Inspecting Battery.');
    expect(describeView({ ...DEFAULT_VIEW, mode: 'inspect' })).toContain('Choose a part');
  });
  it('keeps the selection and depth across mode changes', () => {
    const inspecting = { ...DEFAULT_VIEW, mode: 'inspect' as const, selected: 'soc' };
    expect(nextView(inspecting, { mode: 'xray' }).selected).toBe('soc');
    expect(nextView(inspecting, { mode: 'xray', selected: null }).selected).toBeNull();
    expect(nextView({ ...DEFAULT_VIEW, mode: 'xray', xrayDepth: 2 }, { mode: 'exploded' }).xrayDepth).toBe(2);
  });
  it('labels the layout as representative everywhere it is shown', () => {
    expect(LAYOUT_NOTICE).toMatch(/^Representative layout/);
    expect(LAYOUT_NOTICE).toContain('not the internals of a real phone');
  });
  it('exposes the whole feature from one lazily loaded module without the renderer', () => {
    for (const name of ['resolveBuild', 'defaultBuild', 'replaceComponent', 'installPart', 'uninstallPart', 'accessBlockers', 'describeView', 'COMPONENTS', 'SLOTS', 'ARCHITECTURES', 'SOURCES', 'CONFIDENCE_LABELS'])
      expect(name in lib).toBe(true);
    expect('createBuildModel' in lib).toBe(false);
  });
});
