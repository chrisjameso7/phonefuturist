import type { Assembly } from '../../lib/labs/build/assembly';
import type { BuildView } from '../../lib/labs/build/view-types';
import type { PhoneBuild, Subsystem } from '../../lib/labs/build/schema';

/** The lazily loaded Build a Phone library (src/lib/labs/build/index.ts). */
export type BuildLib = typeof import('../../lib/labs/build');
export type BuildState = Pick<PhoneBuild, 'architecture' | 'selections' | 'uninstalled'>;

type Props = {
  lib: BuildLib; assembly: Assembly; state: BuildState;
  onState: (update: (current: BuildState) => BuildState) => void;
  view: BuildView; onView: (change: Partial<BuildView>) => void;
  onSelect: (slot: string | null) => void;
  onDesign: (change: Partial<import('../../lib/labs/device-design').DeviceDesign>) => void;
};

export default function BuildWorkbench({ lib, assembly, state, onState, view, onView }: Props) {
  const { ARCHITECTURES, SUBSYSTEMS, CONFIDENCE_LABELS, LAYOUT_NOTICE } = lib;
  const counts = new Map<Subsystem, { total: number; installed: number }>();
  for (const part of assembly.parts) { const c = counts.get(part.slot.subsystem) ?? { total: 0, installed: 0 }; c.total++; if (part.installed) c.installed++; counts.set(part.slot.subsystem, c); }
  const { totals, layout } = assembly;
  return <div className="build-workbench">
    <p className="build-notice" role="note"><strong>Representative</strong> {LAYOUT_NOTICE.replace(/^Representative layout: /, '')}</p>

    <fieldset className="build-architectures">
      <legend>Internal layout</legend>
      {Object.values(ARCHITECTURES).map(arch => <label key={arch.id} className="build-architecture">
        <input type="radio" name="build-architecture" value={arch.id} checked={state.architecture === arch.id} onChange={() => onState(s => ({ ...s, architecture: arch.id }))}/>
        <span><strong>{arch.name}</strong><small>{arch.summary}</small></span>
      </label>)}
    </fieldset>

    <dl className="build-totals">
      <div><dt>Parts installed</dt><dd>{totals.installedCount} of {totals.partCount}</dd></div>
      <div><dt>Estimated mass</dt><dd>{Math.round(totals.installedWeightG)} g <span className="build-confidence" data-confidence={totals.weightConfidence}>{CONFIDENCE_LABELS[totals.weightConfidence]}</span></dd></div>
      <div><dt>Internal cavity</dt><dd>{layout.z.cavity.toFixed(1)} mm deep <span className="build-confidence" data-confidence="estimated">{CONFIDENCE_LABELS.estimated}</span></dd></div>
      <div><dt>Chassis</dt><dd>{layout.design.height} × {layout.design.width} × {layout.design.thickness} mm <span className="build-confidence" data-confidence="user">{CONFIDENCE_LABELS.user}</span></dd></div>
    </dl>

    <section className="build-subsystems" aria-labelledby="build-subsystems-title">
      <h3 id="build-subsystems-title">Subsystems</h3>
      <ul>
        {(Object.entries(SUBSYSTEMS) as Array<[Subsystem, string]>).filter(([key]) => counts.has(key)).map(([key, label]) => {
          const c = counts.get(key)!, active = view.subsystem === key;
          return <li key={key}>
            <button type="button" aria-pressed={active} onClick={() => onView(active ? { subsystem: 'all' } : { subsystem: key, mode: view.mode === 'assembled' ? 'exploded' : view.mode })}>
              <span>{label}</span><small>{c.installed === c.total ? `${c.total} parts` : `${c.installed} of ${c.total} installed`}</small>
            </button>
          </li>;
        })}
      </ul>
    </section>
  </div>;
}
