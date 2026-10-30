import { useEffect, useState } from 'react';
export default function LabNumber({label,value,min,max,step=.1,onValue}:{label:string;value:number;min:number;max:number;step?:number;onValue:(n:number)=>void}){
  const format=(n:number)=>Number.isFinite(n)?String(Number(n.toFixed(3))):'';
  const [draft,setDraft]=useState(format(value));
  useEffect(()=>setDraft(format(value)),[value]);
  const n=Number(draft),valid=draft!==''&&Number.isFinite(n)&&n>=min&&n<=max;
  return <label>{label}<input aria-label={label} type="number" value={draft} min={min} max={max} step={step} aria-invalid={!valid} onChange={e=>{const text=e.target.value,next=Number(text);setDraft(text);if(text!==''&&Number.isFinite(next)&&next>=min&&next<=max)onValue(next);}} onBlur={()=>{if(!valid)setDraft(format(value));}}/></label>;
}
