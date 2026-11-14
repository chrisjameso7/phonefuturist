import { useEffect, useRef, useState, type RefObject } from 'react';
import { BACK_FINISHES,FRAME_FINISHES,FRONT_FINISHES } from '../../lib/labs/device-finishes';
import { CAMERA_LAYOUTS, DEVICE_MATERIALS, type DeviceDesign } from '../../lib/labs/device-design';
import type { DeviceScene } from '../../lib/labs/device-scene';
import type { Assembly } from '../../lib/labs/build/assembly';
import type { BuildView, BuildViewMode } from '../../lib/labs/build/view-types';

/** Build a Phone hookup. Without it the viewport behaves exactly as before. */
export type ViewportBuild = {
  assembly: Assembly | null;
  view: BuildView;
  onViewChange: (change: Partial<BuildView>) => void;
  onSelect: (slot: string | null) => void;
  /** Changes whenever the camera should frame a part (or the whole build when the slot is null). */
  focus?: { slot: string | null; key: number };
  modes: Record<BuildViewMode, { label: string; description: string }>;
  subsystems: Array<{ value: BuildView['subsystem']; label: string }>;
  caption: string;
  notice: string;
};

export default function DeviceViewport({ design, preferredView, captureRef, build }: { captureRef?:RefObject<(() => string[]) | null>; design: DeviceDesign; preferredView?: 'front' | 'back'; build?: ViewportBuild }) {
  const viewRef = useRef(preferredView); viewRef.current=preferredView;
  const host = useRef<HTMLDivElement>(null), scene = useRef<DeviceScene | null>(null), latest = useRef(design);
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [interactive, setInteractive] = useState(false), [attempt, setAttempt] = useState(0);
  const select = useRef(build?.onSelect); select.current = build?.onSelect;
  const lastView = useRef<BuildView | null>(null);
  latest.current = design;
  useEffect(() => {
    let cancelled = false;
    setStatus('loading'); setInteractive(false);
    void import('../../lib/labs/device-scene').then(({ createDeviceScene }) => {
      if (cancelled || !host.current) return;
      try {
        scene.current = createDeviceScene(host.current, latest.current, () => {
          if(captureRef)captureRef.current=null;setStatus('unavailable'); scene.current?.dispose(); scene.current = null;
        });
        if(viewRef.current)scene.current.view(viewRef.current);
        if(captureRef)captureRef.current=()=>scene.current!.capture();
        scene.current.onSelect(slot => select.current?.(slot));
        lastView.current = null;
        setStatus('ready');
      } catch { host.current.replaceChildren(); setStatus('unavailable'); }
    }).catch(() => { if (!cancelled) setStatus('unavailable'); });
    return () => { cancelled = true; if(captureRef)captureRef.current=null; scene.current?.dispose(); scene.current = null; };
  }, [attempt,captureRef]);
  useEffect(() => { scene.current?.update(design); }, [design]);
  useEffect(()=>{if(preferredView)scene.current?.view(preferredView);},[preferredView]);
  // Build a Phone: show the resolved build, apply the view and frame parts.
  const assembly = build?.assembly ?? null, view = build?.view;
  useEffect(() => { if (status === 'ready') void scene.current?.setBuild(assembly); }, [assembly, status]);
  useEffect(() => {
    if (status !== 'ready' || !view) return;
    const before = lastView.current, reframe = !before || before.mode !== view.mode || before.subsystem !== view.subsystem;
    scene.current?.setBuildView(view, reframe); lastView.current = view;
  }, [view, status]);
  const focusKey = build?.focus?.key;
  useEffect(() => { if (status === 'ready' && build?.focus) scene.current?.focus(build.focus.slot); }, [focusKey, status]);

  // Rendering monitor for QA: add ?perf to the address to show tier, frame time, draw calls and triangles.
  const [perf, setPerf] = useState<string | null>(null);
  useEffect(() => {
    if (status !== 'ready' || !new URLSearchParams(window.location.search).has('perf')) return;
    const timer = window.setInterval(() => { const s = scene.current?.stats(); if (s) setPerf(`${s.quality}${s.downgraded ? ' (stepped down)' : ''} · ${s.frameMs} ms · ${s.calls} draws · ${Math.round(s.triangles / 1000)}k triangles · ${s.pixelRatio}× pixels`); }, 1000);
    return () => window.clearInterval(timer);
  }, [status]);
  const inside = !!(build && assembly);
  const modeButtons = build ? (Object.keys(build.modes) as BuildViewMode[]) : [];
  return <section className="device-preview" aria-label="Device preview">
    <div className="device-viewport" ref={host} role="img" aria-label={inside ? `${design.name}, internal hardware. ${build!.caption}` : `${design.name}, ${design.backFinish?BACK_FINISHES[design.backFinish].label:DEVICE_MATERIALS[design.material]} rear, ${design.frameFinish?FRAME_FINISHES[design.frameFinish].label:'metal'} frame, ${design.frontFinish?FRONT_FINISHES[design.frontFinish].label:'glass'} front, ${CAMERA_LAYOUTS[design.camera]}, ${design.height} by ${design.width} by ${design.thickness} millimetres`} />
    {status !== 'ready' && <div className="device-preview-status" role="status" aria-busy={status === 'loading'}>
      <div className="device-fallback" style={{ background: design.color, aspectRatio: `${design.width}/${design.height}` }} aria-hidden="true"><span /></div>
      {status === 'loading' && <progress aria-label="Opening the studio" />}
      <p>{status === 'loading' ? 'Opening the studio…' : '3D preview is unavailable in this browser. You can continue editing. Retry the preview to export a visual design card.'}</p>
      {status === 'unavailable' && <button type="button" onClick={() => setAttempt(n => n + 1)}>Retry 3D preview</button>}
    </div>}
    {inside && <div className="build-view-tools">
      <div className="build-mode-switch" role="group" aria-label="Internal view">
        {modeButtons.map(mode => <button type="button" key={mode} aria-pressed={view!.mode === mode} disabled={status !== 'ready'} onClick={() => build!.onViewChange({ mode })}>{build!.modes[mode].label}</button>)}
      </div>
      <div className="build-view-options">
        <label>Subsystem<select value={view!.subsystem} onChange={e => build!.onViewChange({ subsystem: e.target.value as BuildView['subsystem'] })}>{build!.subsystems.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
        {view!.mode === 'xray' && <label className="build-check"><input type="checkbox" checked={view!.xrayDepth === 2} onChange={e => build!.onViewChange({ xrayDepth: e.target.checked ? 2 : 1 })}/> Look under shields</label>}
        {view!.selected && <button type="button" onClick={() => build!.onSelect(null)}>Clear selection</button>}
      </div>
    </div>}
    <div className="device-view-tools" aria-label="Preview controls">
      <button type="button" disabled={status !== 'ready'} onClick={() => scene.current?.view('front')}>Front</button>
      <button type="button" disabled={status !== 'ready'} onClick={() => scene.current?.view('back')}>Back / reset</button>
      <button type="button" disabled={status !== 'ready'} onClick={() => scene.current?.view('side')}>Side / depth</button>
      <button type="button" disabled={status !== 'ready'} aria-pressed={interactive} onClick={() => {
        const enabled = !interactive; setInteractive(enabled); scene.current?.interact(enabled);
      }}>{interactive ? 'Finish rotating' : 'Rotate device'}</button>
    </div>
    <p className="device-preview-caption" aria-live="polite">{inside ? build!.caption : interactive ? 'Drag to orbit. Choose Finish rotating to scroll over the preview.' : 'Choose Rotate device to explore every angle.'}</p>
    {perf && <p className="build-layout-notice" data-perf="">{perf}</p>}
    {inside && <p className="build-layout-notice">{interactive ? 'Drag to orbit, scroll or pinch to zoom, tap a part to select it. ' : 'Tap a part to select it. Choose Rotate device to orbit and zoom. '}{build!.notice}</p>}
  </section>;
}
