import { useMemo, useState } from 'react';
import { BOM_OPTIONS, DEFAULT_BOM, calculateBom, type BomInput } from '../../lib/labs/bom';
const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
export default function BomCalculator() {
    const [input, setInput] = useState(DEFAULT_BOM), [status, setStatus] = useState('');
    const result = useMemo(() => calculateBom(input), [input]);
    function update<K extends keyof BomInput>(key: K, value: BomInput[K]) { setInput(current => ({ ...current, [key]: value })); }
    async function exportCard() { try {
        setStatus('Preparing spec card…');
        const { downloadBomCard } = await import('./bom-export');
        await downloadBomCard(input, result);
        setStatus('Spec card downloaded.');
    }
    catch {
        setStatus('Could not download. Please try again.');
    } }
    return <section className="lab-split" aria-label="BOM margin calculator"><div className="lab-glass"><p className="lab-kicker">01 / Configure</p><h2>The cost of your concept.</h2><div className="lab-fields">
 {(['sensor', 'display', 'chassis', 'silicon'] as const).map(key => <label key={key}><span>{{ sensor: 'Main sensor', display: 'Display panel', chassis: 'Chassis material', silicon: 'Processor' }[key]}</span><select value={input[key]} onChange={e => update(key, e.currentTarget.value)}>{BOM_OPTIONS[key].map(option => <option key={option.id} value={option.id}>{option.name} · {money(option.cost)}</option>)}</select></label>)}
 <label>Resolution<select value={input.resolution} onChange={e => update('resolution', Number(e.currentTarget.value))}>{[1080, 1440, 2160].map(n => <option key={n} value={n}>{n}p</option>)}</select></label>
 <label>Refresh rate<select value={input.refresh} onChange={e => update('refresh', Number(e.currentTarget.value))}>{[60, 90, 120, 144].map(n => <option key={n} value={n}>{n} Hz</option>)}</select></label>
 <label>Retail multiplier · {input.multiplier.toFixed(1)}×<input type="range" min="1" max="5" step="0.1" value={input.multiplier} onChange={e => update('multiplier', Number(e.currentTarget.value))}/></label>
 <label>Retail price · {money(input.retail)}<input type="range" min="200" max="3000" step="10" value={input.retail} onChange={e => update('retail', Number(e.currentTarget.value))}/></label></div></div>
 <div className="lab-glass lab-results"><p className="lab-kicker">Live estimate / USD</p><h2>{money(result.total)}</h2><p>Estimated bill of materials</p><dl className="lab-breakdown">{result.items.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{money(item.cost)}</dd></div>)}</dl><div className="lab-metric-row"><div><strong>{result.grossMargin.toFixed(1)}%</strong><span>Component gross margin</span></div><div><strong>{money(result.msrp)}</strong><span>Suggested MSRP</span></div></div><button onClick={exportCard}>Save & export spec card ↓</button><p role="status">{status}</p><details><summary>Pricing assumptions</summary><p>Illustrative costs, not supplier quotes. Display cost scales with resolution and refresh rate. MSRP is BOM × multiplier, rounded up to $10. Margin is (retail − BOM) ÷ retail. Includes $135 for other components and assembly; excludes tax, R&D, distribution, warranty and marketing.</p></details></div></section>;
}
