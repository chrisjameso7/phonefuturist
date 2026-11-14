import { useEffect, useRef, useState, type ReactNode } from 'react';
/** One result tree in both layouts; collapsing never resets its controls or model. */
export default function ResultPanel({label,summary,children,revealKey}:{label:string;summary:ReactNode;children:ReactNode;
  /** When this changes to a truthy value on a narrow screen, open the panel and bring it into view. */
  revealKey?:unknown}) {
  const [open,setOpen]=useState(true),[mobile,setMobile]=useState(false);
  const panel=useRef<HTMLDetailsElement>(null);
  useEffect(()=>{const query=window.matchMedia('(max-width: 760px)');const sync=()=>{setMobile(query.matches);setOpen(!query.matches);};sync();query.addEventListener('change',sync);return()=>query.removeEventListener('change',sync);},[]);
  useEffect(()=>{
    if(!revealKey||!window.matchMedia('(max-width: 760px)').matches)return;
    setOpen(true);
    const smooth=!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(()=>panel.current?.scrollIntoView({behavior:smooth?'smooth':'auto',block:'start'}));
  },[revealKey]);
  return <details ref={panel} className="instrument-result" open={open} onToggle={event=>setOpen(mobile?event.currentTarget.open:true)}>
    <summary className="instrument-result-summary" tabIndex={mobile?0:-1} aria-disabled={!mobile}><span>{label}</span><strong>{summary}</strong><span className="instrument-chevron" aria-hidden="true">⌄</span></summary>
    <div className="instrument-result-content">{children}</div>
  </details>;
}
