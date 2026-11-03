import {useInstrumentReady} from '../../lib/use-instrument-ready';
import PublishBuild from '../community/PublishBuild';
import { useMemo, useState } from 'react';
import { CONCEPT_PRESETS, calculateDeviceConcept, type ConceptFamily, type DeviceConcept } from '../../lib/labs/device-concepts';
import ConceptNumber from './LabNumber';
import { FRAME_FINISHES,BACK_FINISHES,FRONT_FINISHES,type FrameFinish,type BackFinish,type FrontFinish } from '../../lib/labs/device-finishes';
import DeviceViewport from './DeviceViewport';
import { conceptGeometry, conceptDesign,withConceptBezel,fitConceptChassis } from '../../lib/labs/concept-geometry';
type Metric = ReturnType<typeof calculateDeviceConcept>;
export default function DeviceConceptLab({ family }: {
    family: ConceptFamily;
}) {
 useInstrumentReady('DeviceConceptLab');
    const [builds, setBuilds] = useState<Record<ConceptFamily, DeviceConcept>>(() => ({ foldables: { ...CONCEPT_PRESETS.foldables[0] }, tablets: { ...CONCEPT_PRESETS.tablets[0] }, laptops: { ...CONCEPT_PRESETS.laptops[0] } }));
    const [active, setActive] = useState(family), [cover, setCover] = useState(false), [baseline, setBaseline] = useState<{
        name: string;
        metrics: Metric;
    } | null>(null), [status, setStatus] = useState('');
    const [presets,setPresets]=useState<Record<ConceptFamily,string>>({foldables:'0',tablets:'0',laptops:'0'});
    const concept = builds[active], foldable = active === 'foldables';
    const [angles,setAngles]=useState<Record<ConceptFamily,number>>({foldables:180,tablets:180,laptops:110});
    const angle=angles[active];
    function setAngle(value:number){setAngles(c=>({...c,[active]:value}));}
    const [finishes,setFinishes]=useState<Record<ConceptFamily,{frameFinish:FrameFinish;backFinish:BackFinish;frontFinish:FrontFinish}>>({foldables:{frameFinish:'brushedTitanium',backFinish:'frostedGlass',frontFinish:'antiReflective'},tablets:{frameFinish:'matteAluminium',backFinish:'titanium',frontFinish:'antiReflective'},laptops:{frameFinish:'matteAluminium',backFinish:'titanium',frontFinish:'antiReflective'}});
    const [sizeChoices,setSizeChoices]=useState<Record<ConceptFamily,{primary:string;cover:string}>>({foldables:{primary:'8',cover:'6.3'},tablets:{primary:'11',cover:'custom'},laptops:{primary:'14',cover:'custom'}});
    const sizes=active==='tablets'?[7,8,8.3,9,10,10.5,11,11.5,12,12.4,12.9,13,14,14.6,15,16,18,20]:active==='laptops'?[10,11.6,12,13,13.3,13.6,14,14.5,15,15.4,15.6,16,17,17.3,18,20]:[5.5,6,6.5,6.9,7.2,7.6,8,8.2,8.5,9,10];
    const geometry=conceptGeometry(concept);
    const design=useMemo(()=>({...conceptDesign(concept,angle),...finishes[active]}),[concept,angle,finishes,active]);
    const calculation = useMemo(() => {
        try {
            return { metrics: calculateDeviceConcept(concept, cover), error: '' };
        }
        catch (error) {
            return { metrics: null, error: error instanceof Error ? error.message : 'Invalid specifications.' };
        }
    }, [concept, cover]);
    const metrics = calculation.metrics;
    function update<K extends keyof DeviceConcept>(key: K, value: DeviceConcept[K]) {
      setPresets(p=>({...p,[active]:'custom'}));
      if(key==='diagonal'||key==='coverDiagonal'||key==='bezel'||key==='coverBezel')setSizeChoices(c=>({...c,[active]:{...c[active],[key==='coverDiagonal'||key==='coverBezel'?'cover':'primary']:'custom'}}));
      setBuilds(current=>{const old=current[active]; const ratios={aspectWidth:old.aspectWidth??old.pixelWidth/old.pixelHeight,aspectHeight:old.aspectHeight??1,coverAspectWidth:old.coverAspectWidth??old.coverWidth/Math.max(1,old.coverHeight),coverAspectHeight:old.coverAspectHeight??1};const next={...old,...ratios,[key]:value};return {...current,[active]:key==='bezel'||key==='coverBezel'?withConceptBezel(next,key==='coverBezel',Number(value)):next};});
    }
    function numeric(key: keyof DeviceConcept, label: string, min: number, max: number, step = 1) {
        return <ConceptNumber key={key} label={label} value={(concept[key] ?? (key==='bezel'||key==='coverBezel'?1:key==='aspectWidth'?concept.pixelWidth/concept.pixelHeight:key==='aspectHeight'?1:key==='coverAspectWidth'?concept.coverWidth/Math.max(1,concept.coverHeight):1)) as number} min={min} max={max} step={step} onValue={value => update(key, value as never)}/>;
    }
    function displayDimension(coverDisplay:boolean,key:'width'|'height',value:number){
      const g=coverDisplay?geometry.cover:geometry.primary;if(!g||!g.width||!g.height)return;
      const ratio=g.width/g.height,w=key==='width'?value:value*ratio,h=key==='height'?value:value/ratio;
      update(coverDisplay?'coverDiagonal':'diagonal',Math.hypot(w,h)/25.4);
    }
    async function receipt() {
        if (!metrics)
            return;
        try {
            const { downloadConceptReceipt } = await import('./concept-export');
            await downloadConceptReceipt(concept, metrics, cover);
            setStatus('Result receipt downloaded.');
        }
        catch {
            setStatus('Could not download the receipt.');
        }
    }
    return <section aria-label="Multi-device concept workspace"><div className="lab-family-tabs" role="group" aria-label="Device family">{(['foldables', 'tablets', 'laptops'] as const).map(key => <button key={key} aria-pressed={active === key} onClick={() => { setActive(key); setCover(false); }}>{key[0].toUpperCase() + key.slice(1)}</button>)}</div><div className="lab-split"><div className="lab-panel"><h2>Configuration</h2><div className="lab-fields"><label className="lab-field-wide">Device name<input type="text" maxLength={100} value={concept.name} onChange={e => update('name', e.currentTarget.value)}/></label><label className="lab-field-wide">Starting concept<select aria-label="Starting concept" value={presets[active]} onChange={e => {
            const value=e.currentTarget.value,index=Number(value);
            if(value==='custom'){setPresets(p=>({...p,[active]:'custom'}));return;}if(!CONCEPT_PRESETS[active][index])return;
            setPresets(p=>({...p,[active]:value}));setSizeChoices(c=>({...c,[active]:{primary:String(CONCEPT_PRESETS[active][index].diagonal),cover:String(CONCEPT_PRESETS[active][index].coverDiagonal)}}));
            setBuilds(current=>({...current,[active]:{...CONCEPT_PRESETS[active][index]}}));setCover(false);
        }}><option value="custom">Custom size & configuration</option>{CONCEPT_PRESETS[active].map((p,i)=><option key={p.name} value={i}>{p.name}</option>)}</select></label>
  {numeric('width', foldable ? 'Unfolded width · mm' : 'Width · mm', 30, 600, .1)}{numeric('height', foldable ? 'Unfolded height · mm' : 'Height · mm', 30, 600, .1)}{numeric('thickness', foldable ? 'Unfolded thickness · mm' : 'Thickness · mm', 1, 50, .1)}{numeric('weight', 'Weight · g', 50, 5000)}<label className="lab-field-wide">Display size<select aria-label="Display size" value={sizeChoices[active].primary} onChange={e=>{const value=e.target.value;if(value!=='custom')update('diagonal',Number(value));setSizeChoices(c=>({...c,[active]:{...c[active],primary:value}}));}}><option value="custom">Custom size</option>{sizes.map(n=><option key={n} value={n}>{n} inches</option>)}</select></label>
  {numeric('diagonal', 'Custom display size · inches', .1, Math.hypot(600,600)/25.4, .01)}
  {numeric('bezel','Minimum bezel · mm',.5,Math.min(20,(Math.min(concept.width,concept.height)-5)/2),.1)}
  <p className="lab-field-wide lab-note">Bezel adjustment refits the display while preserving its aspect ratio and chassis dimensions.</p>
  <p className="lab-field-wide lab-note">Display fit: up to {geometry.primary.maxDiagonal.toFixed(2)} inches at this aspect ratio. Chassis dimensions stay independent.</p>{geometry.primary.valid&&<p className="lab-field-wide lab-note">Side bezels {geometry.primary.sideBezel.toFixed(1)} mm · Top and bottom {geometry.primary.topBezel.toFixed(1)} mm</p>}
  {numeric('aspectWidth','Display aspect width',.01,1000,.01)}{numeric('aspectHeight','Display aspect height',.01,1000,.01)}
  <ConceptNumber label="Primary display width · mm" value={Number(geometry.primary.width.toFixed(2))} min={1} max={concept.width-1} step={.01} onValue={value=>displayDimension(false,'width',value)}/>
  <ConceptNumber label="Primary display height · mm" value={Number(geometry.primary.height.toFixed(2))} min={1} max={concept.height-1} step={.01} onValue={value=>displayDimension(false,'height',value)}/>
  {numeric('pixelWidth', 'Horizontal resolution · px', 320, 10000)}{numeric('pixelHeight', 'Vertical resolution · px', 320, 10000)}{numeric('refresh', 'Refresh rate · Hz', 30, 500)}
  {foldable && <><h3 className="lab-field-wide">Cover display</h3><label className="lab-field-wide">Cover display size<select aria-label="Cover display size" value={sizeChoices[active].cover} onChange={e=>{const value=e.target.value;if(value!=='custom')update('coverDiagonal',Number(value));setSizeChoices(c=>({...c,[active]:{...c[active],cover:value}}));}}><option value="custom">Custom size</option>{[1.9,2.1,3,3.4,3.6,4,4.5,5,5.5,6,6.3,6.5,7].map(n=><option key={n} value={n}>{n} inches</option>)}</select></label>
  {numeric('coverDiagonal', 'Custom cover size · inches', .1, Math.hypot(600,600)/25.4, .01)}
  {numeric('coverBezel','Minimum cover bezel · mm',.5,Math.min(20,((concept.formFactor==='book_foldable'?concept.width/2:concept.width)-5)/2,((concept.formFactor==='flip_foldable'?concept.height/2:concept.height)-5)/2),.1)}
  {numeric('coverAspectWidth','Cover aspect width',.01,1000,.01)}{numeric('coverAspectHeight','Cover aspect height',.01,1000,.01)}
  <p className="lab-field-wide lab-note">Cover display fit: up to {geometry.cover?.maxDiagonal.toFixed(2)} inches at this aspect ratio.</p>{geometry.cover?.valid&&<p className="lab-field-wide lab-note">Cover side bezels {geometry.cover.sideBezel.toFixed(1)} mm · Top and bottom {geometry.cover.topBezel.toFixed(1)} mm</p>}
  <ConceptNumber label="Cover display width · mm" value={Number(geometry.cover?.width.toFixed(2))} min={1} max={concept.formFactor==='book_foldable'?concept.width/2-1:concept.width-1} step={.01} onValue={value=>displayDimension(true,'width',value)}/>
  <ConceptNumber label="Cover display height · mm" value={Number(geometry.cover?.height.toFixed(2))} min={1} max={concept.formFactor==='flip_foldable'?concept.height/2-1:concept.height-1} step={.01} onValue={value=>displayDimension(true,'height',value)}/>
  {numeric('coverWidth', 'Cover horizontal · px', 200, 4000)}{numeric('coverHeight', 'Cover vertical · px', 200, 4000)}{numeric('coverPowerW', 'Cover system draw · W', .1, 30, .1)}</>}
  <h3 className="lab-field-wide">Surfaces</h3>{([{key:'frameFinish',label:'Side frame material',options:FRAME_FINISHES},{key:'backFinish',label:'Rear material',options:BACK_FINISHES},{key:'frontFinish',label:'Front surface',options:FRONT_FINISHES}] as const).map(({key,label,options})=><label key={key}>{label}<select aria-label={label} value={finishes[active][key]} onChange={e=>setFinishes(c=>({...c,[active]:{...c[active],[key]:e.target.value}}))}>{Object.entries(options).map(([value,p])=><option key={value} value={value}>{p.label}</option>)}</select></label>)}
  <h3 className="lab-field-wide">Battery & power</h3>{numeric('energyWh', 'Battery energy · Wh', 1, 300, .5)}{numeric('usablePercent', 'Usable charge · %', 1, 100)}{numeric('powerW', 'System draw · W', .1, 300, .1)}{numeric('chargeW', 'Charging power · W', 1, 400)}{numeric('chargeEfficiency', 'Charging efficiency · %', 1, 100)}
  </div></div><div className="lab-panel lab-results"><p className="lab-kicker">Simulated concept / Preview</p><h2>{concept.name || 'Untitled concept'}</h2><DeviceViewport design={design} preferredView={cover&&angle>=90?'back':'front'}/>{!geometry.valid&&<div role="alert"><p>Display size does not fit the chassis. Reduce the display size or explicitly increase the chassis dimensions.</p><button type="button" disabled={fitConceptChassis(concept).width>600||fitConceptChassis(concept).height>600} onClick={()=>{setBuilds(c=>({...c,[active]:fitConceptChassis(c[active])}));setPresets(p=>({...p,[active]:'custom'}));}}>Fit chassis to displays</button></div>}{(foldable || active === 'laptops') && <label className="lab-hinge-control">Hinge position · {angle}°<input type="range" min="0" max="180" value={angle} onChange={e => setAngle(Number(e.currentTarget.value))}/></label>}{foldable && <div className="lab-action-row"><button aria-pressed={!cover} onClick={() => setCover(false)}>Inner display</button><button aria-pressed={cover} onClick={() => setCover(true)}>Cover display</button></div>}
  {metrics && <><div className="lab-metric-row"><div><strong>{metrics.activeDisplay.ppi?.toFixed(0)} PPI</strong><span>Active display density</span></div><div><strong>{((metrics.activeDisplay.areaMm2 ?? 0) / 100).toFixed(1)} cm²</strong><span>Active display area</span></div><div><strong>{metrics.energyWh.toFixed(1)} Wh</strong><span>Battery energy</span></div><div><strong>{metrics.runtimeHours.toFixed(1)} h</strong><span>Simulated runtime · {metrics.powerW} W</span></div><div><strong>{metrics.idealChargeMinutes.toFixed(0)} min</strong><span>Ideal full-charge minimum</span></div><div><strong>{concept.weight} g</strong><span>Device weight</span></div></div><p className="lab-note">Runtime uses the selected system draw. Charging is an ideal minimum; real charging takes longer.</p><figure className="lab-chart"><figcaption>Battery discharge · simulated</figcaption><svg viewBox="0 0 600 230" role="img" aria-label={'Battery declines from 100% to zero over ' + metrics.runtimeHours.toFixed(1) + ' hours'}><path d="M45 20V190H570" fill="none" stroke="#435165"/><path d="M45 30L560 190" fill="none" stroke="#75e4d1" strokeWidth="3"/><text x="0" y="24">100%</text><text x="8" y="195">0%</text><text x="45" y="220">0 h</text><text x="475" y="220">{metrics.runtimeHours.toFixed(1)} h</text></svg></figure><div className="lab-action-row"><button onClick={() => { setBaseline({ name: concept.name, metrics }); setStatus('Comparison build pinned.'); }}>Pin for comparison</button><button onClick={receipt}>Download result receipt ↓</button><PublishBuild design={design}/></div>{baseline && <div className="lab-comparison"><h3>Compared with {baseline.name}</h3><dl className="lab-breakdown"><div><dt>Runtime</dt><dd>{metrics.runtimeHours - baseline.metrics.runtimeHours >= 0 ? '+' : ''}{(metrics.runtimeHours - baseline.metrics.runtimeHours).toFixed(1)} h</dd></div><div><dt>Battery energy</dt><dd>{metrics.energyWh - baseline.metrics.energyWh >= 0 ? '+' : ''}{(metrics.energyWh - baseline.metrics.energyWh).toFixed(1)} Wh</dd></div></dl><button onClick={() => setBaseline(null)}>Clear comparison</button></div>}</>}
  <p role="status">{calculation.error || status}</p></div></div></section>;
}
