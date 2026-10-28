import { useEffect, useMemo, useRef, useState } from 'react';
import { CONCEPT_PRESETS, calculateDeviceConcept, type ConceptFamily, type DeviceConcept } from '../../lib/labs/device-concepts';
type Metric = ReturnType<typeof calculateDeviceConcept>;
function ConceptNumber({ label, value, min, max, step, onValue }: {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onValue: (value: number) => void;
}) {
    const [draft, setDraft] = useState(String(value));
    useEffect(() => setDraft(String(value)), [value]);
    const parsed = Number(draft), valid = draft !== '' && Number.isFinite(parsed) && parsed >= min && parsed <= max;
    return <label>{label}<input type="number" value={draft} min={min} max={max} step={step} aria-invalid={!valid} onChange={e => {
            const text = e.currentTarget.value;
            setDraft(text);
            const next = Number(text);
            if (text !== '' && Number.isFinite(next) && next >= min && next <= max)
                onValue(next);
        }} onBlur={() => { if (!valid)
        setDraft(String(value)); }}/></label>;
}
function DeviceCanvas({ concept, cover, angle }: {
    concept: DeviceConcept;
    cover: boolean;
    angle: number;
}) {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = ref.current, ctx = canvas?.getContext('2d');
        if (!ctx || !canvas)
            return;
        const scale = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = 800 * scale;
        canvas.height = 520 * scale;
        ctx.scale(scale, scale);
        ctx.fillStyle = '#07101b';
        ctx.fillRect(0, 0, 800, 520);
        const laptop = concept.formFactor === 'laptop', fold = concept.formFactor.includes('foldable'), ratio = cover ? concept.coverWidth / concept.coverHeight : concept.pixelWidth / concept.pixelHeight;
        let h = laptop ? 290 : 390, w = h * ratio;
        if (w > 650) {
            h *= 650 / w;
            w = 650;
        }
        if (fold && !cover) {
            const open = Math.max(.08, Math.sin(angle * Math.PI / 360));
            if (concept.formFactor === 'book_foldable')
                w *= open;
            else
                h *= open;
        }
        if (laptop)
            h *= Math.max(.08, Math.sin(angle * Math.PI / 180));
        const x = (800 - w) / 2, y = (520 - h) / 2 - (laptop ? 35 : 0);
        ctx.strokeStyle = '#75e4d1';
        ctx.lineWidth = 4;
        ctx.fillStyle = '#12283a';
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 18);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#75e4d115';
        ctx.fillRect(x + 12, y + 12, w - 24, h - 24);
        if (fold && !cover) {
            ctx.strokeStyle = '#75e4d1';
            ctx.setLineDash([5, 6]);
            ctx.beginPath();
            if (concept.formFactor === 'book_foldable') {
                ctx.moveTo(400, y + 10);
                ctx.lineTo(400, y + h - 10);
            }
            else {
                ctx.moveTo(x + 10, y + h / 2);
                ctx.lineTo(x + w - 10, y + h / 2);
            }
            ctx.stroke();
            ctx.setLineDash([]);
        }
        if (laptop) {
            ctx.fillStyle = '#1d3549';
            ctx.beginPath();
            ctx.moveTo(x, y + h + 8);
            ctx.lineTo(x + w, y + h + 8);
            ctx.lineTo(x + w + 45, y + h + 65);
            ctx.lineTo(x - 45, y + h + 65);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
        ctx.font = '22px system-ui';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#edf3fb';
        ctx.fillText(cover ? 'Cover display' : laptop ? 'Laptop concept' : fold ? 'Unfolded display' : 'Tablet concept', 400, 476);
        ctx.fillStyle = '#aebbc9';
        ctx.font = '17px system-ui';
        ctx.fillText(fold || laptop ? 'Hinge ' + angle + '°' : concept.width + ' × ' + concept.height + ' mm', 400, 506);
    }, [concept, cover, angle]);
    return <canvas ref={ref} role="img" aria-label={(cover ? 'Cover' : 'Primary') + ' display preview for ' + concept.name} style={{ width: '100%', height: 'auto', aspectRatio: '800 / 520' }}/>;
}
export default function DeviceConceptLab({ family }: {
    family: ConceptFamily;
}) {
    const [builds, setBuilds] = useState<Record<ConceptFamily, DeviceConcept>>(() => ({ foldables: { ...CONCEPT_PRESETS.foldables[0] }, tablets: { ...CONCEPT_PRESETS.tablets[0] }, laptops: { ...CONCEPT_PRESETS.laptops[0] } }));
    const [active, setActive] = useState(family), [cover, setCover] = useState(false), [angle, setAngle] = useState(family === 'laptops' ? 110 : 180), [baseline, setBaseline] = useState<{
        name: string;
        metrics: Metric;
    } | null>(null), [status, setStatus] = useState('');
    const concept = builds[active], foldable = active === 'foldables';
    const calculation = useMemo(() => {
        try {
            return { metrics: calculateDeviceConcept(concept, cover), error: '' };
        }
        catch (error) {
            return { metrics: null, error: error instanceof Error ? error.message : 'Invalid specifications.' };
        }
    }, [concept, cover]);
    const metrics = calculation.metrics;
    function update<K extends keyof DeviceConcept>(key: K, value: DeviceConcept[K]) { setBuilds(current => ({ ...current, [active]: { ...current[active], [key]: value } })); }
    function numeric(key: keyof DeviceConcept, label: string, min: number, max: number, step = 1) {
        return <ConceptNumber key={key} label={label} value={concept[key] as number} min={min} max={max} step={step} onValue={value => update(key, value as never)}/>;
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
    return <section aria-label="Multi-device concept workspace"><div className="lab-family-tabs" role="group" aria-label="Device family">{(['foldables', 'tablets', 'laptops'] as const).map(key => <button key={key} aria-pressed={active === key} onClick={() => { setActive(key); setCover(false); setAngle(key === 'laptops' ? 110 : 180); }}>{key[0].toUpperCase() + key.slice(1)}</button>)}</div><div className="lab-split"><div className="lab-glass"><p className="lab-kicker">Interactive Leaks / {active}</p><h2>Shape your next device.</h2><div className="lab-fields"><label className="lab-field-wide">Device name<input type="text" maxLength={100} value={concept.name} onChange={e => update('name', e.currentTarget.value)}/></label><label className="lab-field-wide">Starting concept<select value="" onChange={e => {
            const index = Number(e.currentTarget.value);
            if (e.currentTarget.value !== '' && window.confirm('Replace this family’s current specifications?')) {
                setBuilds(current => ({ ...current, [active]: { ...CONCEPT_PRESETS[active][index] } }));
                setCover(false);
            }
        }}><option value="">Choose a starting concept…</option>{CONCEPT_PRESETS[active].map((p, i) => <option key={p.name} value={i}>{p.name}</option>)}</select></label>
  {numeric('width', foldable ? 'Unfolded width · mm' : 'Width · mm', 30, 600, .1)}{numeric('height', foldable ? 'Unfolded height · mm' : 'Height · mm', 30, 600, .1)}{numeric('thickness', foldable ? 'Unfolded thickness · mm' : 'Thickness · mm', 1, 50, .1)}{numeric('weight', 'Weight · g', 50, 5000)}{numeric('diagonal', 'Primary display · inches', 2, 30, .1)}{numeric('pixelWidth', 'Horizontal resolution · px', 320, 10000)}{numeric('pixelHeight', 'Vertical resolution · px', 320, 10000)}{numeric('refresh', 'Refresh rate · Hz', 30, 500)}
  {foldable && <><h3 className="lab-field-wide">Cover display</h3>{numeric('coverDiagonal', 'Cover size · inches', 1, 10, .1)}{numeric('coverWidth', 'Cover horizontal · px', 200, 4000)}{numeric('coverHeight', 'Cover vertical · px', 200, 4000)}{numeric('coverPowerW', 'Cover system draw · W', .1, 30, .1)}</>}
  <h3 className="lab-field-wide">Battery & power</h3>{numeric('energyWh', 'Battery energy · Wh', 1, 300, .5)}{numeric('usablePercent', 'Usable charge · %', 1, 100)}{numeric('powerW', 'System draw · W', .1, 300, .1)}{numeric('chargeW', 'Charging power · W', 1, 400)}{numeric('chargeEfficiency', 'Charging efficiency · %', 1, 100)}
  </div></div><div className="lab-glass lab-results"><p className="lab-kicker">Simulated concept / Preview</p><h2>{concept.name || 'Untitled concept'}</h2><DeviceCanvas concept={concept} cover={cover} angle={angle}/>{(foldable || active === 'laptops') && <label className="lab-hinge-control">Hinge position · {angle}°<input type="range" min="0" max="180" value={angle} onChange={e => setAngle(Number(e.currentTarget.value))}/></label>}{foldable && <div className="lab-action-row"><button aria-pressed={!cover} onClick={() => setCover(false)}>Inner display</button><button aria-pressed={cover} onClick={() => setCover(true)}>Cover display</button></div>}
  {metrics && <><div className="lab-metric-row"><div><strong>{metrics.activeDisplay.ppi?.toFixed(0)} PPI</strong><span>Active display density</span></div><div><strong>{((metrics.activeDisplay.areaMm2 ?? 0) / 100).toFixed(1)} cm²</strong><span>Active display area</span></div><div><strong>{metrics.energyWh.toFixed(1)} Wh</strong><span>Battery energy</span></div><div><strong>{metrics.runtimeHours.toFixed(1)} h</strong><span>Simulated runtime · {metrics.powerW} W</span></div><div><strong>{metrics.idealChargeMinutes.toFixed(0)} min</strong><span>Ideal full-charge minimum</span></div><div><strong>{concept.weight} g</strong><span>Device weight</span></div></div><p className="lab-note">Runtime uses the selected system draw. Charging is an ideal minimum; real charging takes longer.</p><figure className="lab-chart"><figcaption>Battery discharge · simulated</figcaption><svg viewBox="0 0 600 230" role="img" aria-label={'Battery declines from 100% to zero over ' + metrics.runtimeHours.toFixed(1) + ' hours'}><path d="M45 20V190H570" fill="none" stroke="#435165"/><path d="M45 30L560 190" fill="none" stroke="#75e4d1" strokeWidth="3"/><text x="0" y="24">100%</text><text x="8" y="195">0%</text><text x="45" y="220">0 h</text><text x="475" y="220">{metrics.runtimeHours.toFixed(1)} h</text></svg></figure><div className="lab-action-row"><button onClick={() => { setBaseline({ name: concept.name, metrics }); setStatus('Comparison build pinned.'); }}>Pin for comparison</button><button onClick={receipt}>Download result receipt ↓</button></div>{baseline && <div className="lab-comparison"><h3>Compared with {baseline.name}</h3><dl className="lab-breakdown"><div><dt>Runtime</dt><dd>{metrics.runtimeHours - baseline.metrics.runtimeHours >= 0 ? '+' : ''}{(metrics.runtimeHours - baseline.metrics.runtimeHours).toFixed(1)} h</dd></div><div><dt>Battery energy</dt><dd>{metrics.energyWh - baseline.metrics.energyWh >= 0 ? '+' : ''}{(metrics.energyWh - baseline.metrics.energyWh).toFixed(1)} Wh</dd></div></dl><button onClick={() => setBaseline(null)}>Clear comparison</button></div>}</>}
  <p role="status">{calculation.error || status}</p></div></div></section>;
}
