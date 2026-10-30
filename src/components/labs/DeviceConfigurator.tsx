import { WALLPAPERS } from '../../lib/labs/wallpaper-options';
import { useRef, useState } from 'react';

import LabNumber from './LabNumber';

import DeviceViewport from './DeviceViewport';

import { displayGeometry } from '../../lib/labs/concept-geometry';

import { BACK_FINISHES,FRAME_FINISHES,FRONT_FINISHES } from '../../lib/labs/device-finishes';

import { DESIGN_FAMILIES, CAMERA_LAYOUTS, DEFAULT_DESIGN, DESIGN_LIMITS, DEVICE_PRESETS, normalizeDesign, type DeviceDesign } from '../../lib/labs/device-design';



export default function DeviceConfigurator() {

  const [design, setDesign] = useState<DeviceDesign>({ ...DEFAULT_DESIGN, family:'plateau',cameraWidth:68,cameraHeight:44,frameFinish:'brushedTitanium',backFinish:'titanium',frontFinish:'antiReflective',wallpaper:'aurora' });

  const captureRef=useRef<(() => string[]) | null>(null);
  const [exporting,setExporting]=useState(false),[exportStatus,setExportStatus]=useState('');
  const [customDisplay,setCustomDisplay]=useState(false),[diagonal,setDiagonal]=useState(6.5),[ratio,setRatio]=useState({width:9,height:19.5});

  const display=customDisplay?displayGeometry(diagonal,ratio.width,ratio.height,design.width,design.height):null;

  const rendered={...design,...(display?{displayWidth:display.valid?display.width:0,displayHeight:display.valid?display.height:0}:{})};

  function dimension(key:'width'|'height',value:number){const r=ratio.width/ratio.height;const w=key==='width'?value:value*r,h=key==='height'?value:value/r;setDiagonal(Math.hypot(w,h)/25.4);}

  function number(key:keyof DeviceDesign,label:string,min:number,max:number,step=.1){return <LabNumber key={key} label={label} value={Number(design[key]??normalizeDesign(design)[key]??0)} min={min} max={max} step={step} onValue={value=>update(key,value as never)}/>;}



  function update<K extends keyof DeviceDesign>(key: K, value: DeviceDesign[K]) {

    setDesign(current => normalizeDesign({ ...current, [key]: value }));

  }

  async function download() {
    if(!captureRef.current){setExportStatus('Wait for the 3D preview to load, then try again.');return;}
    setExporting(true);setExportStatus('');
    try{const images=captureRef.current();const {downloadDesignCard}=await import('../../lib/labs/device-design-export');await downloadDesignCard(rendered,images);setExportStatus('Design card downloaded with front, rear and dimensions.');}
    catch{setExportStatus('Could not export the design card. Please retry the 3D preview.');}
    finally{setExporting(false);}
  }

  return <div className="device-configurator">

    <section className="lab-glass device-design-controls" aria-label="Device design controls">

      <label>Concept name<input type="text" value={design.name} maxLength={80} onChange={e => setDesign(c => ({ ...c, name: e.target.value }))} /></label>

      <fieldset className="device-family-picker"><legend>Design family</legend><div>{Object.entries(DESIGN_FAMILIES).map(([value,label],i)=><button type="button" key={value} aria-pressed={design.family===value} onClick={()=>setDesign(c=>({...c,family:value as DeviceDesign['family'],cornerRadius:value==='stealth'?3:value==='plateau'||value==='duo'?12:7,cameraWidth:value==='plateau'||value==='duo'||value==='dot'?c.width-8:value==='halo'?Math.min(56,c.width-8):24,cameraHeight:value==='duo'?24:value==='plateau'?44:value==='halo'?Math.min(56,c.width-8):58,cameraCount:value==='duo'?2:value==='column'?4:3,selfieStyle:value==='stealth'?'none':value==='plateau'?'pill':'punch',protrusion:value==='stealth'?1:3,camera:value==='halo'?'circle':'triple'}))}><svg viewBox="0 0 60 80" aria-hidden="true"><rect x="12" y="3" width="36" height="72" rx={value==='stealth'?2:8}/>{value==='duo'?<rect x="14" y="10" width="32" height="10" rx="3"/>:value==='halo'?<circle cx="30" cy="20" r="12"/>:<><circle cx="21" cy="15" r="4"/><circle cx="21" cy="27" r="4"/>{i!==1&&<circle cx="34" cy="20" r="4"/>}</>}{value==='dot'&&<><circle cx="38" cy="11" r="3"/><path d="M18 47H40M20 53H35"/></>}{value==='stealth'&&<path d="M20 48L40 40M20 53L40 45"/>}</svg><span>{label}</span></button>)}</div></fieldset>

      <div className="device-presets" aria-label="Size presets">

        <span>Chassis size</span>

        <button type="button" onClick={() => setDesign(c => normalizeDesign({ ...c, ...DEVICE_PRESETS.compact }))}>Compact</button>

        <button type="button" onClick={() => setDesign(c => normalizeDesign({ ...c, ...DEVICE_PRESETS.ultra }))}>Ultra</button>

      </div>

      {(['width', 'height', 'thickness', 'bezel'] as const).map(key => <label key={key}>

        <span className="device-control-label"><span>{key === 'bezel' ? 'Uniform bezel' : key[0].toUpperCase() + key.slice(1)}</span><output>{design[key]} mm</output></span>

        <input aria-label={key === 'bezel' ? 'Uniform bezel' : key[0].toUpperCase() + key.slice(1)} type="range" min={DESIGN_LIMITS[key][0]} max={DESIGN_LIMITS[key][1]} step={.1} value={design[key]} onChange={e => update(key, Number(e.target.value))} />

      </label>)}

      <label>Side frame material<select aria-label="Side frame material" value={design.frameFinish??'brushedTitanium'} onChange={e=>update('frameFinish',e.target.value as DeviceDesign['frameFinish'])}>{Object.entries(FRAME_FINISHES).map(([value,p])=><option key={value} value={value}>{p.label}</option>)}</select></label>

      <label>Front surface<select aria-label="Front surface" value={design.frontFinish??'antiReflective'} onChange={e=>update('frontFinish',e.target.value as DeviceDesign['frontFinish'])}>{Object.entries(FRONT_FINISHES).map(([value,p])=><option key={value} value={value}>{p.label}</option>)}</select></label>

      <label>Rear material<select aria-label="Rear material" value={design.backFinish??'titanium'} onChange={e=>update('backFinish',e.target.value as DeviceDesign['backFinish'])}>{Object.entries(BACK_FINISHES).map(([value,p])=><option key={value} value={value}>{p.label}</option>)}</select></label>

      <label>Frame profile<select aria-label="Frame profile" value={design.frameProfile??'flat'} onChange={e=>update('frameProfile',e.target.value as DeviceDesign['frameProfile'])}><option value="flat">Flat edges</option><option value="rounded">Soft rounded edges</option></select></label>

      {number('cornerRadius','Corner radius · mm',1,20)}

      <fieldset className="device-display-controls"><legend>Display</legend><label><input type="checkbox" checked={customDisplay} onChange={e=>{if(e.target.checked){setDiagonal(Math.hypot(design.width-2*design.bezel,design.height-2*design.bezel)/25.4);setRatio({width:design.width-2*design.bezel,height:design.height-2*design.bezel});}setCustomDisplay(e.target.checked);}}/> Custom display dimensions</label>

      {customDisplay&&<><label>Display diagonal · inches<input aria-label="Display diagonal · inches" type="number" min=".5" step=".01" value={diagonal} onChange={e=>setDiagonal(Number(e.target.value))}/></label><label>Aspect width<input aria-label="Aspect width" type="number" min=".01" step=".01" value={ratio.width} onChange={e=>setRatio(r=>({...r,width:Number(e.target.value)}))}/></label><label>Aspect height<input aria-label="Aspect height" type="number" min=".01" step=".01" value={ratio.height} onChange={e=>setRatio(r=>({...r,height:Number(e.target.value)}))}/></label><label>Display width · mm<input aria-label="Display width · mm" type="number" step=".1" min="1" value={Number(display?.width.toFixed(2))} onChange={e=>dimension('width',Number(e.target.value))}/></label><label>Display height · mm<input aria-label="Display height · mm" type="number" step=".1" min="1" value={Number(display?.height.toFixed(2))} onChange={e=>dimension('height',Number(e.target.value))}/></label>{!display?.valid&&<p role="alert">The display does not fit. Reduce its dimensions or explicitly resize the chassis.</p>}</>}

      </fieldset>

      <label>Wallpaper<select aria-label="Wallpaper" value={design.wallpaper??'aurora'} onChange={e=>update('wallpaper',e.target.value as DeviceDesign['wallpaper'])}>{Object.entries(WALLPAPERS).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
      <label className="device-color-label">Finish colour<input type="color" value={design.color} onInput={e => update('color', e.currentTarget.value)} onChange={e => update('color', e.target.value)} /></label>

      <label>Camera module<select aria-label="Camera module" value={design.camera} onChange={e => update('camera', e.target.value as DeviceDesign['camera'])}>{Object.entries(CAMERA_LAYOUTS).filter(([value])=>value!=='circle'||design.family==='halo').map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>

      <label>Rear lens count<select aria-label="Rear lens count" value={design.cameraCount??3} onChange={e=>update('cameraCount',Number(e.target.value))}>{(design.family==='duo'?[2]:[1,2,3,4]).map(n=><option value={n} key={n}>{n} {n===1?'camera':'cameras'}</option>)}</select></label>

      {number('cameraWidth',design.family==='halo'?'Camera housing diameter · mm':'Camera island width · mm',18,design.width-8)}{design.family!=='halo'&&number('cameraHeight','Camera island height · mm',18,design.family==='duo'?Math.min(design.width*.5,design.height*.45):design.height*.45)}{number('protrusion','Camera bump depth · mm',.5,6)}{number('cameraX','Camera horizontal offset · mm',-design.width*.4,design.width*.4)}{number('cameraY','Camera vertical offset · mm',-design.height*.3,design.height*.3)}{number('lensDiameter','Lens diameter · mm',3,18)}{number('lensSpacing','Lens spacing · mm',1,10)}

      <label>Selfie opening<select aria-label="Selfie opening" value={design.selfieStyle??'punch'} onChange={e=>update('selfieStyle',e.target.value as DeviceDesign['selfieStyle'])}><option value="punch">Round punch hole</option><option value="pill">Pill opening</option><option value="none">No visible opening</option></select></label>

      <label>Selfie opening size · mm<input aria-label="Selfie opening size · mm" type="number" min="1" max="6" step=".1" value={design.selfieDiameter??2.8} onChange={e=>update('selfieDiameter',Math.max(1,Math.min(6,Number(e.target.value))))}/></label>

      <label><input type="checkbox" checked={design.usbC!==false} onChange={e=>update('usbC',e.target.checked)}/> USB-C port</label>

      <label>Speakers<select aria-label="Speakers" value={design.speakers??'bottom'} onChange={e=>update('speakers',e.target.value as DeviceDesign['speakers'])}><option value="none">No grilles</option><option value="bottom">Bottom grilles</option><option value="stereo">Top and bottom grilles</option></select></label>

      <label><input type="checkbox" checked={design.antenna!==false} onChange={e=>update('antenna',e.target.checked)}/> Antenna cutouts</label>

      {(design.family==='stealth'||design.family==='dot')&&<label><input type="checkbox" checked={design.lighting??false} onChange={e=>update('lighting',e.target.checked)}/> Decorative lighting</label>}

      <button type="button" disabled={exporting||!!(display&&!display.valid)} onClick={download}>{exporting?'Preparing design card…':'Download design card'}</button><p role="status">{exportStatus}</p>

    </section>

    <div className="device-studio lab-glass"><DeviceViewport design={rendered} captureRef={captureRef} /><div className="device-design-summary"><h2>{design.name || 'Untitled concept'}</h2><p>{design.height} × {design.width} × {design.thickness} mm · {BACK_FINISHES[design.backFinish??'titanium'].label}</p><p>{CAMERA_LAYOUTS[design.camera]}</p></div></div>

  </div>;

}

