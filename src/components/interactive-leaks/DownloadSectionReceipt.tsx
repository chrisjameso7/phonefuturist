import { useState } from 'react';

export type ReceiptMetric = { label: string; value: string | number | undefined | null };
type ReceiptKind = 'Benchmark' | 'Battery' | 'Charging' | 'Display' | 'Thermal' | 'Camera';

function safeFilename(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 65) || 'concept';
}

/** Produces a standalone branded, legible PNG without extra canvas dependencies. */
export default function DownloadSectionReceipt({
  kind, deviceName, metrics, thermalPoints,
}: {
  kind: ReceiptKind;
  deviceName: string;
  metrics: ReceiptMetric[];
  thermalPoints?: Array<{ second: number; performancePercent: number; temperatureC: number }>;
}) {
  const [error, setError] = useState('');
  async function download() {
    try {
      setError('');
      const rows = metrics.filter(m => m.value !== undefined && m.value !== null && String(m.value).trim() !== '');
      const points = thermalPoints?.filter(p => Number.isFinite(p.second) && Number.isFinite(p.performancePercent)) ?? [];
      const chart = kind === 'Thermal' && points.length > 1;
      const width = 1080;
      const height = 420 + rows.length * 108 + (chart ? 350 : 0) + 145;
      const canvas = document.createElement('canvas');
      canvas.width = width * 2; canvas.height = height * 2;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');
      ctx.scale(2, 2);
      ctx.fillStyle = '#081524'; ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#22d3ee'; ctx.fillRect(0, 0, 12, height);
      ctx.fillStyle = '#7dd3fc'; ctx.font = 'bold 25px Arial'; ctx.fillText('PHONEFUTURIST  /  INTERACTIVE LEAKS', 64, 79);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 61px Arial'; ctx.fillText(kind.toUpperCase(), 64, 165, 950);
      ctx.fillStyle = '#cbd5e1'; ctx.font = '29px Arial'; ctx.fillText(deviceName || 'Custom device', 64, 222, 950);
      ctx.fillStyle = '#64748b'; ctx.fillRect(64, 255, 952, 2);
      let y = 300;
      for (const metric of rows) {
        ctx.fillStyle = '#14263a'; ctx.beginPath(); ctx.roundRect(64, y, 952, 92, 14); ctx.fill();
        ctx.fillStyle = '#9bb1c7'; ctx.font = '22px Arial'; ctx.fillText(metric.label, 89, y + 34, 500);
        ctx.fillStyle = '#f1f5f9'; ctx.font = 'bold 34px Arial'; ctx.textAlign = 'right';
        ctx.fillText(String(metric.value), 992, y + 61, 440); ctx.textAlign = 'left';
        y += 108;
      }
      if (chart) {
        y += 25;
        ctx.fillStyle = '#cbd5e1'; ctx.font = 'bold 24px Arial'; ctx.fillText('PERFORMANCE STABILITY', 64, y + 6);
        const chartLeft = 95, chartTop = y + 35, chartW = 890, chartH = 225;
        const maxTime = Math.max(1, ...points.map(p => p.second));
        ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;
        for(let i=0;i<=4;i++){const yy=chartTop+i*chartH/4;ctx.beginPath();ctx.moveTo(chartLeft,yy);ctx.lineTo(chartLeft+chartW,yy);ctx.stroke();}
        ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.beginPath();
        points.forEach((point,i)=>{const x=chartLeft+point.second/maxTime*chartW;const yy=chartTop+(100-Math.max(0,Math.min(100,point.performancePercent)))/100*chartH;if(i===0)ctx.moveTo(x,yy);else ctx.lineTo(x,yy);});
        ctx.stroke(); y += 315;
      }
      ctx.fillStyle='#94a3b8'; ctx.font='22px Arial';
      ctx.fillText('PHONEFUTURIST LAB  •  SIMULATION RESULTS',64,height-103,950);
      ctx.font='19px Arial';ctx.fillText(new Date().toLocaleDateString('en-GB', {year:'numeric',month:'short',day:'numeric'}),64,height-68);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve,'image/png'));
      if (!blob) throw new Error('Could not generate image');
      const url=URL.createObjectURL(blob);
      const link=document.createElement('a');link.href=url;link.download=`phonefuturist-${kind.toLowerCase()}-${safeFilename(deviceName)}.png`;
      document.body.appendChild(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),60000);
    } catch (e) { setError(e instanceof Error ? e.message : 'Download failed'); }
  }
  return <div style={{margin:'12px 0 20px'}}>
    <button type="button" onClick={download} className="il-section-receipt-button">↓ Download {kind} results</button>
    {error && <small role="alert" style={{display:'block',marginTop:6}}>{error}</small>}
  </div>;
}
