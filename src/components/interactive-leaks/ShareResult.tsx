import {useEffect,useState} from 'react';
import type {AlphaRun} from '../../lib/simulation/alpha-workspace';
import {canWebShare,filename,renderPng,resultSummary,receiptSections,RECEIPT_DISCLAIMER} from '../../lib/simulation/result-export';

export default function ShareResult({run}:{run:AlphaRun}) {
  const [open,setOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [manualCopy,setManualCopy]=useState(false);
  const [webShare,setWebShare]=useState(false);
  const [preview,setPreview]=useState('');
  const [previewPdf,setPreviewPdf]=useState(false);
  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview);},[preview]);
  function downloadRecord(){const url=URL.createObjectURL(new Blob([JSON.stringify({format:'phonefuturist-simulation-1',simulation:run},null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=filename(run.input.name||'device').replace('.png','.json');link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);setMessage('Frozen simulation record downloaded.');}
  async function download(kind:'card'|'receipt'){
    setBusy(true);setMessage('Preparing download…');
    try{
      const blob=kind==='receipt'?await (await import('../../lib/downloads/result-pdf')).textReceiptPdf({brand:'PHONEFUTURIST / INTERACTIVE LEAKS',title:'Simulation receipt',subtitle:run.input.name||'Untitled concept'},[...receiptSections(run,new Date().toISOString()),{title:'SIMULATED RESULT',lines:[RECEIPT_DISCLAIMER]}]):await renderPng(run,kind);const url=URL.createObjectURL(blob);
      const link=document.createElement('a');link.href=url;link.download=filename(run.input.name||'device',kind==='receipt').replace(/\.png$/,kind==='receipt'?'.pdf':'.png');link.click();
      setPreviewPdf(blob.type==='application/pdf');setPreview(url);setMessage((blob.type==='application/pdf'?'PDF':'PNG')+' ready. Check your browser downloads.');
    }catch(error){setMessage(error instanceof Error?error.message:'Export failed. Please retry.');}finally{setBusy(false);}
  }
  async function copy(){try{await navigator.clipboard.writeText(resultSummary(run));setMessage('Result summary copied.');}catch{setManualCopy(true);setMessage('Select and copy the summary below.');}}
  async function share(){try{await navigator.share({title:'Interactive Leaks · PhoneFuturist',text:resultSummary(run)});setMessage('Shared.');}catch(error){setMessage(error instanceof Error&&error.name==='AbortError'?'Sharing cancelled.':'Sharing is unavailable. Download a PNG or copy the summary instead.');}}
  return <div className="il-share">
    <button type="button" className="il-chip" aria-expanded={open} aria-controls="share-result-options" onClick={()=>{setOpen(!open);setWebShare(canWebShare(navigator));}}>Share result</button>
    {open&&<section id="share-result-options" aria-label="Share this simulation">
      <p>Exports use this calculated result, even if you have since edited the inputs. Downloads are generated on your device. The receipt and simulation record include your supplied configuration; review them before sharing.</p>
      <div className="il-share-actions"><button type="button" disabled={busy} onClick={()=>download('card')}>Download result card</button><button type="button" disabled={busy} onClick={()=>download('receipt')}>Download simulation receipt (PDF)</button><button type="button" onClick={copy}>Copy result summary</button>{webShare&&<button type="button" onClick={share}>Share</button>}</div>
      <p role="status">{message}</p>
      <details className="il-advanced-export"><summary>Advanced export</summary><button type="button" onClick={downloadRecord}>Download simulation record (.json)</button></details>
      {preview&&(previewPdf?<a href={preview} target="_blank" rel="noopener noreferrer">Open PDF receipt ↗</a>:<img src={preview} alt="Generated simulation export preview" className="il-export-preview"/>)}
      {manualCopy&&<label>Result summary<textarea readOnly rows={9} value={resultSummary(run)} onFocus={event=>event.currentTarget.select()}/></label>}
    </section>}
  </div>;
}
