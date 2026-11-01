import { useEffect, useRef, useState } from 'react';
import { DEFAULT_PARAMETERS, type DeviceParameters, type ValuationResponse } from '../../lib/valuation/types';
const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
function SpecificationNumber({label,value,min,max,step,onValue}:{label:string;value:number;min:number;max:number;step:number;onValue:(value:number)=>void}) {
    const [draft,setDraft]=useState(String(value)),[focused,setFocused]=useState(false),[error,setError]=useState('');
    useEffect(()=>{if(!focused)setDraft(String(value));},[value,focused]);
    function parsed(raw:string){const n=raw.trim()?Number(raw):NaN;return Number.isFinite(n)&&n>=min&&n<=max&&(step!==1||Number.isInteger(n))?n:undefined;}
    return <label>{label}<input type="number" min={min} max={max} step={step} value={draft} aria-invalid={!!error} onFocus={()=>{setFocused(true);setError('');}} onChange={e=>{const raw=e.currentTarget.value;setDraft(raw);setError('');const n=parsed(raw);if(n!==undefined)onValue(n);}} onBlur={()=>{setFocused(false);setError(parsed(draft)===undefined?'Use '+min+'–'+max+'. The last valid value was kept.':'');}}/>{error&&<small role="alert">{error}</small>}</label>;
}
export default function HardwareValuation() {
    const [p, setP] = useState<DeviceParameters>(() => structuredClone(DEFAULT_PARAMETERS)), [result, setResult] = useState<ValuationResponse | null>(null), [status, setStatus] = useState(''), [busy, setBusy] = useState(false);
    const sequence = useRef(0), controller = useRef<AbortController | null>(null);
    async function analyze(ai = false) { const version = ++sequence.current; controller.current?.abort(); const ctrl = new AbortController(); controller.current = ctrl; setBusy(true); setStatus(''); try {
        const response = await fetch('/api/hardware-analysis', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'bom', parameters: p, analyze: ai }), signal: ctrl.signal });
        const body = await response.json();
        if (!response.ok)
            throw new Error(body.error ?? 'Analysis is unavailable.');
        if (version === sequence.current) {
            setResult(body);
            setStatus(body.notice ?? 'Analysis updated.');
        }
    }
    catch (e) {
        if (!ctrl.signal.aborted && version === sequence.current)
            setStatus(e instanceof Error ? e.message : 'Please retry.');
    }
    finally {
        if (version === sequence.current)
            setBusy(false);
    } }
    useEffect(() => { setResult(null); setStatus(''); const timer = setTimeout(() => void analyze(), 450); return () => { clearTimeout(timer); controller.current?.abort(); sequence.current++; }; }, [p]);
    function update<K extends keyof DeviceParameters>(key: K, value: DeviceParameters[K]) { setP(current => ({ ...current, [key]: value })); }
    function numeric(label: string, value: number, min: number, max: number, change: (n: number) => void, step = 1) {
        return <SpecificationNumber label={label} value={value} min={min} max={max} step={step} onValue={change}/>;
    }
    return <section className="lab-hardware-analysis" aria-label="Custom hardware analysis"><h3>Custom hardware analysis</h3><p>Configure a separate component valuation.</p><div className="lab-fields">
 <label>SoC foundry<select value={p.soc.foundry} onChange={e => update('soc', { ...p.soc, foundry: e.currentTarget.value as DeviceParameters['soc']['foundry'] })}>{['tsmc', 'samsung', 'other'].map(v => <option key={v} value={v}>{v === 'tsmc' ? 'TSMC' : v === 'samsung' ? 'Samsung' : 'Other / custom'}</option>)}</select></label>
 {numeric('Process node · nm', p.soc.nodeNm, 2, 14, n => update('soc', { ...p.soc, nodeNm: n }), .1)}{numeric('Die area · mm²', p.soc.dieAreaMm2, 20, 800, n => update('soc', { ...p.soc, dieAreaMm2: n }))}
 <label>Packaging<select value={p.soc.packaging} onChange={e => update('soc', { ...p.soc, packaging: e.currentTarget.value as 'standard' | 'advanced' })}><option value="standard">Standard</option><option value="advanced">Advanced</option></select></label>
 <label>RAM type<select value={p.ram.type} onChange={e => update('ram', { ...p.ram, type: e.currentTarget.value as DeviceParameters['ram']['type'] })}>{['LPDDR4X', 'LPDDR5', 'LPDDR5X', 'DDR5'].map(v => <option key={v}>{v}</option>)}</select></label>{numeric('RAM · GB', p.ram.capacityGb, 0, 256, n => update('ram', { ...p.ram, capacityGb: n }))}
 <label>Storage type<select value={p.storage.type} onChange={e => update('storage', { ...p.storage, type: e.currentTarget.value as DeviceParameters['storage']['type'] })}>{['eMMC', 'UFS', 'NVMe'].map(v => <option key={v}>{v}</option>)}</select></label>{numeric('Storage · GB', p.storage.capacityGb, 0, 16384, n => update('storage', { ...p.storage, capacityGb: n }))}
 <label>Panel<select value={p.display.panel} onChange={e => update('display', { ...p.display, panel: e.currentTarget.value as DeviceParameters['display']['panel'] })}>{['LCD', 'OLED', 'LTPO', 'tandem'].map(v => <option key={v}>{v}</option>)}</select></label>
 {numeric('Display diagonal · in', p.display.diagonalInches, 3, 24, n => update('display', { ...p.display, diagonalInches: n }), .1)}{numeric('Display width · px', p.display.widthPx, 320, 10000, n => update('display', { ...p.display, widthPx: n }))}{numeric('Display height · px', p.display.heightPx, 320, 10000, n => update('display', { ...p.display, heightPx: n }))}{numeric('Refresh rate · Hz', p.display.refreshHz, 30, 480, n => update('display', { ...p.display, refreshHz: n }))}
 <label>Chassis<select value={p.chassis} onChange={e => update('chassis', e.currentTarget.value as DeviceParameters['chassis'])}>{['plastic', 'aluminum', 'titanium', 'ceramic', 'steel'].map(v => <option key={v}>{v}</option>)}</select></label>{numeric('Retail multiplier', p.retailMultiplier, 1, 5, n => update('retailMultiplier', n), .1)}
 <label>Availability<select value={String(p.unreleased)} onChange={e => update('unreleased', e.currentTarget.value === 'true')}><option value="true">Unreleased / custom</option><option value="false">Released configuration</option></select></label></div>
 {p.cameras.map((camera, i) => <fieldset key={i}><legend>Camera {i + 1}</legend><div className="lab-fields">{numeric('Sensor area · mm²', camera.sensorAreaMm2, 1, 150, n => update('cameras', p.cameras.map((c, j) => j === i ? { ...c, sensorAreaMm2: n } : c)), .1)}{numeric('Resolution · MP', camera.megapixels, 1, 300, n => update('cameras', p.cameras.map((c, j) => j === i ? { ...c, megapixels: n } : c)))}<label>Optics<select value={String(camera.periscope)} onChange={e => update('cameras', p.cameras.map((c, j) => j === i ? { ...c, periscope: e.currentTarget.value === 'true' } : c))}><option value="false">Standard</option><option value="true">Periscope</option></select></label></div><button type="button" onClick={() => update('cameras', p.cameras.filter((_, j) => j !== i))}>Remove camera {i + 1}</button></fieldset>)}
 <div className="lab-action-row"><button type="button" disabled={p.cameras.length >= 8} onClick={() => update('cameras', [...p.cameras, { sensorAreaMm2: 24, megapixels: 50, periscope: false }])}>Add camera</button><button type="button" disabled={busy} onClick={() => analyze(true)}>{busy ? 'Updating…' : 'Analyze cost drivers'}</button></div><p role="status">{status}</p>
 {result && <div aria-label="Hardware valuation"><p className="lab-kicker">Estimated BOM / USD</p><h3>{money(result.valuation.totalBomUsd)}</h3><p>{result.valuation.summary}</p><dl className="lab-breakdown">{result.valuation.components.map(c => <div key={c.id}><dt>{c.label}</dt><dd>{money(c.costUsd)}</dd></div>)}<div><dt>Manufacturing overhead</dt><dd>{money(result.valuation.manufacturingOverheadUsd)}</dd></div><div><dt>Target retail</dt><dd>{money(result.valuation.suggestedRetailUsd)}</dd></div></dl></div>}
 </section>;
}
