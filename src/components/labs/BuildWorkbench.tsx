import { useEffect, useRef, useState } from 'react';
import type { Assembly } from '../../lib/labs/build/assembly';
import type { BuildView } from '../../lib/labs/build/view-types';
import type { Confidence, PhoneBuild, Subsystem } from '../../lib/labs/build/schema';
import type { DeviceDesign } from '../../lib/labs/device-design';

/** The lazily loaded Build a Phone library (src/lib/labs/build/index.ts). */
export type BuildLib = typeof import('../../lib/labs/build');
export type BuildState = Pick<PhoneBuild, 'architecture' | 'selections' | 'uninstalled'>;

type Props = {
  lib: BuildLib; assembly: Assembly; state: BuildState;
  onState: (update: (current: BuildState) => BuildState) => void;
  view: BuildView; onView: (change: Partial<BuildView>) => void;
  onSelect: (slot: string | null) => void;
  onDesign: (change: Partial<DeviceDesign>) => void;
};

function Confidence({ lib, value }: { lib: BuildLib; value: Confidence }) {
  return <span className="build-confidence" data-confidence={value}>{lib.CONFIDENCE_LABELS[value]}</span>;
}

export default function BuildWorkbench({ lib, assembly, state, onState, view, onView, onSelect, onDesign }: Props) {
  const { ARCHITECTURES, SUBSYSTEMS, CONFIDENCE_LABELS, LAYOUT_NOTICE, COMPONENTS, SLOT_BY_ID } = lib;
  const [message, setMessage] = useState('');
  const [openStep, setOpenStep] = useState<number | null>(null);
  const inspector = useRef<HTMLElement>(null);
  const steps = lib.stepSummaries(assembly);
  const selected = view.selected ? lib.inspectPart(assembly, view.selected) : null;
  // Selecting a part from the 3D view opens its step and brings the inspector into view.
  useEffect(() => {
    if (!view.selected) return;
    const part = assembly.bySlot[view.selected]; if (part) setOpenStep(part.slot.step);
    inspector.current?.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [view.selected]);

  const apply = (result: { build: PhoneBuild; message: string; ok: boolean }) => {
    setMessage(result.message);
    if (result.ok) onState(s => ({ ...s, uninstalled: result.build.uninstalled }));
  };
  const replace = (slotId: string, componentId: string | null) => {
    if (lib.isDesignBound(slotId)) { const change = componentId && lib.designForBoundSlot(slotId, componentId); if (change) onDesign(change); }
    else onState(s => ({ ...s, selections: { ...s.selections, [slotId]: componentId } }));
    const name = componentId ? COMPONENTS[componentId].name : 'nothing';
    setMessage(componentId ? `Fitted the ${lib.inSentence(name)} to the ${lib.inSentence(SLOT_BY_ID[slotId].label)} position.` : `Left the ${lib.inSentence(SLOT_BY_ID[slotId].label)} position empty.`);
  };
  const counts = new Map<Subsystem, { total: number; installed: number }>();
  for (const part of assembly.parts) { const c = counts.get(part.slot.subsystem) ?? { total: 0, installed: 0 }; c.total++; if (part.installed) c.installed++; counts.set(part.slot.subsystem, c); }
  const { totals, layout } = assembly;

  return <div className="build-workbench">
    <p className="build-notice" role="note"><strong>Representative</strong> {LAYOUT_NOTICE.replace(/^Representative layout: /, '')}</p>

    {selected && <section ref={inspector} className="build-inspector" aria-labelledby="build-inspector-title">
      <div className="build-inspector-head">
        <div>
          <p className="build-kicker">{selected.subsystem} · {selected.step}</p>
          <h3 id="build-inspector-title">{selected.name}</h3>
        </div>
        <button type="button" className="build-icon-button" aria-label="Close inspector" onClick={() => onSelect(null)}>×</button>
      </div>
      <p className="build-tags">
        {selected.representative && <span className="build-tag build-tag-rep">Representative part</span>}
        <span className="build-tag">{selected.installed ? 'Installed' : 'Not installed'}</span>
      </p>
      <p className="build-description">{selected.description}</p>
      <dl className="build-facts">
        <div><dt>Manufacturer</dt><dd>{selected.manufacturer}</dd></div>
        <div><dt>Model</dt><dd>{selected.model}</dd></div>
        <div><dt>Position</dt><dd>{selected.position}</dd></div>
        <div><dt>Location</dt><dd>{selected.location}</dd></div>
      </dl>
      <h4>Specifications</h4>
      <table className="build-figures">
        <thead><tr><th scope="col">Figure</th><th scope="col">Value</th><th scope="col">Confidence</th></tr></thead>
        <tbody>{selected.figures.map((f, i) => <tr key={i}><th scope="row">{f.label}</th><td>{f.value}</td><td><Confidence lib={lib} value={f.confidence}/>{(i === 0 || selected.figures[i - 1].source !== f.source) && <span className="build-source">{lib.SOURCES[f.source]?.title}</span>}</td></tr>)}</tbody>
      </table>
      {selected.materials.length > 0 && <p className="build-meta"><strong>Materials</strong> {selected.materials.join(' · ')}</p>}
      {selected.contains.length > 0 && <><h4>What it contains</h4><ul className="build-contains">{selected.contains.map(item => <li key={item.label}><strong>{item.label}</strong> {item.description}</li>)}</ul></>}
      {selected.connections.length > 0 && <><h4>Connections</h4>
        <ul className="build-connections">{selected.connections.map((link, i) => <li key={i}>
          <button type="button" disabled={!link.present} onClick={() => onSelect(link.slotId)}><span>{link.name}</span><small>{link.interface}{link.via ? ` · via ${link.via}` : ''}</small></button>
          <p>{link.description}</p>
        </li>)}</ul></>}
      {(selected.access.blockers.length > 0 || selected.access.carried.length > 0) && <><h4>Service access</h4>
        {selected.access.blockers.length > 0 && <p className="build-meta">To reach it, remove: {selected.access.blockers.join(', ')}.</p>}
        {selected.access.carried.length > 0 && <p className="build-meta">Mounted on it, and removed with it: {selected.access.carried.join(', ')}.</p>}
      </>}
      {selected.alternatives.length > 0 && <><h4>Alternatives that fit this position</h4>
        <ul className="build-alternatives">{selected.alternatives.slice(0, 8).map(alt => <li key={alt.id}>
          <span><strong>{alt.name}</strong><small>{alt.difference}</small></span>
          <button type="button" onClick={() => replace(selected.slotId, alt.id)}>Use this</button>
        </li>)}</ul></>}
      <details className="build-sources"><summary>Sources and geometry</summary>
        <p className="build-meta">{selected.geometry}</p>
        <ul>{selected.sources.map(src => <li key={src.title}><strong>{src.title}</strong>{src.note ? ` — ${src.note}` : ''}</li>)}</ul>
      </details>
    </section>}

    <section className="build-assembly" aria-labelledby="build-assembly-title">
      <div className="build-assembly-head">
        <h3 id="build-assembly-title">Assembly</h3>
        <span>{totals.installedCount} of {totals.partCount} parts</span>
      </div>
      <div className="build-assembly-actions">
        <button type="button" onClick={() => apply(lib.emptyChassis(assembly))}>Strip to frame</button>
        <button type="button" className="build-primary" disabled={totals.installedCount === totals.partCount} onClick={() => { const r = lib.installNextStep(assembly); apply(r); if (r.step) setOpenStep(r.step); }}>Install next step</button>
        <button type="button" disabled={totals.installedCount === totals.partCount} onClick={() => apply(lib.assembleAll(assembly))}>Install everything</button>
      </div>
      <p className="build-message" role="status" aria-live="polite">{message}</p>
      <ol className="build-steps">
        {steps.map(step => <li key={step.step} data-complete={step.complete}>
          <details open={openStep === step.step} onToggle={e => { const open = (e.currentTarget as HTMLDetailsElement).open; setOpenStep(o => open ? step.step : o === step.step ? null : o); }}>
            <summary><span className="build-step-number">{String(step.step).padStart(2, '0')}</span><span className="build-step-label">{step.label}</span><small>{step.installed}/{step.total}</small></summary>
            <ul className="build-parts">{step.parts.map(part => {
              const id = part.slot.id, options = part.slot.options, empty = lib.canLeaveEmpty(id);
              return <li key={id} data-installed={part.installed} data-selected={view.selected === id}>
                <div className="build-part-name">
                  <button type="button" className="build-link" onClick={() => onSelect(id)} aria-label={`Inspect ${part.component.name}`}>{part.component.name}</button>
                  <small>{part.slot.label}{assembly.auto[id] ? ' · fitted automatically' : ''}{part.component.representative ? ' · representative' : ''}</small>
                </div>
                <div className="build-part-actions">
                  {(options.length > 1 || empty) && <label className="build-replace"><span className="build-visually-hidden">Replace {part.slot.label}</span>
                    <select value={part.component.id} onChange={e => replace(id, e.target.value === '' ? null : e.target.value)}>
                      {options.map(o => <option key={o} value={o}>{COMPONENTS[o].name}</option>)}
                      {empty && <option value="">Leave empty</option>}
                    </select></label>}
                  {part.installed
                    ? <button type="button" onClick={() => apply(lib.removePart(assembly, id))}>Remove</button>
                    : <button type="button" className="build-primary" onClick={() => apply(lib.installPartChecked(assembly, id))}>Install</button>}
                </div>
              </li>;
            })}
            {assembly.empty.filter(slot => slot.step === step.step).map(slot => <li key={slot.id} data-installed="false">
              <div className="build-part-name"><span>{slot.label}</span><small>Empty position</small></div>
              <div className="build-part-actions"><label className="build-replace"><span className="build-visually-hidden">Fit {slot.label}</span>
                <select value="" onChange={e => e.target.value && replace(slot.id, e.target.value)}>
                  <option value="">Choose a part…</option>{slot.options.map(o => <option key={o} value={o}>{COMPONENTS[o].name}</option>)}
                </select></label></div>
            </li>)}
            </ul>
          </details>
        </li>)}
      </ol>
    </section>

    <fieldset className="build-architectures">
      <legend>Internal layout</legend>
      {Object.values(ARCHITECTURES).map(arch => <label key={arch.id} className="build-architecture">
        <input type="radio" name="build-architecture" value={arch.id} checked={state.architecture === arch.id} onChange={() => { onState(s => ({ ...s, architecture: arch.id })); setMessage(`Switched to the ${arch.name.toLowerCase()}.`); }}/>
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
