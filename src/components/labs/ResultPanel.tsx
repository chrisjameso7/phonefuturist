import { useEffect, useState, type ReactNode } from 'react';
/** One result tree in both layouts; collapsing never resets its controls or model. */
export default function ResultPanel({label,summary,children}:{label:string;summary:ReactNode;children:ReactNode}) {
  const [open,setOpen]=useState(true),[mobile,setMobile]=useState(false);
  useEffect(()=>{const query=window.matchMedia('(max-width: 760px)');const sync=()=>{setMobile(query.matches);setOpen(!query.matches);};sync();query.addEventListener('change',sync);return()=>query.removeEventListener('change',sync);},[]);
  return <details className="instrument-result" open={open} onToggle={event=>setOpen(mobile?event.currentTarget.open:true)}>
    <summary className="instrument-result-summary" tabIndex={mobile?0:-1} aria-disabled={!mobile}><span>{label}</span><strong>{summary}</strong><span className="instrument-chevron" aria-hidden="true">⌄</span></summary>
    <div className="instrument-result-content">{children}</div>
  </details>;
}
