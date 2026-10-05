import { useEffect, useRef, useState } from 'react';
import { virtualDeviceConfigurationSchema } from '../../lib/simulation/virtual-device';
import { launchResponseSchema,rangeLabel,responseMatchesConfiguration,type VirtualLaunchView } from '../../lib/simulation/virtual-launch-client';
const initial={name:'My virtual phone',capacity:'5000',display:'6.5',width:'1440',height:'3120',refresh:'120',chipset:'Unknown',cooling:'Unknown',software:'Unknown',brightness:'500',ambient:'25'};
type Field=keyof typeof initial;
const fields:Array<[Field,string,string]>=[['name','Device name','text'],['capacity','Rated battery · mAh','number'],['display','Display · inches','number'],['width','Resolution · width','number'],['height','Resolution · height','number'],['refresh','Refresh rate · Hz','number'],['chipset','Chipset / SoC','text'],['cooling','Cooling','text'],['software','Software','text'],['brightness','Brightness · nits','number'],['ambient','Ambient · °C','number']];
export default function VirtualDeviceWorkspace({onAdvanced}:{onAdvanced:()=>void}){
  const [form,setForm]=useState(initial),[usage,setUsage]=useState('Typical'),[network,setNetwork]=useState('5g');
  const [view,setView]=useState<VirtualLaunchView|null>(null),[raw,setRaw]=useState<unknown>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[selected,setSelected]=useState('battery');
  const revision=useRef(1),configurationId=useRef(''),pending=useRef<AbortController|null>(null);
  useEffect(()=>()=>pending.current?.abort(),[]);
  function invalidate(){revision.current++;pending.current?.abort();setBusy(false);setView(null);setRaw(null);setError('');}
  async function generate(){
    pending.current?.abort();const controller=new AbortController();pending.current=controller;
    const current=revision.current;configurationId.current||=crypto.randomUUID();
    const parsed=virtualDeviceConfigurationSchema.safeParse({id:configurationId.current,revision:current,parentRevision:current===1?null:current-1,subjectId:configurationId.current,name:form.name,
      deviceContext:{origin:'user-supplied',displayInches:Number(form.display),resolution:{width:Number(form.width),height:Number(form.height)},refreshHz:Number(form.refresh),chipset:form.chipset,cooling:form.cooling,software:form.software},
      assertions:[{key:'battery.capacity',unit:'mAh',range:{min:Number(form.capacity),max:Number(form.capacity)},origin:'user-supplied',evidence:[]}]});
    if(!parsed.success){setError('Check the device fields. Use positive numbers and describe unknown components as “Unknown”.');return;}
    setBusy(true);setError('');setView(null);setRaw(null);
    try{
      const response=await fetch('/api/simulation/virtual-device',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},signal:controller.signal,
        body:JSON.stringify({configuration:parsed.data,scenario:{usage,network,brightnessNits:Number(form.brightness),ambientC:Number(form.ambient)}})});
      if(controller.signal.aborted||current!==revision.current)return;
      if(!response.ok){setError(response.status===401?'Sign in to generate your virtual device.':response.status===403?'A verified, active account is required.':response.status===503?'Virtual device generation is not configured. Please contact the administrator.':response.status===429?'Please wait a minute before generating another model.':'Generation is unavailable or could not be validated. Your inputs are kept; please try again later.');return;}
      const payload:unknown=await response.json();
      const result=launchResponseSchema.safeParse(payload);
      if(controller.signal.aborted||current!==revision.current)return;
      if(!result.success||!responseMatchesConfiguration(result.data,parsed.data)){setError('The result could not be matched to this configuration. Please regenerate.');return;}
      setView(result.data);setRaw(payload);setSelected('battery');
    }catch{if(!controller.signal.aborted&&current===revision.current)setError('Connection interrupted. Your inputs are kept; please try again.');}
    finally{if(current===revision.current&&!controller.signal.aborted)setBusy(false);}
  }
  function download(){const url=URL.createObjectURL(new Blob([JSON.stringify(raw,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='phonefuturist-virtual-device-receipt.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  const result=view?.results.find(r=>r.category===selected);
  return <div className="il-app il-simple-mode pf-virtual">
    <div className="il-mode-switcher"><div><span className="il-kicker">Interactive Leaks · Early access</span><h2>One virtual phone. Five ways to test it.</h2><p>Configure once. Explore predicted behavior from a shared model, with its uncertainty intact.</p></div><button type="button" className="il-chip" onClick={onAdvanced}>Switch to Advanced</button></div>
    <div className="pf-virtual-grid">
      <section className="il-builder" aria-label="Virtual phone configuration"><h3>Your device</h3><p className="il-input-note">Starting values are illustrative. Your entries are hypotheses—not confirmed specifications.</p>
        <div className="pf-virtual-fields">{fields.map(([key,label,type])=><label key={key}>{label}<input type={type} step="any" value={form[key]} onChange={event=>{invalidate();setForm({...form,[key]:event.target.value});}}/></label>)}
          <label>Usage<select value={usage} onChange={event=>{invalidate();setUsage(event.target.value);}}>{['Light','Typical','Heavy'].map(value=><option key={value}>{value}</option>)}</select></label>
          <label>Network<select value={network} onChange={event=>{invalidate();setNetwork(event.target.value);}}><option value="5g">5G · normal signal</option><option value="wifi">Wi-Fi</option></select></label>
        </div>
        <p className="il-input-note">Typical includes 4.5 hours of active use and 19.5 hours of standby per day. The launch cohort covers large, flagship-class slab-phone hypotheses.</p>
        <button type="button" className="il-run-button" disabled={busy} onClick={generate}>{busy?'Generating and validating…':'Generate virtual device'}</button>
        <p role="status" aria-live="polite">{busy?'Assembling evidence and running five tests on one model revision.':''}</p>
        {error&&<p role="alert">{error} {error.startsWith('Sign in')&&<a href="/sign-in">Sign in →</a>}</p>}
      </section>
      <section className="il-results pf-virtual-results" aria-label="Virtual device results" aria-busy={busy}>
        {!view?<div className="pf-virtual-empty"><span className="il-kicker">Your virtual device</span><h3>{busy?'Building a coherent model…':'Explore what your phone could do.'}</h3><p>Battery, CPU, gaming, sustained thermals and charging share one evidence-backed model. Missing evidence stays visible.</p><div className="pf-virtual-tests">{['Battery','Performance','Gaming / GPU','Thermals','Charging'].map(label=><span key={label}>{label}</span>)}</div></div>:<>
          <header><span className="il-kicker">Model revision {view.receipt.model.revision} · configuration {view.receipt.configuration.revision}</span><h3>{view.receipt.configuration.name}</h3><p>Predicted behavior · Low model confidence · Not measured hardware results</p></header>
          <nav className="pf-virtual-tests" aria-label="Virtual tests">{view.results.map(test=><button type="button" key={test.category} aria-pressed={selected===test.category} onClick={()=>setSelected(test.category)}>{({battery:'Battery',cpu:'Performance',gpu:'Gaming / GPU',thermal:'Thermals',charging:'Charging'})[test.category]}{test.status==='unresolved'?' · Incomplete':''}</button>)}</nav>
          {result&&<article><h4>{result.title}</h4>{result.status==='unresolved'?<p role="status">{result.issues.join(' ')}</p>:<><div className="pf-virtual-metrics">{result.metrics.map(m=><div key={m.label}><span>{m.label}</span><strong>{rangeLabel(m.range,m.unit)}</strong><small>Expected prediction envelope</small></div>)}</div>{result.temperatureLocation&&<p>Temperature location: <strong>{result.temperatureLocation}</strong>. Do not interpret this as another part of the phone.</p>}
            {!!result.trace?.length&&<details><summary>Temperature timeline</summary><div className="pf-virtual-table"><table><thead><tr><th>Elapsed</th><th>Temperature range</th></tr></thead><tbody>{result.trace.filter((_,i)=>i%5===0).map(point=><tr key={point.seconds}><td>{Math.round(point.seconds/60)} min</td><td>{rangeLabel(point.temperatureC,'°C')}</td></tr>)}</tbody></table></div></details>}</>}
            <p>Readiness: {result.status === 'resolved' ? 'Runnable with predicted parameters; analogical evidence, low confidence.' : 'Insufficient evidence for this test.'}</p><details><summary>Model parameters and lineage</summary><ul>{result.parameters.map(parameter=><li key={parameter.id}><strong>{parameter.key}</strong> · {parameter.status}{parameter.status !== 'unknown' ? ` · ${rangeLabel(parameter.range,parameter.unit)}` : ` · ${parameter.reason}`}</li>)}</ul></details><details><summary>Assumptions and provenance</summary><ul>{result.assumptions.map((text,i)=><li key={i}>{text}</li>)}</ul><p>Confidence describes model support, not a percentage accuracy figure. The full parameter lineage is in the downloadable receipt.</p></details>
          </article>}
          <details><summary>Comparable-device evidence</summary><ul>{view.receipt.evidence.snapshot.records.map(record=><li key={record.id}><a href={record.source.url} target="_blank" rel="noreferrer">{record.source.title}</a> · {record.status}</li>)}</ul></details>
          <button type="button" className="il-chip" onClick={download}>Download reproducible receipt</button>
        </>}
      </section>
    </div>
  </div>;
}
