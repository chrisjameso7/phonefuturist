import {useInstrumentReady} from '../../lib/use-instrument-ready';
import ResultPanel from './ResultPanel';
import {lazy,Suspense} from 'react';
const HardwareValuation=lazy(()=>import('./HardwareValuation'));
import { useMemo, useState } from 'react';
import { BOM_GROUPS, BOM_OPTION_COUNT, DEFAULT_BOM, bomPreset, selectedBomId, calculateBom, bomUnitPrice, type BomInput } from '../../lib/labs/bom';
import type { BomDevice } from '../../lib/labs/bom-catalog';
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const money = (n: number) => usd.format(n);
const sections = [...new Set(BOM_GROUPS.map(g => g.section))];
export default function BomCalculator() {
 useInstrumentReady('BomCalculator');
    const [analysisOpen,setAnalysisOpen]=useState(false);
    const [exporting,setExporting]=useState(false);
    const [input, setInput] = useState(DEFAULT_BOM), [status, setStatus] = useState(''), [search, setSearch] = useState('');
    const result = useMemo(() => calculateBom(input), [input]);
    function update<K extends keyof BomInput>(key: K, value: BomInput[K]) { setInput(current => ({ ...current, [key]: value })); }
    function choose(id: string, value: string) {
        setInput(current => {
            const patch = ['sensor', 'display', 'chassis', 'silicon'].includes(id) ? { [id]: value } : { components: { ...current.components, [id]: value } };
            return { ...current, ...patch };
        });
    }
    async function exportCard() {
        if(exporting)return;
        setExporting(true);
        try {
            setStatus('Preparing spec card…');
            const { downloadBomCard } = await import('./bom-export');
            await downloadBomCard(input, result);
            setStatus('Spec card downloaded.');
        }
        catch {
            setStatus('Could not download. Please try again.');
        } finally { setExporting(false); }
    }
    function exportSpec() { const blob = new Blob([JSON.stringify({ title: input.name?.trim() || 'Untitled concept', currency: 'USD', designation: 'Estimated BOM', configuration: input, components: result.items, totals: { bom: result.total, msrp: result.msrp, marginPercent: result.grossMargin } }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'phonefuturist-bom.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setStatus('Build downloaded.'); }
    return <section className="lab-split lab-bom" aria-label="BOM margin calculator"><div className="lab-panel"><p className="lab-kicker">{BOM_OPTION_COUNT} priced specifications / {BOM_GROUPS.length} component slots</p><h2>Components</h2>
    <div className="lab-fields"><label className="lab-field-wide">Device name<input type="text" maxLength={100} placeholder="Name the phone or device you're building" value={input.name ?? ''} onChange={e => update('name', e.currentTarget.value)}/></label><label>Build type<select value={input.device ?? 'phone'} onChange={e => {
            const value = e.currentTarget.value as BomDevice;
            if (window.confirm('Load the ' + e.currentTarget.selectedOptions[0].text + ' build? This replaces the current component selections.')) {
                setInput({ ...bomPreset(value), name: input.name });
                setStatus('Build loaded.');
            }
        }}>{['phone', 'foldable', 'tablet', 'laptop'].map(device => <option key={device} value={device}>{device[0].toUpperCase() + device.slice(1)}</option>)}</select></label><label>Find a specification<input type="search" placeholder="Processor, camera, memory…" value={search} onChange={e => setSearch(e.currentTarget.value)}/></label></div>
    <div className="lab-bom-groups">{sections.map(section => {
            const groups = BOM_GROUPS.filter(g => g.section === section && (g.label + ' ' + g.options.map(o => o.name).join(' ')).toLowerCase().includes(search.toLowerCase()));
            if (!groups.length)
                return null;
            return <details key={section} open={search || section === 'Core' ? true : undefined} className="lab-spec-group"><summary>{section}<span>{groups.length} components · {money(result.items.filter(item=>groups.some(group=>group.id===item.id)).reduce((sum,item)=>sum+item.cost,0))}</span></summary>{groups.map(group => {
                    const id = selectedBomId(input, group.id), option = group.options.find(o => o.id === id);
                    return <div className="lab-spec-row" key={group.id}><label>{group.label}<select value={id ?? ''} onChange={e => choose(group.id, e.currentTarget.value)}><option value="">Not included</option>{group.options.filter(o => !search || group.label.toLowerCase().includes(search.toLowerCase()) || o.name.toLowerCase().includes(search.toLowerCase()) || o.id === id).map(o => <option key={o.id} value={o.id}>{o.name} · {money(bomUnitPrice(input, group.id, o.cost))}</option>)}</select></label><div className="lab-fields"><div className="lab-fixed-price"><span>Unit price</span><strong>{money(option ? bomUnitPrice(input, group.id, option.cost) : 0)}</strong></div><label>Quantity<input aria-label={group.label + ' quantity'} type="number" min="0" max="8" step="1" disabled={!option} value={input.quantities?.[group.id] ?? 1} onChange={e => {
                            const value = Number(e.currentTarget.value);
                            if (Number.isInteger(value) && value >= 0 && value <= 8)
                                update('quantities', { ...input.quantities, [group.id]: value });
                        }}/></label></div></div>;
                })}</details>;
        })}{!BOM_GROUPS.some(g => (g.label + ' ' + g.options.map(o => o.name).join(' ')).toLowerCase().includes(search.toLowerCase())) && <p role="status">No matching specifications.</p>}</div>
    <div className="lab-fields"><label>Resolution<select value={input.resolution} onChange={e => update('resolution', Number(e.currentTarget.value))}>{[1080, 1440, 2160].map(n => <option key={n} value={n}>{n}p</option>)}</select></label><label>Refresh rate<select value={input.refresh} onChange={e => update('refresh', Number(e.currentTarget.value))}>{[60, 90, 120, 144, 165, 240].map(n => <option key={n} value={n}>{n} Hz</option>)}</select></label><label>Retail target · {input.multiplier.toFixed(1)}×<input type="range" min="1" max="5" step="0.1" value={input.multiplier} onChange={e => { const multiplier=Number(e.currentTarget.value);setInput(current=>({...current,multiplier,retail:Math.max(1,Math.min(20000,Math.ceil(calculateBom(current).total*multiplier/10)*10))})); }}/></label><label>Retail price · USD<span className="instrument-unit"><input type="number" min="1" max="20000" value={input.retail} onChange={e => {
            const n = Number(e.currentTarget.value);
            if (n >= 1 && n <= 20000)
                update('retail', n);
        }}/><span aria-hidden="true">USD</span></span></label></div>
    </div><ResultPanel label="Estimated BOM / USD" summary={money(result.total)}><div className="lab-panel lab-results lab-bom-summary"><p className="lab-kicker">Estimated BOM / USD</p><h2>{money(result.total)}</h2><p className="lab-build-name">{input.name?.trim() || 'Untitled concept'}</p><p>{result.items.filter(item => item.cost > 0).length} priced components in your build</p><div className="lab-metric-row"><div><strong>{result.grossMargin.toFixed(1)}%</strong><span>Component margin</span></div><div><strong>{money(result.msrp)}</strong><span>Target MSRP</span></div></div><dl className="lab-breakdown">{result.items.filter(item => item.cost > 0).map(item => <div key={item.id}><dt>{item.label}<small>{item.name}{item.quantity !== 1 ? ' × ' + item.quantity : ''}</small></dt><dd>{money(item.cost)}</dd></div>)}</dl><details className="lab-custom-valuation" onToggle={e=>setAnalysisOpen(e.currentTarget.open)}><summary>Custom hardware analysis</summary><Suspense fallback={<p>Loading analysis…</p>}>{analysisOpen&&<HardwareValuation/>}</Suspense></details><div className="lab-action-row"><button disabled={exporting} aria-busy={exporting} onClick={exportCard}>Download spec card ↓</button></div><details className="lab-advanced-export"><summary>Advanced export</summary><button onClick={exportSpec}>Download configuration (.json)</button></details><p role="status">{status}</p></div></ResultPanel></section>;
}
