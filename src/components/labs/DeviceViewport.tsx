import { useEffect, useRef, useState, type RefObject } from 'react';
import { BACK_FINISHES,FRAME_FINISHES,FRONT_FINISHES } from '../../lib/labs/device-finishes';
import { CAMERA_LAYOUTS, DEVICE_MATERIALS, type DeviceDesign } from '../../lib/labs/device-design';
import type { DeviceScene } from '../../lib/labs/device-scene';

export default function DeviceViewport({ design, preferredView, captureRef }: { captureRef?:RefObject<(() => string[]) | null>; design: DeviceDesign; preferredView?: 'front' | 'back' }) {
  const viewRef = useRef(preferredView); viewRef.current=preferredView;
  const host = useRef<HTMLDivElement>(null), scene = useRef<DeviceScene | null>(null), latest = useRef(design);
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [interactive, setInteractive] = useState(false), [attempt, setAttempt] = useState(0);
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
        setStatus('ready');
      } catch { host.current.replaceChildren(); setStatus('unavailable'); }
    }).catch(() => { if (!cancelled) setStatus('unavailable'); });
    return () => { cancelled = true; if(captureRef)captureRef.current=null; scene.current?.dispose(); scene.current = null; };
  }, [attempt,captureRef]);
  useEffect(() => { scene.current?.update(design); }, [design]);
  useEffect(()=>{if(preferredView)scene.current?.view(preferredView);},[preferredView]);
  return <section className="device-preview" aria-label="Device preview">
    <div className="device-viewport" ref={host} role="img" aria-label={`${design.name}, ${design.backFinish?BACK_FINISHES[design.backFinish].label:DEVICE_MATERIALS[design.material]} rear, ${design.frameFinish?FRAME_FINISHES[design.frameFinish].label:'metal'} frame, ${design.frontFinish?FRONT_FINISHES[design.frontFinish].label:'glass'} front, ${CAMERA_LAYOUTS[design.camera]}, ${design.height} by ${design.width} by ${design.thickness} millimetres`} />
    {status !== 'ready' && <div className="device-preview-status" role="status">
      <div className="device-fallback" style={{ background: design.color, aspectRatio: `${design.width}/${design.height}` }} aria-hidden="true"><span /></div>
      <p>{status === 'loading' ? 'Opening the studio…' : '3D preview is unavailable in this browser. You can continue editing. Retry the preview to export a visual design card.'}</p>
      {status === 'unavailable' && <button type="button" onClick={() => setAttempt(n => n + 1)}>Retry 3D preview</button>}
    </div>}
    <div className="device-view-tools" aria-label="Preview controls">
      <button type="button" disabled={status !== 'ready'} onClick={() => scene.current?.view('front')}>Front</button>
      <button type="button" disabled={status !== 'ready'} onClick={() => scene.current?.view('back')}>Back / reset</button>
      <button type="button" disabled={status !== 'ready'} onClick={() => scene.current?.view('side')}>Side / depth</button>
      <button type="button" disabled={status !== 'ready'} aria-pressed={interactive} onClick={() => {
        const enabled = !interactive; setInteractive(enabled); scene.current?.interact(enabled);
      }}>{interactive ? 'Finish rotating' : 'Rotate device'}</button>
    </div>
    <p className="device-preview-caption">{interactive ? 'Drag to orbit. Choose Finish rotating to scroll over the preview.' : 'Choose Rotate device to explore every angle.'}</p>
  </section>;
}
